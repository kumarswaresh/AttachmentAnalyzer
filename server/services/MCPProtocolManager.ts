import { WebSocket, WebSocketServer } from 'ws';
import { storage } from '../storage';

export interface MCPServer {
  id: string;
  name: string;
  description: string;
  category: string;
  capabilities: string[];
  endpoint: string;
  status: 'connected' | 'disconnected' | 'error';
  version: string;
  author: string;
  documentation?: string;
  authentication?: {
    type: 'bearer' | 'api_key' | 'oauth';
    required: boolean;
  };
  resources?: MCPResource[];
  tools?: MCPTool[];
}

export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  annotations?: Record<string, any>;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  outputSchema?: Record<string, any>;
}

export interface MCPMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method: string;
  params?: Record<string, any>;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class MCPProtocolManager {
  private servers: Map<string, MCPServer> = new Map();
  private connections: Map<string, WebSocket> = new Map();
  private wsServer: WebSocketServer;

  constructor() {
    this.initializeDefaultServers();
  }

  private initializeDefaultServers() {
    const defaultServers: MCPServer[] = [
      {
        id: 'hotel-analytics',
        name: 'Hotel Analytics MCP',
        description: 'Real-time hotel booking data, analytics, and market insights for hospitality industry',
        category: 'analytics',
        capabilities: ['booking-data', 'market-analysis', 'period-reports', 'websocket-streaming'],
        endpoint: 'ws://localhost:5000/hotel-mcp',
        status: 'connected',
        version: '1.2.0',
        author: 'Agent Platform',
        documentation: '/docs/hotel-mcp',
        authentication: {
          type: 'bearer',
          required: true
        },
        resources: [
          {
            uri: 'hotel://bookings/realtime',
            name: 'Real-time Bookings',
            description: 'Live booking data stream',
            mimeType: 'application/json'
          },
          {
            uri: 'hotel://analytics/revenue',
            name: 'Revenue Analytics',
            description: 'Revenue tracking and forecasting',
            mimeType: 'application/json'
          }
        ],
        tools: [
          {
            name: 'get_booking_data',
            description: 'Retrieve booking data for specified date range',
            inputSchema: {
              type: 'object',
              properties: {
                startDate: { type: 'string', format: 'date' },
                endDate: { type: 'string', format: 'date' },
                hotelId: { type: 'string' }
              },
              required: ['startDate', 'endDate']
            }
          },
          {
            name: 'analyze_occupancy',
            description: 'Analyze occupancy rates and trends',
            inputSchema: {
              type: 'object',
              properties: {
                period: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
                hotelIds: { type: 'array', items: { type: 'string' } }
              },
              required: ['period']
            }
          }
        ]
      },
      {
        id: 'marketing-data',
        name: 'Marketing Data Server',
        description: 'Comprehensive marketing campaign data, competitor analysis, and trend insights',
        category: 'marketing',
        capabilities: ['campaign-analysis', 'competitor-data', 'trend-tracking', 'roi-metrics'],
        endpoint: 'http://localhost:5001/marketing-api',
        status: 'connected',
        version: '2.1.0',
        author: 'Agent Platform',
        authentication: {
          type: 'api_key',
          required: true
        },
        resources: [
          {
            uri: 'marketing://campaigns/active',
            name: 'Active Campaigns',
            description: 'Currently running marketing campaigns',
            mimeType: 'application/json'
          },
          {
            uri: 'marketing://analytics/performance',
            name: 'Campaign Performance',
            description: 'Campaign performance metrics and KPIs',
            mimeType: 'application/json'
          }
        ],
        tools: [
          {
            name: 'get_campaign_metrics',
            description: 'Get metrics for marketing campaigns',
            inputSchema: {
              type: 'object',
              properties: {
                campaignId: { type: 'string' },
                metrics: { type: 'array', items: { type: 'string' } },
                dateRange: {
                  type: 'object',
                  properties: {
                    start: { type: 'string', format: 'date' },
                    end: { type: 'string', format: 'date' }
                  }
                }
              },
              required: ['campaignId']
            }
          },
          {
            name: 'analyze_competitor',
            description: 'Analyze competitor marketing strategies',
            inputSchema: {
              type: 'object',
              properties: {
                competitor: { type: 'string' },
                channels: { type: 'array', items: { type: 'string' } },
                timeframe: { type: 'string', enum: ['7d', '30d', '90d'] }
              },
              required: ['competitor']
            }
          }
        ]
      },
      {
        id: 'google-trends',
        name: 'Google Trends Integration',
        description: 'Access Google Trends data for keyword research and market analysis',
        category: 'research',
        capabilities: ['keyword-trends', 'regional-data', 'related-queries', 'historical-data'],
        endpoint: 'https://trends.googleapis.com/trends/api',
        status: 'disconnected',
        version: '1.0.0',
        author: 'Google',
        authentication: {
          type: 'api_key',
          required: true
        },
        resources: [
          {
            uri: 'trends://keywords/trending',
            name: 'Trending Keywords',
            description: 'Currently trending search terms',
            mimeType: 'application/json'
          },
          {
            uri: 'trends://data/historical',
            name: 'Historical Trends',
            description: 'Historical search trend data',
            mimeType: 'application/json'
          }
        ],
        tools: [
          {
            name: 'get_trend_data',
            description: 'Get trend data for specific keywords',
            inputSchema: {
              type: 'object',
              properties: {
                keywords: { type: 'array', items: { type: 'string' } },
                geo: { type: 'string' },
                timeframe: { type: 'string' },
                category: { type: 'number' }
              },
              required: ['keywords']
            }
          },
          {
            name: 'get_related_queries',
            description: 'Get related queries for a keyword',
            inputSchema: {
              type: 'object',
              properties: {
                keyword: { type: 'string' },
                geo: { type: 'string' },
                timeframe: { type: 'string' }
              },
              required: ['keyword']
            }
          }
        ]
      },
      {
        id: 'financial-data',
        name: 'Financial Data Provider',
        description: 'Real-time and historical financial market data',
        category: 'finance',
        capabilities: ['market-data', 'price-feeds', 'technical-indicators', 'news-sentiment'],
        endpoint: 'wss://api.financial-data.com/v1/stream',
        status: 'disconnected',
        version: '3.0.0',
        author: 'Financial Data Inc',
        authentication: {
          type: 'bearer',
          required: true
        },
        resources: [
          {
            uri: 'finance://markets/equities',
            name: 'Equity Markets',
            description: 'Stock market data and analytics',
            mimeType: 'application/json'
          },
          {
            uri: 'finance://indicators/technical',
            name: 'Technical Indicators',
            description: 'Technical analysis indicators',
            mimeType: 'application/json'
          }
        ],
        tools: [
          {
            name: 'get_stock_price',
            description: 'Get current or historical stock prices',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: { type: 'string' },
                period: { type: 'string', enum: ['1d', '5d', '1mo', '3mo', '6mo', '1y'] },
                interval: { type: 'string', enum: ['1m', '5m', '15m', '30m', '1h', '1d'] }
              },
              required: ['symbol']
            }
          },
          {
            name: 'calculate_indicators',
            description: 'Calculate technical indicators',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: { type: 'string' },
                indicators: { type: 'array', items: { type: 'string' } },
                period: { type: 'number' }
              },
              required: ['symbol', 'indicators']
            }
          }
        ]
      }
    ];

    defaultServers.forEach(server => {
      this.servers.set(server.id, server);
    });
  }

  setupWebSocketServer(server: any) {
    this.wsServer = new WebSocketServer({ 
      server, 
      path: '/mcp-protocol',
      verifyClient: (info) => {
        // Basic verification - can be enhanced with authentication
        return true;
      }
    });

    this.wsServer.on('connection', (ws, request) => {
      const url = new URL(request.url!, `http://${request.headers.host}`);
      const serverId = url.searchParams.get('server');
      
      if (serverId) {
        this.connections.set(serverId, ws);
        console.log(`MCP connection established for server: ${serverId}`);
        
        // Send initial capabilities
        this.sendMessage(ws, {
          jsonrpc: '2.0',
          method: 'notifications/initialized',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {
              resources: { subscribe: true, listChanged: true },
              tools: { listChanged: true },
              prompts: { listChanged: true },
              logging: {},
              sampling: {}
            },
            serverInfo: {
              name: 'Agent Platform MCP',
              version: '1.0.0'
            }
          }
        });
      }

      ws.on('message', async (data) => {
        try {
          const message: MCPMessage = JSON.parse(data.toString());
          await this.handleMessage(ws, message, serverId);
        } catch (error) {
          console.error('Error handling MCP message:', error);
          this.sendError(ws, 'parse_error', 'Invalid JSON-RPC message');
        }
      });

      ws.on('close', () => {
        if (serverId) {
          this.connections.delete(serverId);
          console.log(`MCP connection closed for server: ${serverId}`);
        }
      });

      ws.on('error', (error) => {
        console.error('MCP WebSocket error:', error);
      });
    });
  }

  private async handleMessage(ws: WebSocket, message: MCPMessage, serverId?: string) {
    switch (message.method) {
      case 'initialize':
        await this.handleInitialize(ws, message);
        break;
      case 'resources/list':
        await this.handleResourcesList(ws, message, serverId);
        break;
      case 'resources/read':
        await this.handleResourcesRead(ws, message, serverId);
        break;
      case 'tools/list':
        await this.handleToolsList(ws, message, serverId);
        break;
      case 'tools/call':
        await this.handleToolsCall(ws, message, serverId);
        break;
      case 'prompts/list':
        await this.handlePromptsList(ws, message);
        break;
      case 'completion/complete':
        await this.handleCompletion(ws, message);
        break;
      default:
        this.sendError(ws, 'method_not_found', `Unknown method: ${message.method}`, message.id);
    }
  }

  private async handleInitialize(ws: WebSocket, message: MCPMessage) {
    this.sendMessage(ws, {
      jsonrpc: '2.0',
      id: message.id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          resources: { subscribe: true, listChanged: true },
          tools: { listChanged: true },
          prompts: { listChanged: true },
          logging: {},
          sampling: {}
        },
        serverInfo: {
          name: 'Agent Platform MCP',
          version: '1.0.0'
        }
      }
    });
  }

  private async handleResourcesList(ws: WebSocket, message: MCPMessage, serverId?: string) {
    const resources: MCPResource[] = [];
    
    if (serverId && this.servers.has(serverId)) {
      const server = this.servers.get(serverId)!;
      resources.push(...(server.resources || []));
    } else {
      // Return all resources from all servers
      this.servers.forEach(server => {
        resources.push(...(server.resources || []));
      });
    }

    this.sendMessage(ws, {
      jsonrpc: '2.0',
      id: message.id,
      result: {
        resources
      }
    });
  }

  private async handleResourcesRead(ws: WebSocket, message: MCPMessage, serverId?: string) {
    const { uri } = message.params || {};
    
    if (!uri) {
      this.sendError(ws, 'invalid_params', 'Missing uri parameter', message.id);
      return;
    }

    // Simulate resource reading - in real implementation, this would fetch actual data
    const mockData = this.generateMockResourceData(uri);
    
    this.sendMessage(ws, {
      jsonrpc: '2.0',
      id: message.id,
      result: {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(mockData, null, 2)
          }
        ]
      }
    });
  }

  private async handleToolsList(ws: WebSocket, message: MCPMessage, serverId?: string) {
    const tools: MCPTool[] = [];
    
    if (serverId && this.servers.has(serverId)) {
      const server = this.servers.get(serverId)!;
      tools.push(...(server.tools || []));
    } else {
      // Return all tools from all servers
      this.servers.forEach(server => {
        tools.push(...(server.tools || []));
      });
    }

    this.sendMessage(ws, {
      jsonrpc: '2.0',
      id: message.id,
      result: {
        tools
      }
    });
  }

  private async handleToolsCall(ws: WebSocket, message: MCPMessage, serverId?: string) {
    const { name, arguments: args } = message.params || {};
    
    if (!name) {
      this.sendError(ws, 'invalid_params', 'Missing tool name', message.id);
      return;
    }

    // Simulate tool execution - in real implementation, this would call actual tools
    const result = await this.executeTool(name, args, serverId);
    
    this.sendMessage(ws, {
      jsonrpc: '2.0',
      id: message.id,
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      }
    });
  }

  private async handlePromptsList(ws: WebSocket, message: MCPMessage) {
    // Return available prompts
    this.sendMessage(ws, {
      jsonrpc: '2.0',
      id: message.id,
      result: {
        prompts: [
          {
            name: 'hotel_booking_analysis',
            description: 'Analyze hotel booking patterns and trends',
            arguments: [
              {
                name: 'period',
                description: 'Analysis period',
                required: true
              },
              {
                name: 'hotel_type',
                description: 'Type of hotel to analyze',
                required: false
              }
            ]
          },
          {
            name: 'marketing_campaign_review',
            description: 'Review and analyze marketing campaign performance',
            arguments: [
              {
                name: 'campaign_id',
                description: 'Campaign identifier',
                required: true
              },
              {
                name: 'metrics',
                description: 'Specific metrics to analyze',
                required: false
              }
            ]
          }
        ]
      }
    });
  }

  private async handleCompletion(ws: WebSocket, message: MCPMessage) {
    const { prompt, argument } = message.params || {};
    
    // Generate completion based on prompt and argument
    const completion = this.generateCompletion(prompt, argument);
    
    this.sendMessage(ws, {
      jsonrpc: '2.0',
      id: message.id,
      result: {
        completion: {
          values: [completion],
          total: 1,
          hasMore: false
        }
      }
    });
  }

  private generateMockResourceData(uri: string): any {
    // Generate appropriate mock data based on URI
    if (uri.includes('hotel')) {
      return {
        timestamp: new Date().toISOString(),
        bookings: [
          {
            id: 'booking_001',
            hotelId: 'hotel_123',
            checkIn: '2024-06-15',
            checkOut: '2024-06-18',
            guests: 2,
            revenue: 450.00,
            status: 'confirmed'
          }
        ],
        analytics: {
          occupancyRate: 0.85,
          averageDailyRate: 150.00,
          revenuePerAvailableRoom: 127.50
        }
      };
    } else if (uri.includes('marketing')) {
      return {
        campaigns: [
          {
            id: 'campaign_001',
            name: 'Summer Promotion',
            status: 'active',
            budget: 10000,
            spent: 6500,
            impressions: 125000,
            clicks: 2500,
            conversions: 150
          }
        ],
        performance: {
          ctr: 0.02,
          conversionRate: 0.06,
          costPerConversion: 43.33,
          roi: 2.8
        }
      };
    }
    
    return { message: 'Resource data not available' };
  }

  private async executeTool(name: string, args: any, serverId?: string): Promise<any> {
    // Simulate tool execution with mock results
    switch (name) {
      case 'get_booking_data':
        return {
          success: true,
          data: {
            totalBookings: 45,
            totalRevenue: 15750.00,
            averageBookingValue: 350.00,
            bookings: [
              {
                date: args?.startDate || '2024-06-01',
                count: 12,
                revenue: 4200.00
              }
            ]
          }
        };
      
      case 'analyze_occupancy':
        return {
          success: true,
          analysis: {
            period: args?.period || 'daily',
            averageOccupancy: 0.78,
            trend: 'increasing',
            forecast: {
              nextPeriod: 0.82,
              confidence: 0.85
            }
          }
        };
      
      case 'get_campaign_metrics':
        return {
          success: true,
          campaign: {
            id: args?.campaignId,
            metrics: {
              impressions: 50000,
              clicks: 1500,
              conversions: 75,
              cost: 2500.00,
              revenue: 7500.00
            }
          }
        };
      
      default:
        return {
          success: false,
          error: `Unknown tool: ${name}`
        };
    }
  }

  private generateCompletion(prompt: string, argument: any): string {
    // Generate contextual completions
    if (prompt === 'hotel_booking_analysis') {
      return `Analyze booking patterns for ${argument?.period || 'recent period'} focusing on ${argument?.hotel_type || 'all hotel types'}`;
    } else if (prompt === 'marketing_campaign_review') {
      return `Review campaign ${argument?.campaign_id} performance metrics including ${argument?.metrics?.join(', ') || 'all available metrics'}`;
    }
    
    return 'Complete the analysis based on available data';
  }

  private sendMessage(ws: WebSocket, message: MCPMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, code: string, message: string, id?: string | number) {
    this.sendMessage(ws, {
      jsonrpc: '2.0',
      id,
      error: {
        code: this.getErrorCode(code),
        message,
        data: { code }
      }
    });
  }

  private getErrorCode(code: string): number {
    const errorCodes: Record<string, number> = {
      'parse_error': -32700,
      'invalid_request': -32600,
      'method_not_found': -32601,
      'invalid_params': -32602,
      'internal_error': -32603
    };
    return errorCodes[code] || -32603;
  }

  // Public methods for server management
  getServers(): MCPServer[] {
    return Array.from(this.servers.values());
  }

  getServer(id: string): MCPServer | undefined {
    return this.servers.get(id);
  }

  addServer(server: MCPServer): void {
    this.servers.set(server.id, server);
  }

  removeServer(id: string): boolean {
    const connection = this.connections.get(id);
    if (connection) {
      connection.close();
      this.connections.delete(id);
    }
    return this.servers.delete(id);
  }

  updateServerStatus(id: string, status: 'connected' | 'disconnected' | 'error'): void {
    const server = this.servers.get(id);
    if (server) {
      server.status = status;
    }
  }

  // Broadcast notifications to connected clients
  broadcastNotification(method: string, params: any): void {
    const message: MCPMessage = {
      jsonrpc: '2.0',
      method,
      params
    };

    this.connections.forEach((ws) => {
      this.sendMessage(ws, message);
    });
  }
}

export const mcpProtocolManager = new MCPProtocolManager();