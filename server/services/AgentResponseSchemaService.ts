import { db } from "../db";
import { agentResponseSchemas } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import type { InsertAgentResponseSchema, AgentResponseSchema } from "@shared/schema";
import Ajv from "ajv";

export class AgentResponseSchemaService {
  private ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({ allErrors: true });
  }

  async createSchema(
    agentId: string,
    schemaData: {
      name: string;
      jsonSchema: object;
      validationRules?: object;
      version?: string;
    }
  ): Promise<AgentResponseSchema> {
    try {
      // Validate the JSON schema itself
      this.validateJsonSchema(schemaData.jsonSchema);

      // Deactivate existing schemas with the same name
      await db.update(agentResponseSchemas)
        .set({ isActive: false })
        .where(
          and(
            eq(agentResponseSchemas.agentId, agentId),
            eq(agentResponseSchemas.schemaName, schemaData.name)
          )!
        );

      const insertData: InsertAgentResponseSchema = {
        agentId,
        schemaName: schemaData.name,
        jsonSchema: schemaData.jsonSchema,
        validationRules: schemaData.validationRules || {},
        version: schemaData.version || '1.0.0',
        isActive: true
      };

      const [schema] = await db.insert(agentResponseSchemas)
        .values(insertData)
        .returning();

      return schema;
    } catch (error) {
      console.error("Failed to create response schema:", error);
      throw error;
    }
  }

  async getActiveSchema(agentId: string, schemaName?: string): Promise<AgentResponseSchema | null> {
    try {
      let query = db.select()
        .from(agentResponseSchemas)
        .where(
          and(
            eq(agentResponseSchemas.agentId, agentId),
            eq(agentResponseSchemas.isActive, true)
          )!
        );

      const conditions = [
        eq(agentResponseSchemas.agentId, agentId),
        eq(agentResponseSchemas.isActive, true)
      ];

      if (schemaName) {
        conditions.push(eq(agentResponseSchemas.schemaName, schemaName));
      }

      const [schema] = await db.select()
        .from(agentResponseSchemas)
        .where(and(...conditions))
        .orderBy(desc(agentResponseSchemas.createdAt));
      return schema || null;
    } catch (error) {
      console.error("Failed to get active schema:", error);
      return null;
    }
  }

  async getAllSchemas(agentId: string): Promise<AgentResponseSchema[]> {
    try {
      return await db.select()
        .from(agentResponseSchemas)
        .where(eq(agentResponseSchemas.agentId, agentId))
        .orderBy(desc(agentResponseSchemas.createdAt));
    } catch (error) {
      console.error("Failed to get schemas:", error);
      return [];
    }
  }

  async validateResponse(
    agentId: string,
    response: any,
    schemaName?: string
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    schema?: AgentResponseSchema;
  }> {
    try {
      const schema = await this.getActiveSchema(agentId, schemaName);
      
      if (!schema) {
        return {
          isValid: true,
          errors: [],
          warnings: ['No active response schema found for validation'],
          schema: undefined
        };
      }

      // Validate against JSON schema
      const validate = this.ajv.compile(schema.jsonSchema);
      const isValid = validate(response);

      const errors: string[] = [];
      const warnings: string[] = [];

      if (!isValid && validate.errors) {
        errors.push(...validate.errors.map(err => 
          `${err.instancePath || 'root'}: ${err.message}`
        ));
      }

      // Apply custom validation rules
      if (schema.validationRules) {
        const customValidation = this.applyCustomValidationRules(
          response, 
          schema.validationRules as any
        );
        errors.push(...customValidation.errors);
        warnings.push(...customValidation.warnings);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        schema
      };
    } catch (error) {
      console.error("Failed to validate response:", error);
      return {
        isValid: false,
        errors: [`Validation error: ${error.message}`],
        warnings: [],
        schema: undefined
      };
    }
  }

  async updateSchema(
    schemaId: number,
    updates: Partial<InsertAgentResponseSchema>
  ): Promise<AgentResponseSchema> {
    try {
      if (updates.jsonSchema) {
        this.validateJsonSchema(updates.jsonSchema);
      }

      const [schema] = await db.update(agentResponseSchemas)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(agentResponseSchemas.id, schemaId))
        .returning();

      return schema;
    } catch (error) {
      console.error("Failed to update schema:", error);
      throw error;
    }
  }

  async deactivateSchema(schemaId: number): Promise<void> {
    try {
      await db.update(agentResponseSchemas)
        .set({ isActive: false })
        .where(eq(agentResponseSchemas.id, schemaId));
    } catch (error) {
      console.error("Failed to deactivate schema:", error);
      throw error;
    }
  }

  private validateJsonSchema(schema: any): void {
    try {
      this.ajv.compile(schema);
    } catch (error) {
      throw new Error(`Invalid JSON schema: ${error.message}`);
    }
  }

  private applyCustomValidationRules(
    response: any,
    rules: {
      required?: string[];
      maxLength?: Record<string, number>;
      minLength?: Record<string, number>;
      patterns?: Record<string, string>;
      ranges?: Record<string, { min?: number; max?: number }>;
    }
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (rules.required) {
      for (const field of rules.required) {
        if (!(field in response) || response[field] === null || response[field] === undefined) {
          errors.push(`Required field '${field}' is missing`);
        }
      }
    }

    // Check string lengths
    if (rules.maxLength) {
      for (const [field, maxLen] of Object.entries(rules.maxLength)) {
        if (response[field] && typeof response[field] === 'string' && response[field].length > maxLen) {
          errors.push(`Field '${field}' exceeds maximum length of ${maxLen}`);
        }
      }
    }

    if (rules.minLength) {
      for (const [field, minLen] of Object.entries(rules.minLength)) {
        if (response[field] && typeof response[field] === 'string' && response[field].length < minLen) {
          warnings.push(`Field '${field}' is shorter than recommended minimum length of ${minLen}`);
        }
      }
    }

    // Check patterns
    if (rules.patterns) {
      for (const [field, pattern] of Object.entries(rules.patterns)) {
        if (response[field] && typeof response[field] === 'string') {
          const regex = new RegExp(pattern);
          if (!regex.test(response[field])) {
            errors.push(`Field '${field}' does not match required pattern`);
          }
        }
      }
    }

    // Check numeric ranges
    if (rules.ranges) {
      for (const [field, range] of Object.entries(rules.ranges)) {
        if (response[field] && typeof response[field] === 'number') {
          if (range.min !== undefined && response[field] < range.min) {
            errors.push(`Field '${field}' is below minimum value of ${range.min}`);
          }
          if (range.max !== undefined && response[field] > range.max) {
            errors.push(`Field '${field}' exceeds maximum value of ${range.max}`);
          }
        }
      }
    }

    return { errors, warnings };
  }

  async getSchemaUsageStats(agentId: string): Promise<{
    totalSchemas: number;
    activeSchemas: number;
    validationsSummary: Array<{
      schemaName: string;
      totalValidations: number;
      successRate: number;
    }>;
  }> {
    try {
      const schemas = await this.getAllSchemas(agentId);
      const activeSchemas = schemas.filter(s => s.isActive);

      // In a real implementation, you'd track validation stats
      const validationsSummary = schemas.map(schema => ({
        schemaName: schema.schemaName,
        totalValidations: 0, // Would come from a separate tracking table
        successRate: 0 // Would be calculated from validation logs
      }));

      return {
        totalSchemas: schemas.length,
        activeSchemas: activeSchemas.length,
        validationsSummary
      };
    } catch (error) {
      console.error("Failed to get schema usage stats:", error);
      return {
        totalSchemas: 0,
        activeSchemas: 0,
        validationsSummary: []
      };
    }
  }
}

export const agentResponseSchemaService = new AgentResponseSchemaService();