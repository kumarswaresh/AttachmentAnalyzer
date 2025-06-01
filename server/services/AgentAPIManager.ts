import { Router } from "express";
import { storage } from "../storage";
import { customModelRegistry } from "./CustomModelRegistry";
import { LlmRouter } from "./LlmRouter";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

interface APIKey {
  id: string;
  name: string;
  keyHash: string;
  userId: string;
  agentAccess: string[]; // agent IDs this key can access
  permissions: string[];
  createdAt: Date;
  lastUsed?: Date;
  expiresAt?: Date;
  active: boolean;
}

interface AgentAPIConfig {
  agentId: string;
  responseFormat: "json" | "text" | "structured";
  maxSuggestions: number;
  rateLimitPerMinute: number;
  requireAuth: boolean;
  customParameters: Record<string, any>;
}

export class AgentAPIManager {
  private apiKeys: Map<string, APIKey> = new Map();
  private agentConfigs: Map<string, AgentAPIConfig> = new Map();
  private llmRouter: LlmRouter;

  constructor() {
    this.llmRouter = new LlmRouter();
    this.initializeDefaultConfigs();
  }

  private initializeDefaultConfigs() {
    // Default API configurations for common agent types
    const defaultConfigs = [
      {
        agentId: "hotel-marketing-agent",
        responseFormat: "json" as const,
        maxSuggestions: 10,
        rateLimitPerMinute: 100,
        requireAuth: true,
        customParameters: {
          includePackages: true,
          includePricing: true,
          includeAvailability: true,
          googleTrendsIntegration: true
        }
      }
    ];

    defaultConfigs.forEach(config => {
      this.agentConfigs.set(config.agentId, config);
    });
  }

  // Generate API key for user
  async generateAPIKey(userId: string, name: string, permissions: string[], agentAccess: string[]): Promise<string> {
    const apiKey = `agent_${nanoid(32)}`;
    const keyHash = await bcrypt.hash(apiKey, 10);
    
    const keyData: APIKey = {
      id: nanoid(),
      name,
      keyHash,
      userId,
      agentAccess,
      permissions,
      createdAt: new Date(),
      active: true
    };

    this.apiKeys.set(apiKey, keyData);
    return apiKey;
  }

  // Validate API key
  async validateAPIKey(apiKey: string, agentId?: string): Promise<APIKey | null> {
    const keyData = this.apiKeys.get(apiKey);
    
    if (!keyData || !keyData.active) {
      return null;
    }

    if (keyData.expiresAt && keyData.expiresAt < new Date()) {
      return null;
    }

    if (agentId && !keyData.agentAccess.includes(agentId) && !keyData.agentAccess.includes("*")) {
      return null;
    }

    // Update last used
    keyData.lastUsed = new Date();
    return keyData;
  }

