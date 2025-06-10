import { BaseMCPConnector } from './base-connector';
import { SerpAPIConnector } from './serpapi-connector';
import { GoogleTrendsConnector } from './trends-connector';
import { WeatherConnector } from './weather-connector';
import { GeospatialConnector } from './geospatial-connector';
import { APITriggerConnector } from './api-trigger-connector';
// import { credentialService } from '../../services/credential-service';

export class MCPConnectorManager {
  private connectors: Map<string, BaseMCPConnector> = new Map();
  private activeConnections: Map<string, Set<string>> = new Map(); // agentId -> Set<connectorId>

  constructor() {
    this.initializeConnectors();
  }

  private initializeConnectors() {
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

  async executeConnectorAction(connectorId: string, action: string, params: any = {}): Promise<any> {
    const connector = this.connectors.get(connectorId);
    if (!connector) {
      throw new Error(`Connector ${connectorId} not found`);
    }

    try {
      // Execute the action based on connector type and action
      switch (connectorId) {
        case 'serpapi':
          if (action === 'search') {
            return await this.executeSerpAPISearch(params);
          }
          break;
        case 'weather':
          if (action === 'current_weather') {
            return await this.executeWeatherQuery(params);
          }
          break;
        case 'google-trends':
          if (action === 'get_trends') {
            return await this.executeGoogleTrends(params);
          }
          break;
        case 'geospatial':
          if (action === 'geocode') {
            return await this.executeGeocoding(params);
          }
          break;
        case 'api-trigger':
          // API Trigger is internal, always returns success
          return { status: 'ready', endpoints_available: true };
        default:
          throw new Error(`Action ${action} not supported for connector ${connectorId}`);
      }
    } catch (error: any) {
      console.error(`Error executing ${action} on ${connectorId}:`, error.message);
      throw error;
    }
  }

  private async executeSerpAPISearch(params: any): Promise<any> {
    // Simple mock response for testing - in production this would call actual SerpAPI
    if (!params.q) {
      throw new Error('Query parameter "q" is required');
    }
    
    return {
      search_metadata: {
        status: "Success",
        query: params.q,
        engine: params.engine || 'google'
      },
      organic_results: [
        {
          position: 1,
          title: "Test Result for: " + params.q,
          link: "https://example.com",
          snippet: "This is a test search result"
        }
      ]
    };
  }

  private async executeWeatherQuery(params: any): Promise<any> {
    // Simple mock response for testing - in production this would call actual Weather API
    if (!params.location) {
      throw new Error('Location parameter is required');
    }

    return {
      name: params.location,
      main: {
        temp: 22.5,
        humidity: 65,
        pressure: 1013
      },
      weather: [
        {
          main: "Clear",
          description: "clear sky"
        }
      ],
      wind: {
        speed: 3.2
      }
    };
  }

  private async executeGoogleTrends(params: any): Promise<any> {
    // Simple mock response for testing - in production this would call actual Google Trends API
    if (!params.keywords || !Array.isArray(params.keywords)) {
      throw new Error('Keywords array is required');
    }

    return {
      keywords: params.keywords,
      timeframe: params.timeframe || 'today 1-m',
      trends_data: [
        {
          keyword: params.keywords[0],
          interest_over_time: [
            { time: "2024-01-01", value: 85 },
            { time: "2024-01-02", value: 92 }
          ]
        }
      ]
    };
  }

  private async executeGeocoding(params: any): Promise<any> {
    // Simple mock response for testing - in production this would call actual Geocoding API
    if (!params.address) {
      throw new Error('Address parameter is required');
    }

    return {
      results: [
        {
          formatted_address: params.address,
          geometry: {
            location: {
              lat: 40.7128,
              lng: -74.0060
            }
          },
          place_id: "test_place_id_123"
        }
      ],
      status: "OK"
    };
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