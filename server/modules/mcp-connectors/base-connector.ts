export interface MCPConnectorConfig {
  id: string;
  name: string;
  description: string;
  category: string;
  type: string;
  version?: string;
  status?: 'active' | 'inactive';
  configuration?: Record<string, any>;
}

export interface MCPEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  description: string;
  schema: any;
  handler?: Function;
}

export interface MCPCapability {
  name: string;
  description: string;
  supported: boolean;
}

export abstract class BaseMCPConnector {
  protected config: MCPConnectorConfig;
  protected endpoints: MCPEndpoint[] = [];
  protected capabilities: string[] = [];

  constructor(config: MCPConnectorConfig) {
    this.config = {
      version: '1.0.0',
      status: 'active',
      ...config
    };
  }

  getId(): string {
    return this.config.id;
  }

  getName(): string {
    return this.config.name;
  }

  getDescription(): string {
    return this.config.description;
  }

  getCategory(): string {
    return this.config.category;
  }

  getType(): string {
    return this.config.type;
  }

  getConfig(): MCPConnectorConfig {
    return this.config;
  }

  getStatus(): 'active' | 'inactive' {
    return this.config.status || 'active';
  }

  async initialize(): Promise<void> {
    // Override in subclasses for initialization logic
  }

  async validate(): Promise<boolean> {
    // Override in subclasses for validation logic
    return true;
  }

  async healthCheck(): Promise<{ status: string; message?: string }> {
    try {
      const isValid = await this.validate();
      return {
        status: isValid ? 'healthy' : 'unhealthy',
        message: isValid ? 'Connector is operational' : 'Validation failed'
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        message: error.message
      };
    }
  }

  // Abstract methods to be implemented by subclasses
  abstract processMessage(message: any): Promise<any>;
  abstract getEndpoints(): MCPEndpoint[];
  abstract getCapabilities(): string[];

  // Optional methods for advanced functionality
  async onConnect?(agentId: string): Promise<void>;
  async onDisconnect?(agentId: string): Promise<void>;
  async onConfigUpdate?(config: Record<string, any>): Promise<void>;
}