  // Create dynamic API routes for each agent
  createAgentAPIRoutes(): Router {
    const router = Router();

    // Authentication middleware
    const authenticateAPI = async (req: any, res: any, next: any) => {
      const apiKey = req.headers['x-api-key'] || req.query.api_key;
      const agentId = req.params.agentId;

      if (!apiKey) {
        return res.status(401).json({ error: "API key required" });
      }

      const keyData = await this.validateAPIKey(apiKey, agentId);
      if (!keyData) {
        return res.status(403).json({ error: "Invalid or unauthorized API key" });
      }

      req.apiUser = keyData;
      next();
    };

    // Dynamic agent execution endpoint
    router.post('/api/agents/:agentId/execute', authenticateAPI, async (req, res) => {
      try {
        const { agentId } = req.params;
        const { input, parameters = {} } = req.body;

        // Get agent configuration
        const agent = await storage.getAgent(agentId);
        if (!agent) {
          return res.status(404).json({ error: "Agent not found" });
        }

        const config = this.agentConfigs.get(agentId);
        if (!config) {
          return res.status(400).json({ error: "Agent not configured for API access" });
        }

        // Merge default and custom parameters
        const executionParams = {
          ...config.customParameters,
          ...parameters,
          maxSuggestions: parameters.maxSuggestions || config.maxSuggestions,
          responseFormat: config.responseFormat
        };

        // Execute agent with enhanced input
        const result = await this.executeAgentWithConfig(agent, input, executionParams);

        // Format response based on configuration
        const formattedResponse = this.formatResponse(result, config.responseFormat);

        res.json({
          success: true,
          agentId,
          result: formattedResponse,
          metadata: {
            executionTime: result.executionTime,
            model: agent.model,
            parametersUsed: executionParams,
            timestamp: new Date().toISOString()
          }
        });

      } catch (error) {
        res.status(500).json({
          success: false,
          error: "Agent execution failed",
          message: error instanceof Error ? error.message : "Unknown error"
        });
      }
    });

    // Get agent schema/documentation
    router.get('/api/agents/:agentId/schema', authenticateAPI, async (req, res) => {
      try {
        const { agentId } = req.params;
        const agent = await storage.getAgent(agentId);
        
        if (!agent) {
          return res.status(404).json({ error: "Agent not found" });
        }

        const config = this.agentConfigs.get(agentId);
        const schema = await this.generateAgentSchema(agent, config);

        res.json(schema);
      } catch (error) {
        res.status(500).json({ error: "Failed to generate schema" });
      }
    });

    // List accessible agents for API key
    router.get('/api/agents', authenticateAPI, async (req, res) => {
      try {
        const userAccess = req.apiUser.agentAccess;
        const agents = await storage.getAgents();
        
        const accessibleAgents = agents.filter(agent => 
          userAccess.includes("*") || userAccess.includes(agent.id)
        );

        const agentSummaries = accessibleAgents.map(agent => ({
          id: agent.id,
          name: agent.name,
          description: agent.goal,
          role: agent.role,
          apiEndpoint: `/api/agents/${agent.id}/execute`,
          documentation: `/api/agents/${agent.id}/schema`,
          configuration: this.agentConfigs.get(agent.id)
        }));

        res.json({
          agents: agentSummaries,
          totalCount: agentSummaries.length
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch agents" });
      }
    });

    return router;
  }

  private async executeAgentWithConfig(agent: any, input: string, parameters: any): Promise<any> {
    const startTime = Date.now();

    // Enhanced input with parameters and data source connections
    const enhancedInput = await this.enhanceInputWithDataSources(input, parameters);

    // Execute the agent using the LLM router
    const response = await this.llmRouter.route(
      agent.model,
      enhancedInput,
      `You are ${agent.role}. ${agent.goal}`,
      {
        maxTokens: parameters.maxTokens || 4000,
        temperature: parameters.temperature || 0.7
      }
    );

    return {
      output: response,
      executionTime: Date.now() - startTime,
      parametersUsed: parameters
    };
  }

  private async enhanceInputWithDataSources(input: string, parameters: any): Promise<string> {
    let enhancedInput = input;

    // Add Google Trends integration
    if (parameters.googleTrendsIntegration) {
      const trendsData = await this.fetchGoogleTrends(input);
      enhancedInput += `\n\nGoogle Trends Data: ${JSON.stringify(trendsData)}`;
    }

    // Add database connections
    if (parameters.databaseToken) {
      const dbData = await this.fetchDatabaseData(parameters.databaseToken, input);
      enhancedInput += `\n\nDatabase Context: ${JSON.stringify(dbData)}`;
    }

    // Add supplier data
    if (parameters.supplierAPI) {
      const supplierData = await this.fetchSupplierData(parameters.supplierAPI, input);
      enhancedInput += `\n\nSupplier Data: ${JSON.stringify(supplierData)}`;
    }

    // Add response format instructions
    enhancedInput += `\n\nResponse Format: ${parameters.responseFormat}`;
    enhancedInput += `\nMax Suggestions: ${parameters.maxSuggestions}`;

    return enhancedInput;
  }

  private async fetchGoogleTrends(query: string): Promise<any> {
    // This would integrate with Google Trends API
    // For now, return simulated trending data
    return {
      trendingDestinations: ["Paris", "Tokyo", "New York"],
      seasonalTrends: ["Christmas markets", "Winter sports", "Holiday packages"],
      relatedQueries: ["luxury hotels", "family packages", "business travel"]
    };
  }

  private async fetchDatabaseData(token: string, query: string): Promise<any> {
    // Validate database token and fetch relevant data
    // This would connect to external databases using provided tokens
    return {
      historicalBookings: "encrypted_data_based_on_token",
      userPreferences: "user_specific_data",
      inventoryData: "real_time_availability"
    };
  }

  private async fetchSupplierData(apiConfig: any, query: string): Promise<any> {
    // Connect to hotel/package suppliers
    return {
      hotelInventory: "supplier_hotel_data",
      packageOffers: "supplier_package_data",
      realTimePricing: "current_market_rates"
    };
  }

  private formatResponse(result: any, format: string): any {
    switch (format) {
      case "json":
        try {
          // Try to parse the output as JSON
          return JSON.parse(result.output);
        } catch {
          // If not valid JSON, structure it
          return {
            response: result.output,
            structured: false
          };
        }
      
      case "structured":
        return {
          recommendations: this.extractRecommendations(result.output),
          metadata: {
            confidence: this.calculateConfidence(result.output),
            sources: this.extractSources(result.output)
          }
        };
      
      default:
        return result.output;
    }
  }

  private extractRecommendations(output: string): any[] {
    // Extract structured recommendations from agent output
    // This would use more sophisticated parsing
    const recommendations = [];
    const lines = output.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('Hotel:') || lines[i].includes('Package:')) {
        recommendations.push({
          type: lines[i].includes('Hotel:') ? 'hotel' : 'package',
          name: lines[i].split(':')[1]?.trim(),
          details: lines[i + 1]?.trim() || ''
        });
      }
    }
    
    return recommendations;
  }

