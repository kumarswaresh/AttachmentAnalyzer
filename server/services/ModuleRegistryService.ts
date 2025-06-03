import { db } from "../db";
import { moduleRegistry, agentModuleInstances } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import type { InsertModuleRegistryEntry, InsertAgentModuleInstance, ModuleRegistryEntry } from "@shared/schema";

export class ModuleRegistryService {
  
  async registerModule(moduleData: {
    name: string;
    version: string;
    description: string;
    category: string;
    capabilities: string[];
    configSchema: Record<string, any>;
    dependencies?: string[];
    author?: string;
    repositoryUrl?: string;
    documentationUrl?: string;
    tags?: string[];
  }): Promise<ModuleRegistryEntry> {
    try {
      const insertData: InsertModuleRegistryEntry = {
        name: moduleData.name,
        version: moduleData.version,
        description: moduleData.description,
        category: moduleData.category,
        capabilities: moduleData.capabilities,
        configSchema: moduleData.configSchema,
        dependencies: moduleData.dependencies || [],
        author: moduleData.author,
        repositoryUrl: moduleData.repositoryUrl,
        documentationUrl: moduleData.documentationUrl,
        tags: moduleData.tags || [],
        isPublic: true,
        isActive: true
      };

      const [module] = await db.insert(moduleRegistry)
        .values(insertData)
        .returning();

      return module;
    } catch (error) {
      console.error("Failed to register module:", error);
      throw error;
    }
  }

  async getAllModules(): Promise<ModuleRegistryEntry[]> {
    try {
      return await db.select()
        .from(moduleRegistry)
        .where(eq(moduleRegistry.isActive, true))
        .orderBy(desc(moduleRegistry.createdAt));
    } catch (error) {
      console.error("Failed to get modules:", error);
      return [];
    }
  }

  async getModulesByCategory(category: string): Promise<ModuleRegistryEntry[]> {
    try {
      return await db.select()
        .from(moduleRegistry)
        .where(
          and(
            eq(moduleRegistry.category, category),
            eq(moduleRegistry.isActive, true)
          )!
        )
        .orderBy(desc(moduleRegistry.createdAt));
    } catch (error) {
      console.error("Failed to get modules by category:", error);
      return [];
    }
  }

  async searchModules(query: string): Promise<ModuleRegistryEntry[]> {
    try {
      return await db.select()
        .from(moduleRegistry)
        .where(
          and(
            eq(moduleRegistry.isActive, true),
            sql`(${moduleRegistry.name} ILIKE ${'%' + query + '%'} OR ${moduleRegistry.description} ILIKE ${'%' + query + '%'})`
          )!
        )
        .orderBy(desc(moduleRegistry.createdAt));
    } catch (error) {
      console.error("Failed to search modules:", error);
      return [];
    }
  }

  async getModuleById(id: number): Promise<ModuleRegistryEntry | null> {
    try {
      const [module] = await db.select()
        .from(moduleRegistry)
        .where(eq(moduleRegistry.id, id));
      
      return module || null;
    } catch (error) {
      console.error("Failed to get module:", error);
      return null;
    }
  }

  async installModuleForAgent(
    agentId: string,
    moduleId: number,
    config: Record<string, any> = {}
  ): Promise<void> {
    try {
      const module = await this.getModuleById(moduleId);
      if (!module) {
        throw new Error("Module not found");
      }

      // Validate config against module schema
      this.validateModuleConfig(config, module.configSchema);

      // Check if module is already installed for this agent
      const existing = await db.select()
        .from(agentModuleInstances)
        .where(
          and(
            eq(agentModuleInstances.agentId, agentId),
            eq(agentModuleInstances.moduleId, moduleId)
          )!
        );

      if (existing.length > 0) {
        // Update existing installation
        await db.update(agentModuleInstances)
          .set({ 
            config,
            isEnabled: true,
            updatedAt: new Date()
          })
          .where(
            and(
              eq(agentModuleInstances.agentId, agentId),
              eq(agentModuleInstances.moduleId, moduleId)
            )!
          );
      } else {
        // Create new installation
        const instanceData: InsertAgentModuleInstance = {
          agentId,
          moduleId,
          config,
          isEnabled: true
        };

        await db.insert(agentModuleInstances).values(instanceData);
      }

      // Update install count
      await db.update(moduleRegistry)
        .set({ 
          installCount: sql`${moduleRegistry.installCount} + 1`
        })
        .where(eq(moduleRegistry.id, moduleId));

    } catch (error) {
      console.error("Failed to install module for agent:", error);
      throw error;
    }
  }

