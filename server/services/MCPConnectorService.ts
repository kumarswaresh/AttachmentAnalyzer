import { randomUUID } from 'crypto';
import { storage } from '../storage';
import type { 
  McpConnector, 
  InsertMcpConnector,
  AuthConfig,
  ConnectorEndpoint 
} from '@shared/schema';

interface ConnectorExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
  statusCode?: number;
}

interface ConnectorTestResult {
  success: boolean;
  response?: any;
  error?: string;
  latency: number;
  validationErrors?: string[];
}

export class MCPConnectorService {
  
  // Create a new MCP connector
  async createConnector(
    connectorData: Omit<InsertMcpConnector, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<McpConnector> {
    // Validate connector configuration
    this.validateConnectorConfig(connectorData);
    
    const connector = await storage.createMcpConnector({
      ...connectorData,
      id: randomUUID()
    });
    
    return connector;
  }

  // Get all connectors with filtering
  async getConnectors(filters: {
    type?: string;
    category?: string;
    isActive?: boolean;
    isPublic?: boolean;
    createdBy?: number;
  } = {}): Promise<McpConnector[]> {
    return await storage.getMcpConnectors(filters);
  }

  // Get connector by ID
  async getConnector(id: string): Promise<McpConnector | null> {
    return await storage.getMcpConnector(id);
  }

  // Update connector
  async updateConnector(
    id: string,
    updates: Partial<InsertMcpConnector>
  ): Promise<McpConnector> {
    if (updates.endpoints || updates.authConfig) {
      this.validateConnectorConfig(updates as any);
    }
    
    return await storage.updateMcpConnector(id, updates);
  }

  // Delete connector
  async deleteConnector(id: string): Promise<void> {
    await storage.deleteMcpConnector(id);
  }

  // Execute a connector endpoint
  async executeConnector(
    connectorId: string,
    endpointName: string,
    parameters: Record<string, any> = {},
    authOverrides: Record<string, any> = {}
  ): Promise<ConnectorExecutionResult> {
    const startTime = Date.now();
    
    try {
      const connector = await this.getConnector(connectorId);
      if (!connector) {
        throw new Error(`Connector ${connectorId} not found`);
      }

      if (!connector.isActive) {
        throw new Error(`Connector ${connectorId} is not active`);
      }

      const endpoint = connector.endpoints.find(ep => ep.name === endpointName);
      if (!endpoint) {
        throw new Error(`Endpoint ${endpointName} not found in connector ${connectorId}`);
      }

      // Build request
      const request = await this.buildRequest(connector, endpoint, parameters, authOverrides);
      
      // Execute request
      const response = await fetch(request.url, request.options);
      const duration = Date.now() - startTime;

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          duration,
          statusCode: response.status
        };
      }

      const data = await response.json();
      
      return {
        success: true,
        data,
        duration,
        statusCode: response.status
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      };
    }
  }

  // Test a connector configuration
  async testConnector(
    connectorConfig: Omit<InsertMcpConnector, 'id' | 'createdAt' | 'updatedAt'>,
    testEndpoint?: string,
    testParameters: Record<string, any> = {}
  ): Promise<ConnectorTestResult> {
    const startTime = Date.now();
    
    try {
      // Validate configuration
      const validationErrors = this.validateConnectorConfig(connectorConfig, false);
      if (validationErrors.length > 0) {
        return {
          success: false,
          error: 'Configuration validation failed',
          validationErrors,
          latency: Date.now() - startTime
        };
      }

      // Test the first endpoint or specified endpoint
      const endpoint = testEndpoint 
        ? connectorConfig.endpoints.find(ep => ep.name === testEndpoint)
        : connectorConfig.endpoints[0];

      if (!endpoint) {
        return {
          success: false,
          error: 'No endpoint found to test',
          latency: Date.now() - startTime
        };
      }

      // Create temporary connector object for testing
      const tempConnector = {
        ...connectorConfig,
        id: 'test-connector',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      } as McpConnector;

      // Build and execute test request
      const request = await this.buildRequest(tempConnector, endpoint, testParameters);
      const response = await fetch(request.url, request.options);
      const latency = Date.now() - startTime;

      const responseData = await response.json();

      return {
        success: response.ok,
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          data: responseData
        },
        latency,
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Test failed',
        latency: Date.now() - startTime
      };
    }
  }

  // Build HTTP request from connector configuration
  private async buildRequest(
    connector: McpConnector,
    endpoint: ConnectorEndpoint,
    parameters: Record<string, any> = {},
    authOverrides: Record<string, any> = {}
  ): Promise<{ url: string; options: RequestInit }> {
    // Build URL with path parameters
    let url = endpoint.path;
    const queryParams = new URLSearchParams();
    const bodyData: Record<string, any> = {};

    // Process parameters
    for (const param of endpoint.parameters) {
      const value = parameters[param.name];
      
      if (param.required && value === undefined) {
        throw new Error(`Required parameter '${param.name}' is missing`);
      }

      if (value !== undefined) {
        if (endpoint.method === 'GET' || endpoint.method === 'DELETE') {
          queryParams.append(param.name, String(value));
        } else {
          bodyData[param.name] = value;
        }
      }
    }

    // Add query parameters to URL
    if (queryParams.toString()) {
      url += (url.includes('?') ? '&' : '?') + queryParams.toString();
    }

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Agent-Platform-MCP/1.0',
      ...connector.authConfig.headers
    };

    // Apply authentication
    const authConfig = { ...connector.authConfig, ...authOverrides };
    this.applyAuthentication(headers, authConfig);

    // Build request options
    const options: RequestInit = {
      method: endpoint.method,
      headers
    };

    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method) && Object.keys(bodyData).length > 0) {
      options.body = JSON.stringify(bodyData);
    }

    return { url, options };
  }

  // Apply authentication to request headers
  private applyAuthentication(headers: Record<string, string>, authConfig: AuthConfig): void {
    switch (authConfig.type) {
      case 'api_key':
        if (authConfig.fields.headerName && authConfig.fields.apiKey) {
          headers[authConfig.fields.headerName] = authConfig.fields.apiKey;
        }
        break;
        
      case 'bearer':
        if (authConfig.fields.token) {
          headers['Authorization'] = `Bearer ${authConfig.fields.token}`;
        }
        break;
        
      case 'basic':
        if (authConfig.fields.username && authConfig.fields.password) {
          const credentials = btoa(`${authConfig.fields.username}:${authConfig.fields.password}`);
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;
        
      case 'oauth2':
        if (authConfig.fields.accessToken) {
          headers['Authorization'] = `Bearer ${authConfig.fields.accessToken}`;
        }
        break;
        
      case 'none':
      default:
        // No authentication
        break;
    }
  }

  // Validate connector configuration
  private validateConnectorConfig(
    config: Partial<InsertMcpConnector>,
    throwOnError: boolean = true
  ): string[] {
    const errors: string[] = [];

    if (!config.name?.trim()) {
      errors.push('Connector name is required');
    }

    if (!config.type) {
      errors.push('Connector type is required');
    }

    if (!config.category) {
      errors.push('Connector category is required');
    }

    if (!config.endpoints || config.endpoints.length === 0) {
      errors.push('At least one endpoint is required');
    } else {
      config.endpoints.forEach((endpoint, index) => {
        if (!endpoint.name?.trim()) {
          errors.push(`Endpoint ${index + 1}: name is required`);
        }
        if (!endpoint.method) {
          errors.push(`Endpoint ${index + 1}: HTTP method is required`);
        }
        if (!endpoint.path?.trim()) {
          errors.push(`Endpoint ${index + 1}: path is required`);
        }
      });
    }

    if (!config.authConfig) {
      errors.push('Authentication configuration is required');
    } else {
      const authConfig = config.authConfig;
      if (!authConfig.type) {
        errors.push('Authentication type is required');
      }
      
      // Validate auth fields based on type
      switch (authConfig.type) {
        case 'api_key':
          if (!authConfig.fields?.headerName) {
            errors.push('API key header name is required');
          }
          break;
        case 'bearer':
        case 'oauth2':
          // Token validation would be done at runtime
          break;
        case 'basic':
          // Username/password validation would be done at runtime
          break;
      }
    }

    if (throwOnError && errors.length > 0) {
      throw new Error(`Connector validation failed: ${errors.join(', ')}`);
    }

    return errors;
  }

  // Get connector analytics
  async getConnectorAnalytics(connectorId: string): Promise<{
    totalExecutions: number;
    successRate: number;
    averageLatency: number;
    errorsByType: Record<string, number>;
    usageByEndpoint: Record<string, number>;
    recentExecutions: Array<{
      timestamp: Date;
      endpoint: string;
      success: boolean;
      duration: number;
    }>;
  }> {
    // This would require tracking execution logs in the database
    // For now, return mock analytics structure
    return {
      totalExecutions: 0,
      successRate: 0,
      averageLatency: 0,
      errorsByType: {},
      usageByEndpoint: {},
      recentExecutions: []
    };
  }

  // Get available connector templates
  getConnectorTemplates(): Array<{
    name: string;
    type: string;
    category: string;
    description: string;
    template: Partial<InsertMcpConnector>;
  }> {
    return [
      {
        name: 'REST API',
        type: 'api',
        category: 'data',
        description: 'Generic REST API connector with authentication',
        template: {
          type: 'api',
          category: 'data',
          authConfig: {
            type: 'api_key',
            fields: { headerName: 'X-API-Key' },
            headers: {}
          },
          endpoints: [
            {
              name: 'get_data',
              method: 'GET',
              path: '/api/data',
              description: 'Fetch data from API',
              parameters: [
                {
                  name: 'limit',
                  type: 'number',
                  required: false,
                  description: 'Number of records to return'
                }
              ]
            }
          ]
        }
      },
      {
        name: 'Database Query',
        type: 'database',
        category: 'data',
        description: 'Database connector with SQL query support',
        template: {
          type: 'database',
          category: 'data',
          authConfig: {
            type: 'basic',
            fields: { username: '', password: '' },
            headers: {}
          },
          endpoints: [
            {
              name: 'execute_query',
              method: 'POST',
              path: '/query',
              description: 'Execute SQL query',
              parameters: [
                {
                  name: 'query',
                  type: 'string',
                  required: true,
                  description: 'SQL query to execute'
                }
              ]
            }
          ]
        }
      },
      {
        name: 'Webhook Receiver',
        type: 'webhook',
        category: 'communication',
        description: 'Receive data via webhooks',
        template: {
          type: 'webhook',
          category: 'communication',
          authConfig: {
            type: 'none',
            fields: {},
            headers: {}
          },
          endpoints: [
            {
              name: 'receive_webhook',
              method: 'POST',
              path: '/webhook',
              description: 'Receive webhook data',
              parameters: [
                {
                  name: 'data',
                  type: 'object',
                  required: true,
                  description: 'Webhook payload'
                }
              ]
            }
          ]
        }
      }
    ];
  }
}

export const mcpConnectorService = new MCPConnectorService();