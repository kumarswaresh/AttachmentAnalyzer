import { BaseMCPConnector } from './base-connector';
import { SerpAPIConnector } from './serpapi-connector';
import { GoogleTrendsConnector } from './trends-connector';
import { WeatherConnector } from './weather-connector';
import { GeospatialConnector } from './geospatial-connector';
import { APITriggerConnector } from './api-trigger-connector';

export class MCPConnectorManager {
  private connectors: Map<string, BaseMCPConnector> = new Map();
  private activeConnections: Map<string, Set<string>> = new Map(); // agentId -> Set<connectorId>

  constructor() {
    this.initializeConnectors();
  }

  private async initializeConnectors() {
    try {
      // Initialize SerpAPI connector
      const serpapi = new SerpAPIConnector({});
      this.connectors.set(serpapi.getId(), serpapi);

      // Initialize Google Trends connector
      const trends = new GoogleTrendsConnector({});
      this.connectors.set(trends.getId(), trends);

      // Initialize Weather connector
      const weather = new WeatherConnector({});
      this.connectors.set(weather.getId(), weather);

      // Initialize Geospatial connector
      const geospatial = new GeospatialConnector({});
      this.connectors.set(geospatial.getId(), geospatial);

      // Initialize API Trigger connector
      const apiTrigger = new APITriggerConnector({});
      this.connectors.set(apiTrigger.getId(), apiTrigger);

      console.log(`Initialized ${this.connectors.size} MCP connectors`);
    } catch (error) {
      console.error('Error initializing MCP connectors:', error);
    }
  }

  getConnector(id: string): BaseMCPConnector | undefined {
    return this.connectors.get(id);
  }

  getAllConnectors(): BaseMCPConnector[] {
    return Array.from(this.connectors.values());
  }

  getConnectorsByCategory(category: string): BaseMCPConnector[] {
    return Array.from(this.connectors.values())
      .filter(connector => connector.getCategory() === category);
  }

  async connectAgent(agentId: string, connectorId: string): Promise<void> {
    const connector = this.connectors.get(connectorId);
    if (!connector) {
      throw new Error(`Connector ${connectorId} not found`);
    }

    if (!this.activeConnections.has(agentId)) {
      this.activeConnections.set(agentId, new Set());
    }

    this.activeConnections.get(agentId)!.add(connectorId);

    // Call connector's onConnect if available
    if (connector.onConnect) {
      await connector.onConnect(agentId);
    }
  }

  async disconnectAgent(agentId: string, connectorId: string): Promise<void> {
    const connector = this.connectors.get(connectorId);
    if (connector && connector.onDisconnect) {
      await connector.onDisconnect(agentId);
    }

    const connections = this.activeConnections.get(agentId);
    if (connections) {
      connections.delete(connectorId);
      if (connections.size === 0) {
        this.activeConnections.delete(agentId);
      }
    }
  }

  getAgentConnections(agentId: string): string[] {
    const connections = this.activeConnections.get(agentId);
    return connections ? Array.from(connections) : [];
  }

  async processMessage(connectorId: string, message: any): Promise<any> {
    const connector = this.connectors.get(connectorId);
    if (!connector) {
      throw new Error(`Connector ${connectorId} not found`);
    }

    return await connector.processMessage(message);
  }

  async healthCheck(connectorId?: string): Promise<any> {
    if (connectorId) {
      const connector = this.connectors.get(connectorId);
      if (!connector) {
        throw new Error(`Connector ${connectorId} not found`);
      }
      return await connector.healthCheck();
    }

    // Health check all connectors
    const results = await Promise.allSettled(
      Array.from(this.connectors.entries()).map(async ([id, connector]) => {
        const health = await connector.healthCheck();
        return { id, ...health };
      })
    );

    return results.map(result => 
      result.status === 'fulfilled' 
        ? result.value 
        : { id: 'unknown', status: 'error', message: result.reason }
    );
  }

  getConnectorEndpoints(connectorId: string): any[] {
    const connector = this.connectors.get(connectorId);
    if (!connector) {
      throw new Error(`Connector ${connectorId} not found`);
    }
    return connector.getEndpoints();
  }

  getAllEndpoints(): any[] {
    const endpoints: any[] = [];
    for (const [id, connector] of this.connectors) {
      const connectorEndpoints = connector.getEndpoints().map(endpoint => ({
        ...endpoint,
        connectorId: id,
        connectorName: connector.getName(),
        fullPath: `/api/mcp/${id}${endpoint.path}`
      }));
      endpoints.push(...connectorEndpoints);
    }
    return endpoints;
  }

  getConnectorCapabilities(connectorId: string): string[] {
    const connector = this.connectors.get(connectorId);
    if (!connector) {
      throw new Error(`Connector ${connectorId} not found`);
    }
    return connector.getCapabilities();
  }

  async executeConnectorAction(connectorId: string, action: string, params: any): Promise<any> {
    const connector = this.connectors.get(connectorId);
    if (!connector) {
      throw new Error(`Connector ${connectorId} not found`);
    }

    return await connector.processMessage({ action, params });
  }

  getConnectorStats(): any {
    return {
      totalConnectors: this.connectors.size,
      activeConnections: this.activeConnections.size,
      connectorsByCategory: this.getConnectorsByCategory('search').length + 
                            this.getConnectorsByCategory('analytics').length +
                            this.getConnectorsByCategory('environment').length +
                            this.getConnectorsByCategory('location').length +
                            this.getConnectorsByCategory('integration').length,
      availableEndpoints: this.getAllEndpoints().length
    };
  }
}

// Global instance
export const mcpConnectorManager = new MCPConnectorManager();