  async uninstallModuleFromAgent(agentId: string, moduleId: number): Promise<void> {
    try {
      await db.update(agentModuleInstances)
        .set({ isEnabled: false })
        .where(
          and(
            eq(agentModuleInstances.agentId, agentId),
            eq(agentModuleInstances.moduleId, moduleId)
          )!
        );
    } catch (error) {
      console.error("Failed to uninstall module from agent:", error);
      throw error;
    }
  }

  async getAgentModules(agentId: string): Promise<Array<{
    module: ModuleRegistryEntry;
    config: Record<string, any>;
    isEnabled: boolean;
    installedAt: Date;
  }>> {
    try {
      const results = await db.select({
        module: moduleRegistry,
        config: agentModuleInstances.config,
        isEnabled: agentModuleInstances.isEnabled,
        installedAt: agentModuleInstances.createdAt
      })
      .from(agentModuleInstances)
      .innerJoin(moduleRegistry, eq(agentModuleInstances.moduleId, moduleRegistry.id))
      .where(eq(agentModuleInstances.agentId, agentId));

      return results;
    } catch (error) {
      console.error("Failed to get agent modules:", error);
      return [];
    }
  }

  async updateModuleConfig(
    agentId: string,
    moduleId: number,
    config: Record<string, any>
  ): Promise<void> {
    try {
      const module = await this.getModuleById(moduleId);
      if (!module) {
        throw new Error("Module not found");
      }

      // Validate config against module schema
      this.validateModuleConfig(config, module.configSchema);

      await db.update(agentModuleInstances)
        .set({ 
          config,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(agentModuleInstances.agentId, agentId),
            eq(agentModuleInstances.moduleId, moduleId)
          )!
        );
    } catch (error) {
      console.error("Failed to update module config:", error);
      throw error;
    }
  }

  private validateModuleConfig(config: Record<string, any>, schema: Record<string, any>): void {
    // Basic validation - in a real implementation, use a proper JSON schema validator
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in config)) {
          throw new Error(`Required field '${field}' is missing from module config`);
        }
      }
    }

    if (schema.properties) {
      for (const [field, fieldSchema] of Object.entries(schema.properties as Record<string, any>)) {
        if (field in config) {
          const value = config[field];
          const expectedType = fieldSchema.type;
          
          if (expectedType && typeof value !== expectedType) {
            throw new Error(`Field '${field}' should be of type '${expectedType}'`);
          }
        }
      }
    }
  }

  async getModuleCategories(): Promise<Array<{
    category: string;
    count: number;
  }>> {
    try {
      const results = await db.select({
        category: moduleRegistry.category,
        count: sql<number>`count(*)`
      })
      .from(moduleRegistry)
      .where(eq(moduleRegistry.isActive, true))
      .groupBy(moduleRegistry.category);

      return results;
    } catch (error) {
      console.error("Failed to get module categories:", error);
      return [];
    }
  }

  async getPopularModules(limit: number = 10): Promise<ModuleRegistryEntry[]> {
    try {
      return await db.select()
        .from(moduleRegistry)
        .where(eq(moduleRegistry.isActive, true))
        .orderBy(desc(moduleRegistry.installCount))
        .limit(limit);
    } catch (error) {
      console.error("Failed to get popular modules:", error);
      return [];
    }
  }

  async updateModule(
    id: number,
    updates: Partial<InsertModuleRegistryEntry>
  ): Promise<ModuleRegistryEntry> {
    try {
      const [module] = await db.update(moduleRegistry)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(moduleRegistry.id, id))
        .returning();

      return module;
    } catch (error) {
      console.error("Failed to update module:", error);
      throw error;
    }
  }
}

export const moduleRegistryService = new ModuleRegistryService();