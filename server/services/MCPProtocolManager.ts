import { EventEmitter } from 'events';
import WebSocket from 'ws';

// MCP Protocol Message Types
export interface MCPMessage {
  id: string;
  type: 'request' | 'response' | 'notification';
  method?: string;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  metadata?: Record<string, any>;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  outputSchema?: any;
}

export interface MCPPrompt {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required?: boolean;
  }>;
}

export interface MCPServerCapabilities {
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  tools?: {
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
  logging?: {
    level?: 'debug' | 'info' | 'warning' | 'error';
  };
}

export interface MCPClientCapabilities {
  roots?: {
    listChanged?: boolean;
  };
  sampling?: Record<string, any>;
}

export class MCPProtocolManager extends EventEmitter {
  private connections: Map<string, WebSocket> = new Map();
  private tools: Map<string, MCPTool> = new Map();
  private resources: Map<string, MCPResource> = new Map();
  private prompts: Map<string, MCPPrompt> = new Map();
  private capabilities: MCPServerCapabilities;

  constructor() {
    super();
    this.capabilities = {
      resources: {
        subscribe: true,
        listChanged: true
      },
      tools: {
        listChanged: true
      },
      prompts: {
        listChanged: true
      },
      logging: {
        level: 'info'
      }
    };

    this.initializeBuiltInTools();
    this.initializeBuiltInResources();
    this.initializeBuiltInPrompts();
  }

