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

  // Module Management Routes
  
  // GET /api/modules - List all available modules
  app.get("/api/modules", async (req, res) => {
    try {
      const modules = await storage.getModuleDefinitions();
      res.json(modules);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch modules" });
    }
  });

  // GET /api/modules/:id - Get specific module
  app.get("/api/modules/:id", async (req, res) => {
    try {
      const module = await storage.getModuleDefinition(req.params.id);
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }
      res.json(module);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch module" });
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

  // WebSocket for real-time updates
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

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

  return httpServer;
}
