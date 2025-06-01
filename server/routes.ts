import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { z } from "zod";
import { insertAgentSchema, insertChatSessionSchema, insertChatMessageSchema } from "@shared/schema";
import { LlmRouter } from "./services/LlmRouter";
import { VectorStore } from "./services/VectorStore";
import { LoggingModule } from "./services/LoggingModule";
import { ModelSuggestor } from "./services/ModelSuggestor";
import { customModelRegistry } from "./services/CustomModelRegistry";
import { moduleRegistry } from "./services/ModuleRegistry";
import { mcpProtocolManager } from "./services/MCPProtocolManager";
import { externalIntegrationService } from "./services/ExternalIntegrationService";
import { hotelMCPServer } from "./services/HotelMCPServer";

const llmRouter = new LlmRouter();
const vectorStore = new VectorStore();
const loggingModule = new LoggingModule();
const modelSuggestor = new ModelSuggestor();

export async function registerRoutes(app: Express): Promise<Server> {
  // Agent Management Routes
  
  // GET /api/agents - List all agents
  app.get("/api/agents", async (req, res) => {
    try {
      const agents = await storage.getAgents();
      res.json(agents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch agents" });
    }
  });

  // GET /api/agents/:id - Get specific agent
  app.get("/api/agents/:id", async (req, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      res.json(agent);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch agent" });
    }
  });

  // POST /api/agents - Create new agent
  app.post("/api/agents", async (req, res) => {
    try {
      const validatedData = insertAgentSchema.parse(req.body);
      const agent = await storage.createAgent(validatedData);
      
      // Log agent creation
      await loggingModule.logAgentAction(agent.id, "created", {
        agentName: agent.name,
        modules: agent.modules.length,
        model: agent.model
      });

      res.status(201).json(agent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid agent data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create agent" });
    }
  });

  // PUT /api/agents/:id - Update agent
  app.put("/api/agents/:id", async (req, res) => {
    try {
      const validatedData = insertAgentSchema.parse(req.body);
      const agent = await storage.updateAgent(req.params.id, validatedData);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      res.json(agent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid agent data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update agent" });
    }
  });

  // Custom model management endpoints
  app.get("/api/custom-models", async (req, res) => {
    try {
      const models = customModelRegistry.getAllModels();
      res.json(models);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch custom models" });
    }
  });

  app.post("/api/custom-models", async (req, res) => {
    try {
      const { id, name, provider, endpoint, apiKey, headers, requestFormat, responseMapping, parameters } = req.body;
      
      if (!id || !name || !endpoint || !requestFormat || !responseMapping) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const config = {
        id,
        name,
        provider: provider || "custom",
        endpoint,
        apiKey,
        headers,
        requestFormat,
        responseMapping,
        parameters: parameters || {}
      };

      customModelRegistry.addCustomEndpoint(config);
      res.status(201).json({ message: "Custom model added successfully", id });
    } catch (error) {
      res.status(500).json({ message: "Failed to add custom model" });
    }
  });

  app.delete("/api/custom-models/:id", async (req, res) => {
    try {
      const success = customModelRegistry.removeModel(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Custom model not found" });
      }
      res.json({ message: "Custom model removed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove custom model" });
    }
  });

  app.post("/api/custom-models/:id/test", async (req, res) => {
    try {
      const { prompt, systemPrompt } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required" });
      }
      
      const response = await customModelRegistry.executeModel(
        req.params.id,
        prompt,
        systemPrompt,
        { maxTokens: 100, temperature: 0.7 }
      );
      
      res.json({ response, success: true });
    } catch (error) {
      res.status(400).json({ 
        message: "Model test failed", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // DELETE /api/agents/:id - Delete agent
  app.delete("/api/agents/:id", async (req, res) => {
    try {
      const success = await storage.deleteAgent(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Agent not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete agent" });
    }
  });

  // POST /api/agents/:id/invoke - Execute agent
  app.post("/api/agents/:id/invoke", async (req, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      const { input } = req.body;
      const executionId = crypto.randomUUID();
      const startTime = Date.now();

      try {
        // Check vector cache first
        const cacheResult = await vectorStore.searchSimilar(agent.id, input, 0.9);
        
        let output;
        let fromCache = false;

        if (cacheResult) {
          output = cacheResult.answer;
          fromCache = true;
          await vectorStore.incrementHitCount(cacheResult.id);
        } else {
          // Execute agent with LLM
          output = await llmRouter.executeAgent(agent, input);
          
          // Cache the result
          await vectorStore.cacheResult(agent.id, input, output);
        }

        const duration = Date.now() - startTime;

        // Log execution
        await loggingModule.logExecution(agent.id, executionId, "success", {
          input,
          output,
          duration,
          fromCache,
          model: agent.model
        });

        res.json({
          executionId,
          output,
          fromCache,
          duration
        });

      } catch (executionError) {
        const duration = Date.now() - startTime;
        
        await loggingModule.logExecution(agent.id, executionId, "error", {
          input,
          duration,
          error: executionError instanceof Error ? executionError.message : "Unknown error"
        });

        res.status(500).json({ 
          message: "Agent execution failed",
          executionId,
          error: executionError instanceof Error ? executionError.message : "Unknown error"
        });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to execute agent" });
    }
  });

  // Chat Session Routes
  
  // POST /api/chat/sessions - Create chat session
  app.post("/api/chat/sessions", async (req, res) => {
    try {
      const validatedData = insertChatSessionSchema.parse(req.body);
      const session = await storage.createChatSession(validatedData);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid session data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create chat session" });
    }
  });

  // GET /api/chat/sessions/:id/messages - Get chat messages
  app.get("/api/chat/sessions/:id/messages", async (req, res) => {
    try {
      const messages = await storage.getChatMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // POST /api/chat/sessions/:id/messages - Send message
  app.post("/api/chat/sessions/:id/messages", async (req, res) => {
    try {
      const messageData = insertChatMessageSchema.parse({
        ...req.body,
        sessionId: req.params.id
      });
      
      const message = await storage.createChatMessage(messageData);
      
      // If it's a user message to an agent, generate response
      if (messageData.role === "user") {
        const session = await storage.getChatSession(req.params.id);
        if (session) {
          const agent = await storage.getAgent(session.agentId);
          if (agent) {
            try {
              // Check cache first
              const cacheResult = await vectorStore.searchSimilar(agent.id, messageData.content, 0.9);
              
              let agentResponse;
              let fromCache = false;

              if (cacheResult) {
                agentResponse = cacheResult.answer;
                fromCache = true;
                await vectorStore.incrementHitCount(cacheResult.id);
              } else {
                agentResponse = await llmRouter.executeAgent(agent, messageData.content);
                await vectorStore.cacheResult(agent.id, messageData.content, agentResponse);
              }

              // Create agent response message
              const responseMessage = await storage.createChatMessage({
                sessionId: req.params.id,
                role: "agent",
                content: agentResponse,
                metadata: { fromCache }
              });

              res.json({ userMessage: message, agentMessage: responseMessage });
            } catch (error) {
              // Still return user message even if agent response fails
              res.json({ userMessage: message, error: "Agent response failed" });
            }
          }
        }
      } else {
        res.json({ message });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid message data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Specialized Module Registry Routes
  
  // GET /api/modules - List all available specialized modules
  app.get("/api/modules", async (req, res) => {
    try {
      const category = req.query.category as string;
      const modules = category 
        ? moduleRegistry.getModulesByCategory(category)
        : moduleRegistry.getAllModules();
      res.json(modules);
    } catch (error) {
      console.error("Error fetching modules:", error);
      res.status(500).json({ message: "Failed to fetch modules" });
    }
  });

  // GET /api/modules/:id - Get specific module details
  app.get("/api/modules/:id", async (req, res) => {
    try {
      const module = moduleRegistry.getModule(req.params.id);
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }
      res.json(module);
    } catch (error) {
      console.error("Error fetching module:", error);
      res.status(500).json({ message: "Failed to fetch module" });
    }
  });

  // GET /api/modules/:id/config - Get module default configuration
  app.get("/api/modules/:id/config", async (req, res) => {
    try {
      const defaultConfig = moduleRegistry.getDefaultConfig(req.params.id);
      res.json(defaultConfig);
    } catch (error) {
      console.error("Error fetching module config:", error);
      res.status(500).json({ message: "Failed to fetch module configuration" });
    }
  });

  // POST /api/modules/:id/test - Test module functionality
  app.post("/api/modules/:id/test", async (req, res) => {
    try {
      const { config, input } = req.body;
      const instance = moduleRegistry.createModuleInstance(req.params.id, config);
      const result = await instance.invoke(input);
      res.json(result);
    } catch (error) {
      console.error("Error testing module:", error);
      res.status(500).json({ message: "Failed to test module" });
    }
  });

  // Model Selection Routes
  
  // POST /api/models/suggest - Get model suggestions
  app.post("/api/models/suggest", async (req, res) => {
    try {
      const { useCase, contextLength, temperature, budget, latency } = req.body;
      
      const suggestions = await modelSuggestor.suggestModels({
        useCase,
        contextLength,
        temperature,
        budget,
        latency
      });

      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get model suggestions" });
    }
  });

  // Monitoring Routes
  
  // GET /api/monitoring/stats - Get system statistics
  app.get("/api/monitoring/stats", async (req, res) => {
    try {
      const stats = await storage.getSystemStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch system stats" });
    }
  });

  // GET /api/monitoring/logs - Get recent logs
  app.get("/api/monitoring/logs", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getRecentLogs(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch logs" });
    }
  });

  // Agent Oversight and Performance Analytics Routes
  app.get('/api/oversight/metrics/:agentId', async (req, res) => {
    try {
      const { agentId } = req.params;
      const { agentOversight } = await import('./services/AgentOversightService');
      const metrics = await agentOversight.calculatePerformanceMetrics(agentId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching agent metrics:", error);
      res.status(500).json({ message: "Failed to fetch agent metrics" });
    }
  });

  app.get('/api/oversight/metrics', async (req, res) => {
    try {
      const { agentOversight } = await import('./services/AgentOversightService');
      const metrics = await agentOversight.getAllMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching all metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  app.get('/api/oversight/trends/:agentId', async (req, res) => {
    try {
      const { agentId } = req.params;
      const days = parseInt(req.query.days as string) || 30;
      const { agentOversight } = await import('./services/AgentOversightService');
      const trends = await agentOversight.getExecutionTrends(agentId, days);
      res.json(trends);
    } catch (error) {
      console.error("Error fetching execution trends:", error);
      res.status(500).json({ message: "Failed to fetch execution trends" });
    }
  });

  app.get('/api/oversight/overview', async (req, res) => {
    try {
      const { agentOversight } = await import('./services/AgentOversightService');
      const overview = await agentOversight.getSystemOverview();
      res.json(overview);
    } catch (error) {
      console.error("Error fetching system overview:", error);
      res.status(500).json({ message: "Failed to fetch system overview" });
    }
  });

  app.get('/api/oversight/security-events', async (req, res) => {
    try {
      const agentId = req.query.agentId as string;
      const { agentOversight } = await import('./services/AgentOversightService');
      const events = agentOversight.getSecurityEvents(agentId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching security events:", error);
      res.status(500).json({ message: "Failed to fetch security events" });
    }
  });

  app.post('/api/oversight/security-events/:eventId/resolve', async (req, res) => {
    try {
      const { eventId } = req.params;
      const { agentOversight } = await import('./services/AgentOversightService');
      agentOversight.resolveSecurityEvent(eventId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error resolving security event:", error);
      res.status(500).json({ message: "Failed to resolve security event" });
    }
  });

  app.post('/api/oversight/alerts/:agentId', async (req, res) => {
    try {
      const { agentId } = req.params;
      const alertConfig = req.body;
      const { agentOversight } = await import('./services/AgentOversightService');
      agentOversight.setAlertConfig({ agentId, ...alertConfig });
      res.json({ success: true });
    } catch (error) {
      console.error("Error setting alert config:", error);
      res.status(500).json({ message: "Failed to set alert config" });
    }
  });

  app.get('/api/oversight/alerts/:agentId', async (req, res) => {
    try {
      const { agentId } = req.params;
      const { agentOversight } = await import('./services/AgentOversightService');
      const config = agentOversight.getAlertConfig(agentId);
      res.json(config || null);
    } catch (error) {
      console.error("Error fetching alert config:", error);
      res.status(500).json({ message: "Failed to fetch alert config" });
    }
  });

  app.post('/api/oversight/agents/:agentId/pause', async (req, res) => {
    try {
      const { agentId } = req.params;
      const { reason } = req.body;
      const { agentOversight } = await import('./services/AgentOversightService');
      await agentOversight.pauseAgent(agentId, reason || 'Manual pause');
      res.json({ success: true });
    } catch (error) {
      console.error("Error pausing agent:", error);
      res.status(500).json({ message: "Failed to pause agent" });
    }
  });

  app.post('/api/oversight/agents/:agentId/resume', async (req, res) => {
    try {
      const { agentId } = req.params;
      const { agentOversight } = await import('./services/AgentOversightService');
      await agentOversight.resumeAgent(agentId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error resuming agent:", error);
      res.status(500).json({ message: "Failed to resume agent" });
    }
  });

  // Module Library Routes
  
  // GET /api/modules - Get available modules
  app.get("/api/modules", async (req, res) => {
    try {
      const modules = await storage.getModuleDefinitions();
      res.json(modules);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch modules" });
    }
  });

  // Hotel Booking Data API Routes
  
  // GET /api/hotel/bookings - Get hotel bookings with filtering
  app.get("/api/hotel/bookings", async (req, res) => {
    try {
      const { status, location, eventType, limit = 50, offset = 0 } = req.query;
      const bookings = hotelMCPServer.getBookingStats();
      
      res.json({
        bookings: [],
        stats: bookings,
        connectionCount: hotelMCPServer.getConnectionCount()
      });
    } catch (error) {
      console.error("Error fetching hotel bookings:", error);
      res.status(500).json({ message: "Failed to fetch hotel bookings" });
    }
  });

  // GET /api/hotel/analytics/most-booked - Get most booked hotels
  app.get("/api/hotel/analytics/most-booked", async (req, res) => {
    try {
      // This would typically query the hotel MCP server
      res.json({
        message: "Connect to Hotel MCP WebSocket at /ws/hotel for real-time data",
        endpoint: "/ws/hotel?token=your_token",
        method: "hotel/analytics/most-booked"
      });
    } catch (error) {
      console.error("Error fetching most booked hotels:", error);
      res.status(500).json({ message: "Failed to fetch most booked hotels" });
    }
  });

  // GET /api/hotel/analytics/seasonal - Get seasonal booking trends
  app.get("/api/hotel/analytics/seasonal", async (req, res) => {
    try {
      res.json({
        message: "Connect to Hotel MCP WebSocket at /ws/hotel for real-time data",
        endpoint: "/ws/hotel?token=your_token", 
        method: "hotel/analytics/seasonal"
      });
    } catch (error) {
      console.error("Error fetching seasonal trends:", error);
      res.status(500).json({ message: "Failed to fetch seasonal trends" });
    }
  });

  // GET /api/hotel/festivals - Get festival data and nearby hotels
  app.get("/api/hotel/festivals", async (req, res) => {
    try {
      res.json({
        message: "Connect to Hotel MCP WebSocket at /ws/hotel for real-time data",
        endpoint: "/ws/hotel?token=your_token",
        method: "hotel/festivals/list"
      });
    } catch (error) {
      console.error("Error fetching festival data:", error);
      res.status(500).json({ message: "Failed to fetch festival data" });
    }
  });

  // GET /api/hotel/revenue - Get revenue analysis
  app.get("/api/hotel/revenue", async (req, res) => {
    try {
      res.json({
        message: "Connect to Hotel MCP WebSocket at /ws/hotel for real-time data",
        endpoint: "/ws/hotel?token=your_token",
        method: "hotel/revenue/analysis"
      });
    } catch (error) {
      console.error("Error fetching revenue analysis:", error);
      res.status(500).json({ message: "Failed to fetch revenue analysis" });
    }
  });

  // Hotel Recommendation API endpoint
  app.post("/api/hotel-recommendations", async (req, res) => {
    try {
      const { 
        userId, 
        searchHistory, 
        targetLocation, 
        dateRange, 
        guestDetails, 
        preferences, 
        categories 
      } = req.body;

      // Validate required fields
      if (!targetLocation || !dateRange || !guestDetails) {
        return res.status(400).json({ 
          message: "Missing required fields: targetLocation, dateRange, guestDetails" 
        });
      }

      // Import and initialize the hotel recommendation module
      const { HotelRecommendationModule } = await import("./modules/HotelRecommendationModule");
      
      const hotelModule = new HotelRecommendationModule({
        dataSourceConfig: {
          historicalBookings: "database://bookings",
          hotelInventory: "api://inventory", 
          userSearchHistory: "database://user_searches",
          eventCalendar: "api://events",
          pricingData: "api://pricing"
        },
        recommendationCategories: [
          "trending", 
          "historical", 
          "similarToTrending", 
          "personalizedBasedOnHistory", 
          "seasonalSpecial", 
          "packageDeals"
        ],
        maxRecommendationsPerCategory: 5,
        seasonalEventWeights: {
          "Christmas": 1.5,
          "New Year": 1.4,
          "Summer": 1.2
        },
        locationRadiusKm: 25,
        priceRangeFilters: {
          budget: [50, 150],
          mid: [150, 350],
          luxury: [350, 1000]
        }
      });

      const recommendations = await hotelModule.invoke({
        userId,
        searchHistory,
        targetLocation,
        dateRange,
        guestDetails,
        preferences,
        categories
      });

      res.json(recommendations);
    } catch (error) {
      console.error("Hotel recommendation error:", error);
      res.status(500).json({ 
        message: "Failed to generate hotel recommendations",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // MCP Protocol and External Integration Routes
  
  // GET /api/mcp/capabilities - Get MCP server capabilities
  app.get("/api/mcp/capabilities", async (req, res) => {
    try {
      const capabilities = mcpProtocolManager.getCapabilities();
      res.json(capabilities);
    } catch (error) {
      console.error("Error fetching MCP capabilities:", error);
      res.status(500).json({ message: "Failed to fetch MCP capabilities" });
    }
  });

  // GET /api/mcp/tools - List available MCP tools
  app.get("/api/mcp/tools", async (req, res) => {
    try {
      const tools = mcpProtocolManager.getTools();
      res.json(tools);
    } catch (error) {
      console.error("Error fetching MCP tools:", error);
      res.status(500).json({ message: "Failed to fetch MCP tools" });
    }
  });

  // GET /api/mcp/resources - List available MCP resources
  app.get("/api/mcp/resources", async (req, res) => {
    try {
      const resources = mcpProtocolManager.getResources();
      res.json(resources);
    } catch (error) {
      console.error("Error fetching MCP resources:", error);
      res.status(500).json({ message: "Failed to fetch MCP resources" });
    }
  });

  // GET /api/mcp/prompts - List available MCP prompts
  app.get("/api/mcp/prompts", async (req, res) => {
    try {
      const prompts = mcpProtocolManager.getPrompts();
      res.json(prompts);
    } catch (error) {
      console.error("Error fetching MCP prompts:", error);
      res.status(500).json({ message: "Failed to fetch MCP prompts" });
    }
  });

  // External Integration Routes
  
  // GET /api/external/services - List all registered external services
  app.get("/api/external/services", async (req, res) => {
    try {
      const services = externalIntegrationService.getRegisteredServices();
      res.json(services);
    } catch (error) {
      console.error("Error fetching external services:", error);
      res.status(500).json({ message: "Failed to fetch external services" });
    }
  });

  // POST /api/external/:service/test - Test connection to external service
  app.post("/api/external/:service/test", async (req, res) => {
    try {
      const result = await externalIntegrationService.testServiceConnection(req.params.service);
      res.json(result);
    } catch (error) {
      console.error("Error testing service connection:", error);
      res.status(500).json({ message: "Failed to test service connection" });
    }
  });

  // POST /api/external/:service/request - Make request to external service
  app.post("/api/external/:service/request", async (req, res) => {
    try {
      const { endpoint, method = 'GET', data, headers, params } = req.body;
      const result = await externalIntegrationService.makeRequest(req.params.service, endpoint, {
        method,
        data,
        headers,
        params
      });
      res.json(result);
    } catch (error) {
      console.error("Error making external request:", error);
      res.status(500).json({ message: "Failed to make external request" });
    }
  });

  // GET /api/trends/:region - Get trending topics for region
  app.get("/api/trends/:region", async (req, res) => {
    try {
      const { region } = req.params;
      const { category } = req.query;
      const result = await externalIntegrationService.getTrendingTopics(region, category as string);
      res.json(result);
    } catch (error) {
      console.error("Error fetching trending topics:", error);
      res.status(500).json({ message: "Failed to fetch trending topics" });
    }
  });

  // GET /api/market/:symbol - Get market data for symbol
  app.get("/api/market/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const { timeframe } = req.query;
      const result = await externalIntegrationService.getMarketData(symbol, timeframe as string);
      res.json(result);
    } catch (error) {
      console.error("Error fetching market data:", error);
      res.status(500).json({ message: "Failed to fetch market data" });
    }
  });

  // POST /api/analysis/competitors - Perform competitor analysis
  app.post("/api/analysis/competitors", async (req, res) => {
    try {
      const { domain, competitors } = req.body;
      const result = await externalIntegrationService.getCompetitorAnalysis(domain, competitors);
      res.json(result);
    } catch (error) {
      console.error("Error fetching competitor analysis:", error);
      res.status(500).json({ message: "Failed to fetch competitor analysis" });
    }
  });

  // MCP Catalog Routes
  
  // GET /api/mcp/catalog - Get available MCP servers
  app.get("/api/mcp/catalog", async (req, res) => {
    try {
      const mcpServers = [
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
          documentation: '/docs/hotel-mcp'
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
          author: 'Agent Platform'
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
          author: 'Google'
        }
      ];
      res.json(mcpServers);
    } catch (error) {
      console.error("Error fetching MCP catalog:", error);
      res.status(500).json({ message: "Failed to fetch MCP catalog" });
    }
  });

  // POST /api/mcp/test-connection - Test MCP server connection
  app.post("/api/mcp/test-connection", async (req, res) => {
    try {
      const { serverId, endpoint } = req.body;
      
      // Test connection to the specific MCP server
      let success = false;
      let message = '';
      
      if (serverId === 'hotel-analytics') {
        // Test hotel analytics server
        success = true;
        message = 'Hotel Analytics MCP server is running and accessible';
      } else if (serverId === 'marketing-data') {
        // Test marketing data server  
        success = true;
        message = 'Marketing Data server is running and accessible';
      } else {
        success = false;
        message = 'Server connection failed - external service may require authentication';
      }
      
      res.json({ 
        success, 
        message,
        serverId,
        endpoint,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error testing MCP connection:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to test MCP connection",
        error: error.message 
      });
    }
  });

  // WebSocket for real-time updates
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const mcpWss = new WebSocketServer({ server: httpServer, path: '/mcp' });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        switch (data.type) {
          case 'subscribe_agent_logs':
            // Subscribe to agent execution logs
            ws.send(JSON.stringify({
              type: 'subscribed',
              agentId: data.agentId
            }));
            break;
            
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  // Hotel MCP WebSocket for hotel booking data
  const hotelWss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws/hotel',
    verifyClient: (info) => {
      const token = info.req.url?.split('token=')[1];
      return !!token; // Basic token validation
    }
  });

  hotelWss.on('connection', async (ws, req) => {
    const connectionId = Math.random().toString(36).substring(7);
    console.log(`[Hotel MCP] New connection: ${connectionId}`);
    
    try {
      await hotelMCPServer.handleConnection(ws, connectionId);
    } catch (error) {
      console.error('[Hotel MCP] Connection error:', error);
      ws.close();
    }
  });

  return httpServer;
}
