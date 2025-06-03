import { db } from "../db";
import { mcpConnectors, connectorUsageLogs } from "@shared/schema";
import { eq, desc, and, count } from "drizzle-orm";
import type { InsertMcpConnector, InsertConnectorUsageLog, McpConnector } from "@shared/schema";

export class McpConnectorService {
  
  async createConnector(connectorData: {
    name: string;
    description: string;
    endpoint: string;
    authType: 'none' | 'api_key' | 'oauth' | 'basic';
    authConfig: Record<string, any>;
    capabilities: string[];
    metadata?: Record<string, any>;
  }): Promise<McpConnector> {
    try {
      const insertData: InsertMcpConnector = {
        name: connectorData.name,
        description: connectorData.description,
        endpoint: connectorData.endpoint,
        authType: connectorData.authType,
        authConfig: connectorData.authConfig,
        capabilities: connectorData.capabilities,
        metadata: connectorData.metadata || {},
        isActive: true
      };

      const [connector] = await db.insert(mcpConnectors)
        .values(insertData)
        .returning();

      return connector;
    } catch (error) {
      console.error("Failed to create MCP connector:", error);
      throw error;
    }
  }

  async getAllConnectors(): Promise<McpConnector[]> {
    try {
      return await db.select()
        .from(mcpConnectors)
        .orderBy(desc(mcpConnectors.createdAt));
    } catch (error) {
      console.error("Failed to get connectors:", error);
      return [];
    }
  }

  async getActiveConnectors(): Promise<McpConnector[]> {
    try {
      return await db.select()
        .from(mcpConnectors)
        .where(eq(mcpConnectors.isActive, true))
        .orderBy(desc(mcpConnectors.createdAt));
    } catch (error) {
      console.error("Failed to get active connectors:", error);
      return [];
    }
  }

  async getConnectorById(id: number): Promise<McpConnector | null> {
    try {
      const [connector] = await db.select()
        .from(mcpConnectors)
        .where(eq(mcpConnectors.id, id));
      
      return connector || null;
    } catch (error) {
      console.error("Failed to get connector:", error);
      return null;
    }
  }

  async updateConnector(
    id: number, 
    updates: Partial<InsertMcpConnector>
  ): Promise<McpConnector> {
    try {
      const [connector] = await db.update(mcpConnectors)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(mcpConnectors.id, id))
        .returning();

      return connector;
    } catch (error) {
      console.error("Failed to update connector:", error);
      throw error;
    }
  }

  async deactivateConnector(id: number): Promise<void> {
    try {
      await db.update(mcpConnectors)
        .set({ isActive: false })
        .where(eq(mcpConnectors.id, id));
    } catch (error) {
      console.error("Failed to deactivate connector:", error);
      throw error;
    }
  }

  async testConnection(id: number): Promise<{
    success: boolean;
    responseTime?: number;
    error?: string;
    capabilities?: string[];
  }> {
    try {
      const connector = await this.getConnectorById(id);
      if (!connector) {
        return { success: false, error: "Connector not found" };
      }

      const startTime = Date.now();
      
      // Prepare authentication headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (connector.authType === 'api_key' && connector.authConfig.apiKey) {
        headers['Authorization'] = `Bearer ${connector.authConfig.apiKey}`;
      } else if (connector.authType === 'basic' && connector.authConfig.username) {
        const credentials = btoa(`${connector.authConfig.username}:${connector.authConfig.password || ''}`);
        headers['Authorization'] = `Basic ${credentials}`;
      }

      // Test connection with a simple health check
      const response = await fetch(`${connector.endpoint}/health`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        
        // Log successful usage
        await this.logUsage(id, 'test_connection', true, responseTime);
        
        return {
          success: true,
          responseTime,
          capabilities: data.capabilities || connector.capabilities
        };
      } else {
        await this.logUsage(id, 'test_connection', false, responseTime, `HTTP ${response.status}`);
        return {
          success: false,
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error: any) {
      await this.logUsage(id, 'test_connection', false, 0, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async logUsage(
    connectorId: number,
    operation: string,
    success: boolean,
    responseTime: number,
    errorMessage?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const logData: InsertConnectorUsageLog = {
        connectorId,
        operation,
        success,
        responseTime,
        errorMessage,
        metadata
      };

      await db.insert(connectorUsageLogs).values(logData);
    } catch (error) {
      console.error("Failed to log connector usage:", error);
    }
  }

  async getUsageStats(connectorId: number, days: number = 30): Promise<{
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    errorCount: number;
    recentErrors: string[];
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Get all logs for the connector within the time period
      const logs = await db.select()
        .from(connectorUsageLogs)
        .where(
          and(
            eq(connectorUsageLogs.connectorId, connectorId),
            sql`${connectorUsageLogs.timestamp} >= ${cutoffDate}`
          )!
        );

      const totalRequests = logs.length;
      const successfulRequests = logs.filter(log => log.success).length;
      const failedRequests = logs.filter(log => !log.success);
      
      const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
      
      const averageResponseTime = logs.length > 0 
        ? logs.reduce((sum, log) => sum + (log.responseTime || 0), 0) / logs.length 
        : 0;

      const recentErrors = failedRequests
        .slice(-5) // Last 5 errors
        .map(log => log.errorMessage || 'Unknown error')
        .filter(Boolean);

      return {
        totalRequests,
        successRate: Math.round(successRate * 100) / 100,
        averageResponseTime: Math.round(averageResponseTime),
        errorCount: failedRequests.length,
        recentErrors
      };
    } catch (error) {
      console.error("Failed to get usage stats:", error);
      return {
        totalRequests: 0,
        successRate: 0,
        averageResponseTime: 0,
        errorCount: 0,
        recentErrors: []
      };
    }
  }

  async searchConnectors(query: string): Promise<McpConnector[]> {
    try {
      return await db.select()
        .from(mcpConnectors)
        .where(
          and(
            eq(mcpConnectors.isActive, true),
            sql`(${mcpConnectors.name} ILIKE ${'%' + query + '%'} OR ${mcpConnectors.description} ILIKE ${'%' + query + '%'})`
          )!
        )
        .orderBy(desc(mcpConnectors.createdAt));
    } catch (error) {
      console.error("Failed to search connectors:", error);
      return [];
    }
  }
}

export const mcpConnectorService = new McpConnectorService();