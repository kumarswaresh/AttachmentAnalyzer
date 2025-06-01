import { db } from "../db";
import { sql } from "drizzle-orm";

export interface DatabaseConnectorConfig {
  allowedOperations: ("SELECT" | "INSERT" | "UPDATE" | "DELETE")[];
  maxResultRows: number;
  queryTimeout: number;
  allowedTables: string[];
  readOnlyMode: boolean;
}

export class DatabaseConnectorModule {
  private config: DatabaseConnectorConfig;

  constructor(config: DatabaseConnectorConfig) {
    this.config = config;
  }

  async invoke(input: {
    query?: string;
    operation?: "SELECT" | "INSERT" | "UPDATE" | "DELETE";
    table?: string;
    conditions?: Record<string, any>;
    data?: Record<string, any>;
    limit?: number;
  }): Promise<{ results: any[]; metadata: any }> {
    try {
      // Validate operation is allowed
      if (input.operation && !this.config.allowedOperations.includes(input.operation)) {
        throw new Error(`Operation ${input.operation} is not allowed`);
      }

      // Validate table access
      if (input.table && !this.config.allowedTables.includes(input.table)) {
        throw new Error(`Access to table ${input.table} is not allowed`);
      }

      // Read-only mode check
      if (this.config.readOnlyMode && input.operation && !["SELECT"].includes(input.operation)) {
        throw new Error("Database is in read-only mode");
      }

      let results: any[] = [];
      let queryExecuted = "";

      if (input.query) {
        // Direct SQL query execution
        results = await this.executeRawQuery(input.query, input.limit);
        queryExecuted = input.query;
      } else if (input.operation && input.table) {
        // Structured query execution
        results = await this.executeStructuredQuery(input);
        queryExecuted = `${input.operation} on ${input.table}`;
      } else {
        throw new Error("Either 'query' or 'operation' and 'table' must be provided");
      }

      return {
        results,
        metadata: {
          rowCount: results.length,
          queryExecuted,
          executionTime: Date.now(),
          fromCache: false
        }
      };
    } catch (error) {
      throw new Error(`Database operation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private async executeRawQuery(query: string, limit?: number): Promise<any[]> {
    // Validate query safety
    this.validateQuery(query);

    try {
      const sanitizedQuery = this.sanitizeQuery(query);
      const limitClause = limit ? ` LIMIT ${Math.min(limit, this.config.maxResultRows)}` : ` LIMIT ${this.config.maxResultRows}`;
      
      const finalQuery = sanitizedQuery.includes("LIMIT") ? sanitizedQuery : sanitizedQuery + limitClause;
      
      const result = await db.execute(sql.raw(finalQuery));
      return result.rows as any[];
    } catch (error) {
      throw new Error(`Query execution failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private async executeStructuredQuery(input: {
    operation: string;
    table: string;
    conditions?: Record<string, any>;
    data?: Record<string, any>;
    limit?: number;
  }): Promise<any[]> {
    const { operation, table, conditions, data, limit } = input;

    switch (operation) {
      case "SELECT":
        return this.executeSelect(table, conditions, limit);
      
      case "INSERT":
        if (!data) throw new Error("Data is required for INSERT operation");
        return this.executeInsert(table, data);
      
      case "UPDATE":
        if (!data || !conditions) throw new Error("Data and conditions are required for UPDATE operation");
        return this.executeUpdate(table, data, conditions);
      
      case "DELETE":
        if (!conditions) throw new Error("Conditions are required for DELETE operation");
        return this.executeDelete(table, conditions);
      
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  private async executeSelect(table: string, conditions?: Record<string, any>, limit?: number): Promise<any[]> {
    let query = `SELECT * FROM ${table}`;
    
    if (conditions && Object.keys(conditions).length > 0) {
      const whereClause = Object.entries(conditions)
        .map(([key, value]) => `${key} = ${this.formatValue(value)}`)
        .join(" AND ");
      query += ` WHERE ${whereClause}`;
    }
    
    query += ` LIMIT ${Math.min(limit || this.config.maxResultRows, this.config.maxResultRows)}`;
    
    const result = await db.execute(sql.raw(query));
    return result.rows as any[];
  }

  private async executeInsert(table: string, data: Record<string, any>): Promise<any[]> {
    const columns = Object.keys(data).join(", ");
    const values = Object.values(data).map(v => this.formatValue(v)).join(", ");
    
    const query = `INSERT INTO ${table} (${columns}) VALUES (${values}) RETURNING *`;
    
    const result = await db.execute(sql.raw(query));
    return result.rows as any[];
  }

  private async executeUpdate(table: string, data: Record<string, any>, conditions: Record<string, any>): Promise<any[]> {
    const setClause = Object.entries(data)
      .map(([key, value]) => `${key} = ${this.formatValue(value)}`)
      .join(", ");
    
    const whereClause = Object.entries(conditions)
      .map(([key, value]) => `${key} = ${this.formatValue(value)}`)
      .join(" AND ");
    
    const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause} RETURNING *`;
    
    const result = await db.execute(sql.raw(query));
    return result.rows as any[];
  }

  private async executeDelete(table: string, conditions: Record<string, any>): Promise<any[]> {
    const whereClause = Object.entries(conditions)
      .map(([key, value]) => `${key} = ${this.formatValue(value)}`)
      .join(" AND ");
    
    const query = `DELETE FROM ${table} WHERE ${whereClause} RETURNING *`;
    
    const result = await db.execute(sql.raw(query));
    return result.rows as any[];
  }

  private validateQuery(query: string): void {
    const lowerQuery = query.toLowerCase().trim();
    
    // Check for dangerous operations
    const dangerousKeywords = ["drop", "truncate", "alter", "create", "grant", "revoke"];
    for (const keyword of dangerousKeywords) {
      if (lowerQuery.includes(keyword)) {
        throw new Error(`Query contains dangerous keyword: ${keyword}`);
      }
    }

    // Check if read-only mode allows this query
    if (this.config.readOnlyMode) {
      const writeKeywords = ["insert", "update", "delete"];
      for (const keyword of writeKeywords) {
        if (lowerQuery.includes(keyword)) {
          throw new Error("Write operations not allowed in read-only mode");
        }
      }
    }
  }

  private sanitizeQuery(query: string): string {
    // Basic SQL injection prevention
    // In production, use parameterized queries
    return query.replace(/[';]/g, "");
  }

  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return "NULL";
    }
    if (typeof value === "string") {
      return `'${value.replace(/'/g, "''")}'`; // Escape single quotes
    }
    if (typeof value === "number") {
      return value.toString();
    }
    if (typeof value === "boolean") {
      return value ? "TRUE" : "FALSE";
    }
    return `'${JSON.stringify(value)}'`;
  }

  getSchema(): any {
    return {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Raw SQL query to execute"
        },
        operation: {
          type: "string",
          enum: ["SELECT", "INSERT", "UPDATE", "DELETE"],
          description: "Database operation to perform"
        },
        table: {
          type: "string",
          description: "Table name for structured operations"
        },
        conditions: {
          type: "object",
          description: "WHERE conditions for the operation"
        },
        data: {
          type: "object",
          description: "Data for INSERT/UPDATE operations"
        },
        limit: {
          type: "number",
          description: "Maximum number of rows to return"
        }
      }
    };
  }
}
