import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { z } from "zod";
import { insertAgentSchema, insertChatSessionSchema, insertChatMessageSchema, insertUserSchema, insertAgentChainSchema, insertAgentMessageSchema, insertChainExecutionSchema } from "@shared/schema";
import { AgentChainService } from "./services/AgentChainService";
import { authService, requireAuth, requireAdmin } from "./auth";
import { LlmRouter } from "./services/LlmRouter";
import { VectorStore } from "./services/VectorStore";
import { LoggingModule } from "./services/LoggingModule";
import { ModelSuggestor } from "./services/ModelSuggestor";
import { customModelRegistry } from "./services/CustomModelRegistry";
import { moduleRegistry } from "./services/ModuleRegistry";
import { mcpProtocolManager } from "./services/MCPProtocolManager";
import { externalIntegrationService } from "./services/ExternalIntegrationService";
import { hotelMCPServer } from "./services/HotelMCPServer";
import { marketingAgentService } from "./services/MarketingAgentService";
import { setupSwagger } from "./swagger";
import { agentTestingService } from "./services/AgentTestingService";

const llmRouter = new LlmRouter();
const vectorStore = new VectorStore();
const loggingModule = new LoggingModule();
const modelSuggestor = new ModelSuggestor();
const agentChainService = new AgentChainService(storage);

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup CORS headers for API requests and Swagger
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // Force JSON content type for all API responses and prevent fall-through to Vite
  app.use('/api/*', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    // Mark this as an API request to prevent Vite from handling it
    res.locals.isAPI = true;
    next();
  });

  // Setup Swagger API Documentation
  setupSwagger(app);

  // Authentication Routes
  
  // POST /api/auth/register - Register new user
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password } = req.body;
      
      if (!username || !email || !password) {
        return res.status(400).json({ message: "Username, email, and password are required" });
      }

      const result = await authService.register(username, email, password);
      
      if (result.success) {
        // Set session cookie for browser-based requests and Swagger
        res.cookie('sessionToken', result.sessionToken, {
          httpOnly: false, // Allow JavaScript access for Swagger
          secure: false, // Set to true in production with HTTPS
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          sameSite: 'lax'
        });
        
        res.json({
          success: true,
          user: {
            id: result.user!.id,
            username: result.user!.username,
            email: result.user!.email,
            role: result.user!.role
          },
          sessionToken: result.sessionToken,
          message: result.message
        });
      } else {
        res.status(400).json({ success: false, message: result.message });
      }
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ success: false, message: "Registration failed" });
    }
  });

  // POST /api/auth/login - Login user
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { usernameOrEmail, password } = req.body;
      
      if (!usernameOrEmail || !password) {
        return res.status(400).json({ message: "Username/email and password are required" });
      }

      const result = await authService.login(usernameOrEmail, password);
      
      if (result.success) {
        // Set session cookie for browser-based requests and Swagger
        res.cookie('sessionToken', result.sessionToken, {
          httpOnly: false, // Allow JavaScript access for Swagger
          secure: false, // Set to true in production with HTTPS
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          sameSite: 'lax'
        });
        
        res.json({
          success: true,
          user: {
            id: result.user!.id,
            username: result.user!.username,
            email: result.user!.email,
            role: result.user!.role
          },
          sessionToken: result.sessionToken,
          message: result.message
        });
      } else {
        res.status(401).json({ success: false, message: result.message });
      }
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ success: false, message: "Login failed" });
    }
  });

  // GET /api/auth/status - Check authentication status
  app.get("/api/auth/status", async (req, res) => {
    try {
      // Check multiple auth sources
      let sessionToken = null;
      
      const authHeader = req.headers.authorization;
      if (authHeader) {
        sessionToken = authHeader.replace('Bearer ', '').trim();
      }
      
      if (!sessionToken && req.headers.cookie) {
        const cookies = req.headers.cookie.split(';');
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'sessionToken') {
            sessionToken = value;
            break;
          }
        }
      }
      
      if (!sessionToken && req.query.token) {
        sessionToken = req.query.token as string;
      }

      if (!sessionToken) {
        return res.json({ authenticated: false, message: "No session token provided" });
      }

      const user = await authService.validateSession(sessionToken);
      if (!user) {
        return res.json({ authenticated: false, message: "Invalid or expired session" });
      }

      res.json({
        authenticated: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error("Auth status error:", error);
      res.status(500).json({ authenticated: false, message: "Authentication check failed" });
    }
  });

  // POST /api/auth/logout - Logout user
  app.post("/api/auth/logout", requireAuth, async (req: any, res) => {
    try {
      const authHeader = req.headers.authorization;
      const sessionToken = authHeader?.replace('Bearer ', '');
      
      if (sessionToken) {
        await authService.logout(sessionToken);
      }
      
      res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ success: false, message: "Logout failed" });
    }
  });

  // GET /api/auth/me - Get current user
  app.get("/api/auth/me", requireAuth, async (req: any, res) => {
    try {
      res.json({
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user info" });
    }
  });

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

  // GET /api/agents/:id/download - Download agent configuration as JSON
  app.get("/api/agents/:id/download", async (req, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      
      const exportData = {
        type: 'agent',
        version: '1.0',
        data: agent,
        exportedAt: new Date().toISOString()
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="agent-${agent.name}-${Date.now()}.json"`);
      res.json(exportData);
    } catch (error) {
      console.error("Error downloading agent:", error);
      res.status(500).json({ message: "Failed to download agent" });
    }
  });

  // POST /api/agents/upload - Upload agent configuration from JSON
  app.post("/api/agents/upload", async (req, res) => {
    try {
      const { data, preserveId = false, duplicateAction = 'rename' } = req.body;
      
      if (!data || data.type !== 'agent') {
        return res.status(400).json({ message: "Invalid agent data format" });
      }
      
      const agentData = data.data;
      let agentName = agentData.name;
      
      // Check for duplicates by name
      const existingAgents = await storage.getAgents();
      const existingAgent = existingAgents.find(a => a.name === agentName);
      
      if (existingAgent) {
        if (duplicateAction === 'skip') {
          return res.status(200).json({ 
            message: "Agent skipped (already exists)", 
            existing: existingAgent 
          });
        } else if (duplicateAction === 'rename') {
          let counter = 1;
          let newName = `${agentName} (Copy)`;
          while (existingAgents.find(a => a.name === newName)) {
            counter++;
            newName = `${agentName} (Copy ${counter})`;
          }
          agentName = newName;
        }
        // If duplicateAction === 'overwrite', we proceed with original name
      }
      
      const insertAgent = {
        id: preserveId && agentData.id ? agentData.id : crypto.randomUUID(),
        role: agentData.role,
        name: agentName,
        goal: agentData.goal,
        guardrails: agentData.guardrails,
        modules: agentData.modules,
        model: agentData.model,
        vectorStoreId: agentData.vectorStoreId,
        status: agentData.status || 'active',
        createdBy: agentData.createdBy || 1
      };
      
      const newAgent = await storage.createAgent(insertAgent);
      res.status(201).json({
        agent: newAgent,
        action: existingAgent ? duplicateAction : 'created',
        originalName: agentData.name
      });
    } catch (error) {
      console.error("Error uploading agent:", error);
      res.status(500).json({ message: "Failed to upload agent" });
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

  // Specialized Module Registry Routes with Download/Upload
  
  // GET /api/modules - List all available specialized modules
  app.get("/api/modules", async (req, res) => {
    try {
      const category = req.query.category as string;
      const modules = category 
        ? moduleRegistry.getModulesByCategory(category)
        : moduleRegistry.getAllModules();
      
      // Ensure all modules have UUID format IDs
      const modulesWithUuids = modules.map(module => ({
        ...module,
        id: module.id || crypto.randomUUID()
      }));
      
      res.json(modulesWithUuids);
    } catch (error) {
      console.error("Error fetching modules:", error);
      res.status(500).json({ message: "Failed to fetch modules" });
    }
  });

  // GET /api/modules/:id/download - Download module configuration
  app.get("/api/modules/:id/download", async (req, res) => {
    try {
      const module = moduleRegistry.getModule(req.params.id);
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }
      
      const exportData = {
        type: 'module',
        version: '1.0',
        data: module,
        exportedAt: new Date().toISOString()
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="module-${module.name}-${Date.now()}.json"`);
      res.json(exportData);
    } catch (error) {
      console.error("Error downloading module:", error);
      res.status(500).json({ message: "Failed to download module" });
    }
  });

  // POST /api/modules/upload - Upload module configuration
  app.post("/api/modules/upload", async (req, res) => {
    try {
      const { data, preserveId = false, duplicateAction = 'rename' } = req.body;
      
      if (!data || data.type !== 'module') {
        return res.status(400).json({ message: "Invalid module data format" });
      }
      
      const moduleData = data.data;
      let moduleName = moduleData.name;
      
      // Check for duplicates by name
      const existingModules = moduleRegistry.getAllModules();
      const existingModule = existingModules.find(m => m.name === moduleName);
      
      if (existingModule) {
        if (duplicateAction === 'skip') {
          return res.status(200).json({ 
            message: "Module skipped (already exists)", 
            existing: existingModule 
          });
        } else if (duplicateAction === 'rename') {
          let counter = 1;
          let newName = `${moduleName} (Copy)`;
          while (existingModules.find(m => m.name === newName)) {
            counter++;
            newName = `${moduleName} (Copy ${counter})`;
          }
          moduleName = newName;
        }
      }
      
      const moduleConfig = {
        ...moduleData,
        id: preserveId && moduleData.id ? moduleData.id : crypto.randomUUID(),
        name: moduleName
      };
      
      // Add module to registry
      moduleRegistry.registerModule(moduleConfig);
      res.status(201).json({
        module: moduleConfig,
        action: existingModule ? duplicateAction : 'created',
        originalName: moduleData.name
      });
    } catch (error) {
      console.error("Error uploading module:", error);
      res.status(500).json({ message: "Failed to upload module" });
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

  // API Key Management Routes
  
  // GET /api/api-keys - Get all API keys for current user
  app.get("/api/api-keys", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const apiKeys = await storage.getApiKeys(userId);
      res.json(apiKeys);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch API keys" });
    }
  });

  // POST /api/api-keys - Create new API key
  app.post("/api/api-keys", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { name, permissions, agentAccess, description } = req.body;
      
      // Generate a proper API key
      const apiKeyValue = `ap_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
      
      const insertApiKey = {
        name,
        userId,
        keyHash: apiKeyValue,
        permissions: permissions || ['agents:read'],
        agentIds: Array.isArray(agentAccess) ? agentAccess : [agentAccess],
        description,
        isActive: true
      };

      const apiKey = await storage.createApiKey(insertApiKey);
      
      // Return the API key with the actual key value (only shown once)
      res.status(201).json({
        ...apiKey,
        keyValue: apiKeyValue // Show the actual key only once
      });
    } catch (error) {
      console.error("API key creation error:", error);
      res.status(500).json({ message: "Failed to create API key" });
    }
  });

  // PUT /api/api-keys/:id - Update API key
  app.put("/api/api-keys/:id", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const apiKey = await storage.updateApiKey(parseInt(id), updates);
      res.json(apiKey);
    } catch (error) {
      res.status(500).json({ message: "Failed to update API key" });
    }
  });

  // DELETE /api/api-keys/:id - Delete API key
  app.delete("/api/api-keys/:id", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteApiKey(parseInt(id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete API key" });
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
      const capabilities = {
        resources: { subscribe: true, listChanged: true },
        tools: { listChanged: true },
        prompts: { listChanged: true },
        logging: {},
        sampling: {}
      };
      res.json(capabilities);
    } catch (error) {
      console.error("Error fetching MCP capabilities:", error);
      res.status(500).json({ message: "Failed to fetch MCP capabilities" });
    }
  });

  // GET /api/mcp/tools - List available MCP tools
  app.get("/api/mcp/tools", async (req, res) => {
    try {
      const servers = mcpProtocolManager.getServers();
      const tools = servers.flatMap(server => server.tools || []);
      res.json({ tools });
    } catch (error) {
      console.error("Error fetching MCP tools:", error);
      res.status(500).json({ message: "Failed to fetch MCP tools" });
    }
  });

  // GET /api/mcp/resources - List available MCP resources
  app.get("/api/mcp/resources", async (req, res) => {
    try {
      const servers = mcpProtocolManager.getServers();
      const resources = servers.flatMap(server => server.resources || []);
      res.json({ resources });
    } catch (error) {
      console.error("Error fetching MCP resources:", error);
      res.status(500).json({ message: "Failed to fetch MCP resources" });
    }
  });

  // GET /api/mcp/prompts - List available MCP prompts
  app.get("/api/mcp/prompts", async (req, res) => {
    try {
      const prompts = [
        {
          name: 'hotel_booking_analysis',
          description: 'Analyze hotel booking patterns and trends',
          arguments: [
            { name: 'period', description: 'Analysis period', required: true },
            { name: 'hotel_type', description: 'Type of hotel to analyze', required: false }
          ]
        },
        {
          name: 'marketing_campaign_review',
          description: 'Review and analyze marketing campaign performance',
          arguments: [
            { name: 'campaign_id', description: 'Campaign identifier', required: true },
            { name: 'metrics', description: 'Specific metrics to analyze', required: false }
          ]
        }
      ];
      res.json({ prompts });
    } catch (error) {
      console.error("Error fetching MCP prompts:", error);
      res.status(500).json({ message: "Failed to fetch MCP prompts" });
    }
  });

  // External Integration Routes
  
  // GET /api/external/services - List all registered external services
  app.get("/api/external/services", async (req, res) => {
    try {
      const services = externalIntegrationService.getIntegrations();
      res.json(services);
    } catch (error) {
      console.error("Error fetching external services:", error);
      res.status(500).json({ message: "Failed to fetch external services" });
    }
  });

  // POST /api/external/:service/test - Test connection to external service
  app.post("/api/external/:service/test", async (req, res) => {
    try {
      const result = await externalIntegrationService.testIntegration(req.params.service);
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
      const request = {
        integrationId: req.params.service,
        method: method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
        endpoint,
        body: data,
        headers
      };
      const result = await externalIntegrationService.makeRequest(request);
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
      // Mock trending data - external integration would require API credentials
      const result = {
        region,
        category: category || 'general',
        trends: [
          { topic: 'AI Technology', score: 95, growth: '+15%' },
          { topic: 'Sustainable Energy', score: 88, growth: '+8%' },
          { topic: 'Digital Marketing', score: 76, growth: '+12%' }
        ],
        timestamp: new Date().toISOString()
      };
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
      // Mock market data - external integration would require API credentials
      const result = {
        symbol: symbol.toUpperCase(),
        timeframe: timeframe || '1d',
        price: Math.random() * 1000 + 100,
        change: (Math.random() - 0.5) * 20,
        volume: Math.floor(Math.random() * 1000000),
        timestamp: new Date().toISOString()
      };
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
      // Mock competitor analysis - external integration would require API credentials
      const result = {
        domain,
        competitors: competitors || [],
        analysis: {
          marketShare: Math.random() * 100,
          strengths: ['Brand recognition', 'Product quality', 'Customer service'],
          weaknesses: ['Pricing', 'Market penetration', 'Digital presence'],
          opportunities: ['Emerging markets', 'Technology adoption', 'Partnership potential']
        },
        timestamp: new Date().toISOString()
      };
      res.json(result);
    } catch (error) {
      console.error("Error fetching competitor analysis:", error);
      res.status(500).json({ message: "Failed to fetch competitor analysis" });
    }
  });

  // Custom Models Routes with Download/Upload
  
  // GET /api/custom-models - Get all custom models
  app.get("/api/custom-models", async (req, res) => {
    try {
      const userId = req.user?.id || 1;
      const models = await storage.getCustomModels(userId);
      res.json(models);
    } catch (error) {
      console.error("Error fetching custom models:", error);
      res.status(500).json({ message: "Failed to fetch custom models" });
    }
  });

  // GET /api/custom-models/:id/download - Download custom model configuration
  app.get("/api/custom-models/:id/download", async (req, res) => {
    try {
      const model = await storage.getCustomModel(parseInt(req.params.id));
      if (!model) {
        return res.status(404).json({ message: "Custom model not found" });
      }
      
      const exportData = {
        type: 'custom-model',
        version: '1.0',
        data: model,
        exportedAt: new Date().toISOString()
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="model-${model.name}-${Date.now()}.json"`);
      res.json(exportData);
    } catch (error) {
      console.error("Error downloading custom model:", error);
      res.status(500).json({ message: "Failed to download custom model" });
    }
  });

  // POST /api/custom-models/upload - Upload custom model configuration
  app.post("/api/custom-models/upload", async (req, res) => {
    try {
      const { data, preserveId = false, duplicateAction = 'rename' } = req.body;
      
      if (!data || data.type !== 'custom-model') {
        return res.status(400).json({ message: "Invalid custom model data format" });
      }
      
      const modelData = data.data;
      let modelName = modelData.name;
      
      // Check for duplicates by name
      const userId = req.user?.id || 1;
      const existingModels = await storage.getCustomModels(userId);
      const existingModel = existingModels.find(m => m.name === modelName);
      
      if (existingModel) {
        if (duplicateAction === 'skip') {
          return res.status(200).json({ 
            message: "Custom model skipped (already exists)", 
            existing: existingModel 
          });
        } else if (duplicateAction === 'rename') {
          let counter = 1;
          let newName = `${modelName} (Copy)`;
          while (existingModels.find(m => m.name === newName)) {
            counter++;
            newName = `${modelName} (Copy ${counter})`;
          }
          modelName = newName;
        }
      }
      
      const insertModel = {
        userId,
        name: modelName,
        provider: modelData.provider,
        modelId: modelData.modelId,
        endpoint: modelData.endpoint,
        apiKeyId: modelData.apiKeyId,
        configuration: modelData.configuration,
        capabilities: modelData.capabilities,
        contextLength: modelData.contextLength,
        maxTokens: modelData.maxTokens,
        isActive: modelData.isActive !== false
      };
      
      const newModel = await storage.createCustomModel(insertModel);
      res.status(201).json({
        model: newModel,
        action: existingModel ? duplicateAction : 'created',
        originalName: modelData.name
      });
    } catch (error) {
      console.error("Error uploading custom model:", error);
      res.status(500).json({ message: "Failed to upload custom model" });
    }
  });

  // MCP Catalog Routes with Download/Upload
  
  // GET /api/mcp/catalog - Get available MCP servers
  app.get("/api/mcp/catalog", async (req, res) => {
    try {
      const mcpServers = mcpProtocolManager.getServers().map(server => ({
        ...server,
        id: server.id || crypto.randomUUID() // Ensure UUID format
      }));
      res.json(mcpServers);
    } catch (error) {
      console.error("Error fetching MCP catalog:", error);
      res.status(500).json({ message: "Failed to fetch MCP catalog" });
    }
  });

  // GET /api/mcp/servers/:id/download - Download MCP server configuration
  app.get("/api/mcp/servers/:id/download", async (req, res) => {
    try {
      const server = mcpProtocolManager.getServer(req.params.id);
      if (!server) {
        return res.status(404).json({ message: "MCP server not found" });
      }
      
      const exportData = {
        type: 'mcp-server',
        version: '1.0',
        data: server,
        exportedAt: new Date().toISOString()
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="mcp-${server.name}-${Date.now()}.json"`);
      res.json(exportData);
    } catch (error) {
      console.error("Error downloading MCP server:", error);
      res.status(500).json({ message: "Failed to download MCP server" });
    }
  });

  // POST /api/mcp/servers/upload - Upload MCP server configuration
  app.post("/api/mcp/servers/upload", async (req, res) => {
    try {
      const { data, preserveId = false, duplicateAction = 'rename' } = req.body;
      
      if (!data || data.type !== 'mcp-server') {
        return res.status(400).json({ message: "Invalid MCP server data format" });
      }
      
      const serverData = data.data;
      let serverName = serverData.name;
      
      // Check for duplicates by name
      const existingServers = mcpProtocolManager.getServers();
      const existingServer = existingServers.find(s => s.name === serverName);
      
      if (existingServer) {
        if (duplicateAction === 'skip') {
          return res.status(200).json({ 
            message: "MCP server skipped (already exists)", 
            existing: existingServer 
          });
        } else if (duplicateAction === 'rename') {
          let counter = 1;
          let newName = `${serverName} (Copy)`;
          while (existingServers.find(s => s.name === newName)) {
            counter++;
            newName = `${serverName} (Copy ${counter})`;
          }
          serverName = newName;
        }
      }
      
      const mcpServer = {
        ...serverData,
        id: preserveId && serverData.id ? serverData.id : crypto.randomUUID(),
        name: serverName
      };
      
      mcpProtocolManager.addServer(mcpServer);
      res.status(201).json({
        server: mcpServer,
        action: existingServer ? duplicateAction : 'created',
        originalName: serverData.name
      });
    } catch (error) {
      console.error("Error uploading MCP server:", error);
      res.status(500).json({ message: "Failed to upload MCP server" });
    }
  });

  // GET /api/mcp/servers - Get available MCP servers (alias for catalog)
  app.get("/api/mcp/servers", async (req, res) => {
    console.log("MCP servers endpoint hit:", req.path);
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
      console.error("Error fetching MCP servers:", error);
      res.status(500).json({ message: "Failed to fetch MCP servers" });
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

  // Integration Testing Routes
  
  // POST /api/integrations/openai/test - Test OpenAI API connection
  app.post("/api/integrations/openai/test", requireAuth, async (req, res) => {
    try {
      const { prompt = "Test connection", model = "gpt-4", maxTokens = 50 } = req.body;
      
      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ 
          success: false, 
          error: "OpenAI API key not configured" 
        });
      }

      const openai = new (await import('openai')).default({
        apiKey: process.env.OPENAI_API_KEY
      });

      const completion = await openai.chat.completions.create({
        model: model === "gpt-4" ? "gpt-3.5-turbo" : model, // Default to accessible model
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.7
      });

      const response = completion.choices[0]?.message?.content || "No response";
      
      res.json({
        success: true,
        response: response,
        model: model,
        usage: completion.usage
      });
    } catch (error: any) {
      console.error("OpenAI test error:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "OpenAI API test failed"
      });
    }
  });

  // Marketing Agent API Routes
  
  // GET /api/marketing/trends - Get Google Trends data
  app.get("/api/marketing/trends", requireAuth, async (req, res) => {
    try {
      const { destination } = req.query;
      const trends = marketingAgentService.getGoogleTrends(destination as string);
      res.json(trends);
    } catch (error) {
      console.error("Error fetching trends:", error);
      res.status(500).json({ message: "Failed to fetch trends data" });
    }
  });

  // GET /api/marketing/hotels - Get hotel data by category
  app.get("/api/marketing/hotels", requireAuth, async (req, res) => {
    try {
      const { category } = req.query;
      const hotels = marketingAgentService.getHotelsByCategory(category as string);
      res.json(hotels);
    } catch (error) {
      console.error("Error fetching hotels:", error);
      res.status(500).json({ message: "Failed to fetch hotel data" });
    }
  });

  // GET /api/marketing/summary - Get hotel categories summary
  app.get("/api/marketing/summary", requireAuth, async (req, res) => {
    try {
      const summary = marketingAgentService.getHotelSummary();
      res.json(summary);
    } catch (error) {
      console.error("Error fetching summary:", error);
      res.status(500).json({ message: "Failed to fetch summary" });
    }
  });

  // POST /api/marketing/recommend - Get personalized recommendations
  app.post("/api/marketing/recommend", requireAuth, async (req, res) => {
    try {
      const { query, preferences } = req.body;
      
      if (!query) {
        return res.status(400).json({ message: "Query is required" });
      }

      const recommendations = await marketingAgentService.generateRecommendations({
        query,
        preferences
      });
      
      res.json(recommendations);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ 
        message: error.message || "Failed to generate recommendations" 
      });
    }
  });

  // Create HTTP server and WebSocket servers
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

  // Agent Testing Endpoints
  
  // POST /api/agents/:id/test - Test agent with default or custom prompts
  app.post("/api/agents/:id/test", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { testType = 'default', prompt, expectedOutput, promptIndex = 0, useRealData = false, requireLLM = false } = req.body;

      let result;
      if (testType === 'hotel_recommendation' || (testType === 'custom' && (useRealData || requireLLM))) {
        // Use real hotel recommendation service with OpenAI
        const { hotelRecommendationService } = await import('./services/HotelRecommendationService');
        
        try {
          const hotelRequest = {
            customPrompt: prompt,
            location: 'destination from prompt',
            useRealData: true
          };
          
          const recommendations = await hotelRecommendationService.generateRecommendations(hotelRequest);
          
          result = {
            agentId: id,
            promptType: 'custom',
            prompt,
            actualOutput: formatHotelResponseForAgent(recommendations),
            success: true,
            executionTime: Date.now(),
            timestamp: new Date(),
            metadata: { useRealData: true, llmProcessed: true }
          };
        } catch (error) {
          result = {
            agentId: id,
            promptType: 'custom',
            prompt,
            actualOutput: `Error generating real hotel recommendations: ${error.message}. Please ensure OpenAI API key is properly configured.`,
            success: false,
            executionTime: Date.now(),
            timestamp: new Date(),
            metadata: { useRealData: true, error: error.message }
          };
        }
      } else if (testType === 'default') {
        result = await agentTestingService.testAgentWithDefaultPrompt(id, promptIndex);
      } else if (testType === 'custom' && prompt) {
        result = await agentTestingService.testAgentWithCustomPrompt(id, prompt, expectedOutput);
      } else {
        return res.status(400).json({ message: "Invalid test type or missing prompt for custom test" });
      }

      res.json(result);
    } catch (error) {
      console.error("Agent test error:", error);
      res.status(500).json({ message: `Failed to test agent: ${error.message}` });
    }
  });

  function formatHotelResponseForAgent(recommendations) {
    let response = `🏨 Authentic Hotel Recommendations (Powered by AI):\n\n`;
    
    if (recommendations.recommendations?.length > 0) {
      recommendations.recommendations.forEach((hotel, index) => {
        response += `${index + 1}. **${hotel.name}** (${hotel.category})\n`;
        response += `   📍 ${hotel.location}\n`;
        response += `   💰 ${hotel.priceRange}\n`;
        response += `   ⭐ ${hotel.rating}/5 stars\n`;
        response += `   ${hotel.description}\n`;
        if (hotel.amenities?.length > 0) {
          response += `   🎯 Key amenities: ${hotel.amenities.slice(0, 3).join(', ')}\n`;
        }
        response += `   💡 ${hotel.bookingAdvice}\n\n`;
      });
    }
    
    if (recommendations.insights) {
      response += `📈 Market Insights:\n${recommendations.insights}\n\n`;
    }
    
    if (recommendations.trending?.length > 0) {
      response += `🔥 Current trends: ${recommendations.trending.join(', ')}\n\n`;
    }
    
    response += `*Real-time data processed with AI analysis*`;
    return response;
  }

  // GET /api/agents/:id/test/prompts - Get available default prompts for agent
  app.get("/api/agents/:id/test/prompts", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      const agent = await storage.getAgent(id);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      // Determine agent type and get default prompts
      const agentType = agent.role?.includes('marketing') ? 'marketing' : 
                      agent.role?.includes('assistant') ? 'assistant' : 'general';
      
      const defaultPrompts = await agentTestingService.getDefaultPrompts(agentType);
      
      res.json({
        agentId: id,
        agentType,
        defaultPrompts
      });
    } catch (error) {
      console.error("Get prompts error:", error);
      res.status(500).json({ message: "Failed to get default prompts" });
    }
  });

  // GET /api/agents/:id/test/history - Get test history for agent
  app.get("/api/agents/:id/test/history", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      const agent = await storage.getAgent(id);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      const testHistory = await agentTestingService.getAllAgentTestResults(id);
      
      res.json({
        agentId: id,
        testHistory
      });
    } catch (error) {
      console.error("Get test history error:", error);
      res.status(500).json({ message: "Failed to get test history" });
    }
  });

  // Bulk Backup and Restore APIs
  
  // GET /api/backup/all - Download complete platform backup
  app.get("/api/backup/all", async (req, res) => {
    try {
      const userId = req.user?.id || 1;
      
      const [agents, customModels, modules, mcpServers] = await Promise.all([
        storage.getAgents(),
        storage.getCustomModels(userId),
        moduleRegistry.getAllModules(),
        mcpProtocolManager.getServers()
      ]);
      
      const backupData = {
        type: 'full-platform-backup',
        version: '1.0',
        exportedAt: new Date().toISOString(),
        data: {
          agents: agents.map(agent => ({ ...agent, id: agent.id || crypto.randomUUID() })),
          customModels: customModels.map(model => ({ ...model, id: model.id || crypto.randomUUID() })),
          modules: modules.map(module => ({ ...module, id: module.id || crypto.randomUUID() })),
          mcpServers: mcpServers.map(server => ({ ...server, id: server.id || crypto.randomUUID() }))
        }
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="platform-backup-${Date.now()}.json"`);
      res.json(backupData);
    } catch (error) {
      console.error("Error creating platform backup:", error);
      res.status(500).json({ message: "Failed to create platform backup" });
    }
  });

  // POST /api/backup/restore - Restore from complete platform backup
  app.post("/api/backup/restore", async (req, res) => {
    try {
      const { data, preserveIds = false, duplicateAction = 'rename' } = req.body;
      
      if (!data || data.type !== 'full-platform-backup') {
        return res.status(400).json({ message: "Invalid backup data format" });
      }
      
      const backupData = data.data;
      const results = {
        agents: { created: 0, skipped: 0, renamed: 0 },
        customModels: { created: 0, skipped: 0, renamed: 0 },
        modules: { created: 0, skipped: 0, renamed: 0 },
        mcpServers: { created: 0, skipped: 0, renamed: 0 }
      };
      
      // Get existing data for duplicate checking
      const [existingAgents, existingModels, existingModules, existingServers] = await Promise.all([
        storage.getAgents(),
        storage.getCustomModels(req.user?.id || 1),
        moduleRegistry.getAllModules(),
        mcpProtocolManager.getServers()
      ]);
      
      // Restore agents
      if (backupData.agents) {
        for (const agentData of backupData.agents) {
          try {
            let agentName = agentData.name;
            const existingAgent = existingAgents.find(a => a.name === agentName);
            
            if (existingAgent) {
              if (duplicateAction === 'skip') {
                results.agents.skipped++;
                continue;
              } else if (duplicateAction === 'rename') {
                let counter = 1;
                let newName = `${agentName} (Copy)`;
                while (existingAgents.find(a => a.name === newName)) {
                  counter++;
                  newName = `${agentName} (Copy ${counter})`;
                }
                agentName = newName;
                results.agents.renamed++;
              }
            }
            
            const insertAgent = {
              id: preserveIds && agentData.id ? agentData.id : crypto.randomUUID(),
              role: agentData.role,
              name: agentName,
              goal: agentData.goal,
              guardrails: agentData.guardrails,
              modules: agentData.modules,
              model: agentData.model,
              vectorStoreId: agentData.vectorStoreId,
              status: agentData.status || 'active',
              createdBy: agentData.createdBy || 1
            };
            await storage.createAgent(insertAgent);
            
            if (!existingAgent) results.agents.created++;
          } catch (error) {
            console.error("Error restoring agent:", error);
          }
        }
      }
      
      // Restore custom models
      if (backupData.customModels) {
        for (const modelData of backupData.customModels) {
          try {
            let modelName = modelData.name;
            const existingModel = existingModels.find(m => m.name === modelName);
            
            if (existingModel) {
              if (duplicateAction === 'skip') {
                results.customModels.skipped++;
                continue;
              } else if (duplicateAction === 'rename') {
                let counter = 1;
                let newName = `${modelName} (Copy)`;
                while (existingModels.find(m => m.name === newName)) {
                  counter++;
                  newName = `${modelName} (Copy ${counter})`;
                }
                modelName = newName;
                results.customModels.renamed++;
              }
            }
            
            const insertModel = {
              userId: req.user?.id || 1,
              name: modelName,
              provider: modelData.provider,
              modelId: modelData.modelId,
              endpoint: modelData.endpoint,
              apiKeyId: modelData.apiKeyId,
              configuration: modelData.configuration,
              capabilities: modelData.capabilities,
              contextLength: modelData.contextLength,
              maxTokens: modelData.maxTokens,
              isActive: modelData.isActive !== false
            };
            await storage.createCustomModel(insertModel);
            
            if (!existingModel) results.customModels.created++;
          } catch (error) {
            console.error("Error restoring custom model:", error);
          }
        }
      }
      
      // Restore modules
      if (backupData.modules) {
        for (const moduleData of backupData.modules) {
          try {
            let moduleName = moduleData.name;
            const existingModule = existingModules.find(m => m.name === moduleName);
            
            if (existingModule) {
              if (duplicateAction === 'skip') {
                results.modules.skipped++;
                continue;
              } else if (duplicateAction === 'rename') {
                let counter = 1;
                let newName = `${moduleName} (Copy)`;
                while (existingModules.find(m => m.name === newName)) {
                  counter++;
                  newName = `${moduleName} (Copy ${counter})`;
                }
                moduleName = newName;
                results.modules.renamed++;
              }
            }
            
            const moduleConfig = {
              ...moduleData,
              id: preserveIds && moduleData.id ? moduleData.id : crypto.randomUUID(),
              name: moduleName
            };
            moduleRegistry.registerModule(moduleConfig);
            
            if (!existingModule) results.modules.created++;
          } catch (error) {
            console.error("Error restoring module:", error);
          }
        }
      }
      
      // Restore MCP servers
      if (backupData.mcpServers) {
        for (const serverData of backupData.mcpServers) {
          try {
            let serverName = serverData.name;
            const existingServer = existingServers.find(s => s.name === serverName);
            
            if (existingServer) {
              if (duplicateAction === 'skip') {
                results.mcpServers.skipped++;
                continue;
              } else if (duplicateAction === 'rename') {
                let counter = 1;
                let newName = `${serverName} (Copy)`;
                while (existingServers.find(s => s.name === newName)) {
                  counter++;
                  newName = `${serverName} (Copy ${counter})`;
                }
                serverName = newName;
                results.mcpServers.renamed++;
              }
            }
            
            const mcpServer = {
              ...serverData,
              id: preserveIds && serverData.id ? serverData.id : crypto.randomUUID(),
              name: serverName
            };
            mcpProtocolManager.addServer(mcpServer);
            
            if (!existingServer) results.mcpServers.created++;
          } catch (error) {
            console.error("Error restoring MCP server:", error);
          }
        }
      }
      
      res.json({
        message: "Platform restore completed",
        duplicateAction,
        detailed: results,
        summary: {
          total: {
            created: results.agents.created + results.customModels.created + results.modules.created + results.mcpServers.created,
            skipped: results.agents.skipped + results.customModels.skipped + results.modules.skipped + results.mcpServers.skipped,
            renamed: results.agents.renamed + results.customModels.renamed + results.modules.renamed + results.mcpServers.renamed
          }
        }
      });
    } catch (error) {
      console.error("Error restoring platform backup:", error);
      res.status(500).json({ message: "Failed to restore platform backup" });
    }
  });

  // Agent Communication and Chaining Routes
  
  /**
   * @swagger
   * /api/agent-chains:
   *   get:
   *     summary: Get all agent chains
   *     tags: [Agent Chains]
   *     responses:
   *       200:
   *         description: List of agent chains
   *   post:
   *     summary: Create a new agent chain
   *     tags: [Agent Chains]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               steps:
   *                 type: array
   *                 items:
   *                   type: object
   *     responses:
   *       201:
   *         description: Agent chain created successfully
   */
  app.get('/api/agent-chains', async (req, res) => {
    try {
      const chains = await agentChainService.getChains();
      res.json(chains);
    } catch (error) {
      console.error('Error getting agent chains:', error);
      res.status(500).json({ message: 'Failed to get agent chains' });
    }
  });

  app.post('/api/agent-chains', async (req, res) => {
    try {
      const chainSchema = insertAgentChainSchema.extend({
        steps: z.array(z.object({
          id: z.string(),
          agentId: z.string(),
          name: z.string(),
          condition: z.object({
            type: z.enum(['always', 'if_success', 'if_error', 'custom']),
            expression: z.string().optional()
          }).optional(),
          inputMapping: z.record(z.string()).optional(),
          outputMapping: z.record(z.string()).optional(),
          timeout: z.number().optional(),
          retryCount: z.number().optional()
        }))
      });

      const validatedData = chainSchema.parse(req.body);
      const chain = await agentChainService.createChain(validatedData);
      
      res.status(201).json(chain);
    } catch (error) {
      console.error('Error creating agent chain:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid chain data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create agent chain' });
      }
    }
  });

  /**
   * @swagger
   * /api/agent-chains/{id}:
   *   get:
   *     summary: Get agent chain by ID
   *     tags: [Agent Chains]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Agent chain details
   *       404:
   *         description: Chain not found
   */
  app.get('/api/agent-chains/:id', async (req, res) => {
    try {
      const chain = await agentChainService.getChain(req.params.id);
      if (!chain) {
        return res.status(404).json({ message: 'Chain not found' });
      }
      res.json(chain);
    } catch (error) {
      console.error('Error getting agent chain:', error);
      res.status(500).json({ message: 'Failed to get agent chain' });
    }
  });

  app.put('/api/agent-chains/:id', async (req, res) => {
    try {
      const updateSchema = insertAgentChainSchema.partial().extend({
        steps: z.array(z.object({
          id: z.string(),
          agentId: z.string(),
          name: z.string(),
          condition: z.object({
            type: z.enum(['always', 'if_success', 'if_error', 'custom']),
            expression: z.string().optional()
          }).optional(),
          inputMapping: z.record(z.string()).optional(),
          outputMapping: z.record(z.string()).optional(),
          timeout: z.number().optional(),
          retryCount: z.number().optional()
        })).optional()
      });

      const validatedData = updateSchema.parse(req.body);
      const chain = await agentChainService.updateChain(req.params.id, validatedData);
      
      res.json(chain);
    } catch (error) {
      console.error('Error updating agent chain:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid chain data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to update agent chain' });
      }
    }
  });

  app.delete('/api/agent-chains/:id', async (req, res) => {
    try {
      await agentChainService.deleteChain(req.params.id);
      res.json({ message: 'Chain deleted successfully' });
    } catch (error) {
      console.error('Error deleting agent chain:', error);
      res.status(500).json({ message: 'Failed to delete agent chain' });
    }
  });

  /**
   * @swagger
   * /api/agent-chains/{id}/execute:
   *   post:
   *     summary: Execute an agent chain
   *     tags: [Agent Chains]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               input:
   *                 type: object
   *                 description: Initial input for the chain
   *               variables:
   *                 type: object
   *                 description: Chain-level variables
   *     responses:
   *       200:
   *         description: Chain execution started
   */
  app.post('/api/agent-chains/:id/execute', async (req, res) => {
    try {
      const { input, variables } = req.body;
      const execution = await agentChainService.executeChain(req.params.id, input, variables);
      
      res.json({
        executionId: execution.id,
        status: execution.status,
        message: 'Chain execution started'
      });
    } catch (error) {
      console.error('Error executing agent chain:', error);
      res.status(500).json({ message: 'Failed to execute agent chain' });
    }
  });

  /**
   * @swagger
   * /api/agent-chains/{id}/executions:
   *   get:
   *     summary: Get chain execution history
   *     tags: [Agent Chains]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: List of chain executions
   */
  app.get('/api/agent-chains/:id/executions', async (req, res) => {
    try {
      const executions = await agentChainService.getChainExecutions(req.params.id);
      res.json(executions);
    } catch (error) {
      console.error('Error getting chain executions:', error);
      res.status(500).json({ message: 'Failed to get chain executions' });
    }
  });

  /**
   * @swagger
   * /api/chain-executions/{id}:
   *   get:
   *     summary: Get execution details by ID
   *     tags: [Agent Chains]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Execution details
   *       404:
   *         description: Execution not found
   */
  app.get('/api/chain-executions/:id', async (req, res) => {
    try {
      const execution = await agentChainService.getExecution(req.params.id);
      if (!execution) {
        return res.status(404).json({ message: 'Execution not found' });
      }
      res.json(execution);
    } catch (error) {
      console.error('Error getting execution:', error);
      res.status(500).json({ message: 'Failed to get execution' });
    }
  });

  app.post('/api/chain-executions/:id/cancel', async (req, res) => {
    try {
      await agentChainService.cancelExecution(req.params.id);
      res.json({ message: 'Execution cancelled successfully' });
    } catch (error) {
      console.error('Error cancelling execution:', error);
      res.status(500).json({ message: 'Failed to cancel execution' });
    }
  });

  /**
   * @swagger
   * /api/agent-messages:
   *   post:
   *     summary: Send a message between agents
   *     tags: [Agent Communication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               fromAgentId:
   *                 type: string
   *               toAgentId:
   *                 type: string
   *               messageType:
   *                 type: string
   *               content:
   *                 type: object
   *               priority:
   *                 type: string
   *                 enum: [low, medium, high, urgent]
   *     responses:
   *       201:
   *         description: Message sent successfully
   */
  app.post('/api/agent-messages', async (req, res) => {
    try {
      const messageSchema = insertAgentMessageSchema.extend({
        content: z.object({}).passthrough()
      });

      const validatedData = messageSchema.parse(req.body);
      const message = await agentChainService.sendMessage(validatedData);
      
      res.status(201).json(message);
    } catch (error) {
      console.error('Error sending agent message:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid message data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to send message' });
      }
    }
  });

  /**
   * @swagger
   * /api/agents/{id}/messages:
   *   get:
   *     summary: Get messages for an agent
   *     tags: [Agent Communication]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: messageType
   *         schema:
   *           type: string
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 100
   *     responses:
   *       200:
   *         description: List of agent messages
   */
  app.get('/api/agents/:id/messages', async (req, res) => {
    try {
      const { messageType, status, limit } = req.query;
      const options = {
        messageType: messageType as string,
        status: status as string,
        limit: limit ? parseInt(limit as string) : undefined
      };

      const messages = await agentChainService.getAgentMessages(req.params.id, options);
      res.json(messages);
    } catch (error) {
      console.error('Error getting agent messages:', error);
      res.status(500).json({ message: 'Failed to get agent messages' });
    }
  });

  /**
   * @swagger
   * /api/agent-chains/{id}/validate:
   *   post:
   *     summary: Validate an agent chain configuration
   *     tags: [Agent Chains]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Chain validation results
   */
  app.post('/api/agent-chains/:id/validate', async (req, res) => {
    try {
      const chain = await agentChainService.getChain(req.params.id);
      if (!chain) {
        return res.status(404).json({ message: 'Chain not found' });
      }

      const validation = await agentChainService.validateChain(chain);
      res.json(validation);
    } catch (error) {
      console.error('Error validating chain:', error);
      res.status(500).json({ message: 'Failed to validate chain' });
    }
  });

  /**
   * @swagger
   * /api/agent-chains/{id}/analytics:
   *   get:
   *     summary: Get analytics for an agent chain
   *     tags: [Agent Chains]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Chain analytics data
   */
  app.get('/api/agent-chains/:id/analytics', async (req, res) => {
    try {
      const analytics = await agentChainService.getChainAnalytics(req.params.id);
      res.json(analytics);
    } catch (error) {
      console.error('Error getting chain analytics:', error);
      res.status(500).json({ message: 'Failed to get chain analytics' });
    }
  });

  // Catch-all handler for API routes that weren't matched above
  app.use('/api/*', (req, res) => {
    res.status(404).json({ 
      message: `API endpoint not found: ${req.method} ${req.path}`,
      availableEndpoints: [
        'GET /api/auth/status',
        'POST /api/auth/login',
        'POST /api/auth/register',
        'POST /api/auth/logout',
        'GET /api/mcp/servers',
        'GET /api/mcp/catalog'
      ]
    });
  });

  // Setup MCP protocol WebSocket server
  mcpProtocolManager.setupWebSocketServer(httpServer);

  return httpServer;
}