  private calculateConfidence(output: string): number {
    // Calculate confidence based on output quality indicators
    const indicators = [
      output.includes('price'),
      output.includes('availability'),
      output.includes('rating'),
      output.length > 100
    ];
    
    return indicators.filter(Boolean).length / indicators.length;
  }

  private extractSources(output: string): string[] {
    // Extract data sources mentioned in the output
    const sources = [];
    if (output.includes('historical')) sources.push('historical_data');
    if (output.includes('trending')) sources.push('google_trends');
    if (output.includes('real-time')) sources.push('supplier_api');
    
    return sources;
  }

  private async generateAgentSchema(agent: any, config: any): Promise<any> {
    return {
      agentId: agent.id,
      name: agent.name,
      description: agent.goal,
      role: agent.role,
      apiEndpoint: `/api/agents/${agent.id}/execute`,
      authentication: {
        type: "API Key",
        header: "x-api-key",
        description: "Include your API key in the x-api-key header"
      },
      requestSchema: {
        type: "object",
        properties: {
          input: {
            type: "string",
            description: "The query or request for the agent",
            example: "Suggest hotels in Paris for Christmas vacation"
          },
          parameters: {
            type: "object",
            properties: {
              maxSuggestions: {
                type: "number",
                default: config?.maxSuggestions || 10,
                description: "Maximum number of suggestions to return"
              },
              responseFormat: {
                type: "string",
                enum: ["json", "text", "structured"],
                default: config?.responseFormat || "json"
              },
              includePackages: {
                type: "boolean",
                default: true
              },
              includePricing: {
                type: "boolean", 
                default: true
              },
              databaseToken: {
                type: "string",
                description: "Token for accessing your database"
              }
            }
          }
        },
        required: ["input"]
      },
      responseSchema: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          agentId: { type: "string" },
          result: { 
            description: "Agent response in specified format" 
          },
          metadata: {
            type: "object",
            properties: {
              executionTime: { type: "number" },
              model: { type: "string" },
              timestamp: { type: "string" }
            }
          }
        }
      },
      examples: [
        {
          request: {
            input: "User searched for flights to Paris, suggest hotels for Christmas",
            parameters: {
              maxSuggestions: 5,
              responseFormat: "json",
              includePackages: true
            }
          },
          response: {
            success: true,
            result: {
              recommendations: [
                {
                  name: "Hotel Example",
                  category: "trending",
                  price: 280,
                  score: 0.92
                }
              ]
            }
          }
        }
      ]
    };
  }

  // Configure agent for API access
  async configureAgentAPI(agentId: string, config: AgentAPIConfig): Promise<void> {
    this.agentConfigs.set(agentId, config);
  }

  // Get all configured agents
  getConfiguredAgents(): string[] {
    return Array.from(this.agentConfigs.keys());
  }

  // Update agent configuration
  async updateAgentConfig(agentId: string, updates: Partial<AgentAPIConfig>): Promise<void> {
    const existing = this.agentConfigs.get(agentId);
    if (existing) {
      this.agentConfigs.set(agentId, { ...existing, ...updates });
    }
  }
}

export const agentAPIManager = new AgentAPIManager();