  private initializeBuiltInTools(): void {
    // Market Data Analysis Tool
    this.registerTool({
      name: 'analyze_market_data',
      description: 'Analyze market data and trends for business intelligence',
      inputSchema: {
        type: 'object',
        properties: {
          businessType: { type: 'string', description: 'Type of business' },
          targetMarket: { type: 'string', description: 'Target market region' },
          budget: { type: 'number', description: 'Marketing budget in USD' },
          timeframe: { type: 'string', description: 'Analysis timeframe' }
        },
        required: ['businessType', 'targetMarket', 'budget']
      },
      outputSchema: {
        type: 'object',
        properties: {
          marketSize: { type: 'number' },
          competitionLevel: { type: 'string' },
          recommendations: { type: 'array' }
        }
      }
    });

    // Real-time Trends Tool
    this.registerTool({
      name: 'get_trending_topics',
      description: 'Retrieve real-time trending topics and keywords',
      inputSchema: {
        type: 'object',
        properties: {
          region: { type: 'string', description: 'Geographic region' },
          category: { type: 'string', description: 'Topic category' },
          timeframe: { type: 'string', description: 'Time period for trends' }
        },
        required: ['region']
      }
    });

    // External API Integration Tool
    this.registerTool({
      name: 'external_api_call',
      description: 'Make authenticated calls to external APIs',
      inputSchema: {
        type: 'object',
        properties: {
          endpoint: { type: 'string', description: 'API endpoint URL' },
          method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'] },
          headers: { type: 'object', description: 'Request headers' },
          body: { type: 'object', description: 'Request body' },
          authentication: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['bearer', 'api-key', 'oauth'] },
              credentials: { type: 'object' }
            }
          }
        },
        required: ['endpoint', 'method']
      }
    });
  }

  private initializeBuiltInResources(): void {
    // Marketing Templates Resource
    this.registerResource({
      uri: 'mcp://marketing/templates',
      name: 'Marketing Campaign Templates',
      description: 'Pre-built marketing campaign templates',
      mimeType: 'application/json',
      metadata: {
        category: 'templates',
        version: '1.0.0'
      }
    });

    // Market Data Resource
    this.registerResource({
      uri: 'mcp://market/data',
      name: 'Market Analysis Data',
      description: 'Real-time market analysis and competitor data',
      mimeType: 'application/json',
      metadata: {
        updateFrequency: 'hourly',
        dataSource: 'external'
      }
    });

    // Trend Analytics Resource
    this.registerResource({
      uri: 'mcp://trends/analytics',
      name: 'Trend Analytics',
      description: 'Trending topics and keyword analysis',
      mimeType: 'application/json',
      metadata: {
        realTime: true,
        regions: ['US', 'EU', 'APAC']
      }
    });
  }

  private initializeBuiltInPrompts(): void {
    // Marketing Campaign Generation Prompt
    this.registerPrompt({
      name: 'generate_marketing_campaign',
      description: 'Generate comprehensive marketing campaigns with trend analysis',
      arguments: [
        { name: 'businessType', description: 'Type of business or industry', required: true },
        { name: 'targetAudience', description: 'Target audience demographics', required: true },
        { name: 'budget', description: 'Marketing budget allocation', required: true },
        { name: 'goals', description: 'Campaign objectives and KPIs', required: false },
        { name: 'timeframe', description: 'Campaign duration and timeline', required: false }
      ]
    });

    // Competitive Analysis Prompt
    this.registerPrompt({
      name: 'analyze_competition',
      description: 'Analyze competitive landscape and market positioning',
      arguments: [
        { name: 'industry', description: 'Industry or market sector', required: true },
        { name: 'competitors', description: 'List of known competitors', required: false },
        { name: 'region', description: 'Geographic market region', required: false }
      ]
    });

    // ROI Optimization Prompt
    this.registerPrompt({
      name: 'optimize_roi',
      description: 'Optimize marketing ROI and budget allocation',
      arguments: [
        { name: 'currentCampaigns', description: 'Existing campaign performance data', required: true },
        { name: 'budget', description: 'Available budget for optimization', required: true },
        { name: 'objectives', description: 'Business objectives and targets', required: false }
      ]
    });
  }

  public registerTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
    this.notifyToolsListChanged();
  }

  public registerResource(resource: MCPResource): void {
    this.resources.set(resource.uri, resource);
    this.notifyResourcesListChanged();
  }

  public registerPrompt(prompt: MCPPrompt): void {
    this.prompts.set(prompt.name, prompt);
    this.notifyPromptsListChanged();
  }

  public async handleConnection(ws: WebSocket, connectionId: string): Promise<void> {
    this.connections.set(connectionId, ws);

    ws.on('message', async (data) => {
      try {
        const message: MCPMessage = JSON.parse(data.toString());
        await this.handleMessage(connectionId, message);
      } catch (error) {
        const errorResponse: MCPMessage = {
          id: 'unknown',
          type: 'response',
          error: {
            code: -32700,
            message: 'Parse error',
            data: error instanceof Error ? error.message : 'Unknown error'
          }
        };
        ws.send(JSON.stringify(errorResponse));
      }
    });

    ws.on('close', () => {
      this.connections.delete(connectionId);
    });

    // Send initialization
    const initMessage: MCPMessage = {
      id: `init-${Date.now()}`,
      type: 'notification',
      method: 'notifications/initialized',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: this.capabilities,
        serverInfo: {
          name: 'Agent Platform MCP Server',
          version: '1.0.0'
        }
      }
    };

    ws.send(JSON.stringify(initMessage));
  }

  private async handleMessage(connectionId: string, message: MCPMessage): Promise<void> {
    const ws = this.connections.get(connectionId);
    if (!ws) return;

    try {
      let response: MCPMessage | null = null;

      switch (message.method) {
        case 'initialize':
          response = await this.handleInitialize(message);
          break;
        case 'tools/list':
          response = await this.handleToolsList(message);
          break;
        case 'tools/call':
          response = await this.handleToolCall(message);
          break;
        case 'resources/list':
          response = await this.handleResourcesList(message);
          break;
        case 'resources/read':
          response = await this.handleResourceRead(message);
          break;
        case 'prompts/list':
          response = await this.handlePromptsList(message);
          break;
        case 'prompts/get':
          response = await this.handlePromptGet(message);
          break;
        case 'logging/setLevel':
          response = await this.handleLoggingSetLevel(message);
          break;
        default:
          response = {
            id: message.id,
            type: 'response',
            error: {
              code: -32601,
              message: 'Method not found',
              data: `Unknown method: ${message.method}`
            }
          };
      }

      if (response) {
        ws.send(JSON.stringify(response));
      }
    } catch (error) {
      const errorResponse: MCPMessage = {
        id: message.id,
        type: 'response',
        error: {
          code: -32603,
          message: 'Internal error',
          data: error instanceof Error ? error.message : 'Unknown error'
        }
      };
      ws.send(JSON.stringify(errorResponse));
    }
  }

  private async handleInitialize(message: MCPMessage): Promise<MCPMessage> {
    return {
      id: message.id,
      type: 'response',
      result: {
        protocolVersion: '2024-11-05',
        capabilities: this.capabilities,
        serverInfo: {
          name: 'Agent Platform MCP Server',
          version: '1.0.0'
        }
      }
    };
  }

  private async handleToolsList(message: MCPMessage): Promise<MCPMessage> {
    return {
      id: message.id,
      type: 'response',
      result: {
        tools: Array.from(this.tools.values())
      }
    };
  }

  private async handleToolCall(message: MCPMessage): Promise<MCPMessage> {
    const { name, arguments: args } = message.params;
    const tool = this.tools.get(name);

    if (!tool) {
      return {
        id: message.id,
        type: 'response',
        error: {
          code: -32602,
          message: 'Tool not found',
          data: `Tool '${name}' not found`
        }
      };
    }

    try {
      let result;

      switch (name) {
        case 'analyze_market_data':
          result = await this.executeMarketDataAnalysis(args);
          break;
        case 'get_trending_topics':
          result = await this.executeTrendingTopics(args);
          break;
        case 'external_api_call':
          result = await this.executeExternalAPICall(args);
          break;
        default:
          throw new Error(`Tool execution not implemented: ${name}`);
      }

      return {
        id: message.id,
        type: 'response',
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        }
      };
    } catch (error) {
      return {
        id: message.id,
        type: 'response',
        error: {
          code: -32603,
          message: 'Tool execution failed',
          data: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  private async executeMarketDataAnalysis(args: any): Promise<any> {
    // This would integrate with real market data APIs
    const { MarketingCampaignModule } = await import('../modules/MarketingCampaignModule');
    
    const marketingModule = new MarketingCampaignModule({
      externalAPIs: {
        mockServerUrl: process.env.MARKET_DATA_API_URL || 'http://localhost:3001/api/market-analysis',
        authToken: process.env.MARKET_DATA_API_TOKEN || 'Bearer demo-token',
        timeout: 30000
      }
    });

    const result = await marketingModule.invoke({
      businessType: args.businessType,
      productDescription: `${args.businessType} business`,
      targetMarket: args.targetMarket,
      campaignGoals: ['market analysis'],
      budget: args.budget,
      timeframe: args.timeframe || '3 months'
    });

    return result.data;
  }

  private async executeTrendingTopics(args: any): Promise<any> {
    const { GoogleTrendsModule } = await import('../modules/GoogleTrendsModule');
    
    const trendsModule = new GoogleTrendsModule({
      region: args.region,
      category: args.category ? parseInt(args.category) : 0,
      timeframe: args.timeframe || 'today 12-m'
    });

    const result = await trendsModule.invoke({
      keywords: ['trending', 'popular', 'viral'],
      region: args.region,
      timeframe: args.timeframe
    });

    return result.data;
  }

  private async executeExternalAPICall(args: any): Promise<any> {
    const { ApiConnectorModule } = await import('../modules/ApiConnectorModule');
    
    const apiModule = new ApiConnectorModule({
      endpoints: {
        custom: {
          url: args.endpoint,
          method: args.method,
          headers: args.headers || {}
        }
      },
      authentication: args.authentication || { type: 'none' }
    });

    const result = await apiModule.invoke({
      endpoint: 'custom',
      data: args.body,
      options: {
        timeout: 30000
      }
    });

    return result.data;
  }

  private async handleResourcesList(message: MCPMessage): Promise<MCPMessage> {
    return {
      id: message.id,
      type: 'response',
      result: {
        resources: Array.from(this.resources.values())
      }
    };
  }

  private async handleResourceRead(message: MCPMessage): Promise<MCPMessage> {
    const { uri } = message.params;
    const resource = this.resources.get(uri);

    if (!resource) {
      return {
        id: message.id,
        type: 'response',
        error: {
          code: -32602,
          message: 'Resource not found',
          data: `Resource '${uri}' not found`
        }
      };
    }

    // Generate resource content based on URI
    let content;
    switch (uri) {
      case 'mcp://marketing/templates':
        content = await this.getMarketingTemplates();
        break;
      case 'mcp://market/data':
        content = await this.getMarketData();
        break;
      case 'mcp://trends/analytics':
        content = await this.getTrendAnalytics();
        break;
      default:
        content = { message: 'Resource content not available' };
    }

    return {
      id: message.id,
      type: 'response',
      result: {
        contents: [
          {
            uri: resource.uri,
            mimeType: resource.mimeType,
            text: JSON.stringify(content, null, 2)
          }
        ]
      }
    };
  }

  private async handlePromptsList(message: MCPMessage): Promise<MCPMessage> {
    return {
      id: message.id,
      type: 'response',
      result: {
        prompts: Array.from(this.prompts.values())
      }
    };
  }

  private async handlePromptGet(message: MCPMessage): Promise<MCPMessage> {
    const { name, arguments: args } = message.params;
    const prompt = this.prompts.get(name);

    if (!prompt) {
      return {
        id: message.id,
        type: 'response',
        error: {
          code: -32602,
          message: 'Prompt not found',
          data: `Prompt '${name}' not found`
        }
      };
    }

    const promptContent = await this.generatePromptContent(name, args || {});

    return {
      id: message.id,
      type: 'response',
      result: {
        description: prompt.description,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: promptContent
            }
          }
        ]
      }
    };
  }

  private async handleLoggingSetLevel(message: MCPMessage): Promise<MCPMessage> {
    const { level } = message.params;
    
    if (this.capabilities.logging) {
      this.capabilities.logging.level = level;
    }

    return {
      id: message.id,
      type: 'response',
      result: {}
    };
  }

  private async getMarketingTemplates(): Promise<any> {
    return {
      templates: [
        {
          id: 'social-media-campaign',
          name: 'Social Media Campaign',
          description: 'Comprehensive social media marketing campaign',
          platforms: ['Facebook', 'Instagram', 'Twitter', 'LinkedIn'],
          budget_allocation: {
            content_creation: 0.4,
            paid_advertising: 0.4,
            influencer_partnerships: 0.2
          }
        },
        {
          id: 'lead-generation',
          name: 'Lead Generation Campaign',
          description: 'B2B lead generation and nurturing campaign',
          channels: ['Email', 'LinkedIn', 'Content Marketing', 'Webinars'],
          conversion_funnel: ['Awareness', 'Interest', 'Consideration', 'Purchase']
        }
      ]
    };
  }

  private async getMarketData(): Promise<any> {
    return {
      timestamp: new Date().toISOString(),
      market_indicators: {
        growth_rate: 15.3,
        market_size: '$2.5B',
        competition_level: 'medium',
        opportunity_score: 7.8
      },
      trending_sectors: ['AI/ML', 'SaaS', 'E-commerce', 'FinTech']
    };
  }

  private async getTrendAnalytics(): Promise<any> {
    return {
      trending_keywords: [
        { keyword: 'AI automation', volume: 125000, growth: '+45%' },
        { keyword: 'remote work tools', volume: 98000, growth: '+23%' },
        { keyword: 'sustainability', volume: 87000, growth: '+67%' }
      ],
      regional_trends: {
        US: ['AI tools', 'productivity apps'],
        EU: ['sustainability', 'green tech'],
        APAC: ['mobile commerce', 'fintech']
      }
    };
  }

  private async generatePromptContent(name: string, args: Record<string, any>): Promise<string> {
    switch (name) {
      case 'generate_marketing_campaign':
        return `Generate a comprehensive marketing campaign for a ${args.businessType || '[BUSINESS_TYPE]'} business targeting ${args.targetAudience || '[TARGET_AUDIENCE]'} with a budget of ${args.budget || '[BUDGET]'}. Include strategy, tactics, timeline, and expected ROI.`;
      
      case 'analyze_competition':
        return `Analyze the competitive landscape in the ${args.industry || '[INDUSTRY]'} industry. Identify key competitors, market positioning, strengths, weaknesses, and opportunities for differentiation.`;
      
      case 'optimize_roi':
        return `Analyze the current marketing campaigns and optimize budget allocation to maximize ROI. Current budget: ${args.budget || '[BUDGET]'}. Focus on improving conversion rates and reducing customer acquisition costs.`;
      
      default:
        return `Execute ${name} with the provided parameters.`;
    }
  }

  private notifyToolsListChanged(): void {
    this.broadcast({
      id: `tools-changed-${Date.now()}`,
      type: 'notification',
      method: 'notifications/tools/list_changed'
    });
  }

  private notifyResourcesListChanged(): void {
    this.broadcast({
      id: `resources-changed-${Date.now()}`,
      type: 'notification',
      method: 'notifications/resources/list_changed'
    });
  }

  private notifyPromptsListChanged(): void {
    this.broadcast({
      id: `prompts-changed-${Date.now()}`,
      type: 'notification',
      method: 'notifications/prompts/list_changed'
    });
  }

  private broadcast(message: MCPMessage): void {
    const messageStr = JSON.stringify(message);
    this.connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
  }

  public getCapabilities(): MCPServerCapabilities {
    return this.capabilities;
  }

  public getTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  public getResources(): MCPResource[] {
    return Array.from(this.resources.values());
  }

  public getPrompts(): MCPPrompt[] {
    return Array.from(this.prompts.values());
  }
}

export const mcpProtocolManager = new MCPProtocolManager();