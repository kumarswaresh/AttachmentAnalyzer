import { 
  users, agents, chatSessions, chatMessages, agentLogs, vectorCache, moduleDefinitions,
  apiKeys, agentTemplates, customModels, userSessions, agentChains, agentMessages, chainExecutions,
  agentMemory, agentResponseSchemas, executionLogs, mcpConnectors, agentApps, agentAppExecutions,
  type User, type Agent, type ChatSession, type ChatMessage, type AgentLog, type VectorCache, type ModuleDefinition,
  type ApiKey, type AgentTemplate, type CustomModel, type UserSession, type AgentChain, type AgentMessage, type ChainExecution,
  type AgentMemory, type AgentResponseSchema, type ExecutionLog, type McpConnector, type AgentApp, type AgentAppExecution,
  type InsertUser, type InsertAgent, type InsertChatSession, type InsertChatMessage, type InsertAgentLog, type InsertVectorCache,
  type InsertApiKey, type InsertAgentTemplate, type InsertCustomModel, type InsertUserSession,
  type InsertAgentChain, type InsertAgentMessage, type InsertChainExecution,
  type InsertAgentMemory, type InsertAgentResponseSchema, type InsertExecutionLog, type InsertMcpConnector,
  type InsertAgentApp, type InsertAgentAppExecution
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, sql, lte } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface IStorage {
  // Users and Authentication
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User>;
  
  // User Sessions
  createUserSession(insertSession: InsertUserSession): Promise<UserSession>;
  getUserSession(id: string): Promise<UserSession | undefined>;
  deleteUserSession(id: string): Promise<void>;
  deleteExpiredSessions(): Promise<void>;
  
  // API Keys
  getApiKeys(userId: number): Promise<ApiKey[]>;
  getApiKey(id: number): Promise<ApiKey | undefined>;
  createApiKey(insertApiKey: InsertApiKey): Promise<ApiKey>;
  updateApiKey(id: number, updates: Partial<InsertApiKey>): Promise<ApiKey>;
  deleteApiKey(id: number): Promise<void>;
  
  // Agent Templates
  getAgentTemplates(userId?: number): Promise<AgentTemplate[]>;
  getAgentTemplate(id: number): Promise<AgentTemplate | undefined>;
  createAgentTemplate(insertTemplate: InsertAgentTemplate): Promise<AgentTemplate>;
  updateAgentTemplate(id: number, updates: Partial<InsertAgentTemplate>): Promise<AgentTemplate>;
  deleteAgentTemplate(id: number): Promise<void>;
  
  // Custom Models
  getCustomModels(userId: number): Promise<CustomModel[]>;
  getCustomModel(id: number): Promise<CustomModel | undefined>;
  createCustomModel(insertModel: InsertCustomModel): Promise<CustomModel>;
  updateCustomModel(id: number, updates: Partial<InsertCustomModel>): Promise<CustomModel>;
  deleteCustomModel(id: number): Promise<void>;
  
  // Agents
  getAgents(userId?: number): Promise<Agent[]>;
  getAgent(id: string): Promise<Agent | undefined>;
  createAgent(insertAgent: InsertAgent): Promise<Agent>;
  updateAgent(id: string, updates: Partial<InsertAgent>): Promise<Agent>;
  deleteAgent(id: string): Promise<void>;
  
  // Chat Sessions
  getChatSessions(agentId?: string): Promise<ChatSession[]>;
  getChatSession(id: string): Promise<ChatSession | undefined>;
  createChatSession(insertChatSession: InsertChatSession): Promise<ChatSession>;
  
  // Chat Messages
  getChatMessages(sessionId: string): Promise<ChatMessage[]>;
  createChatMessage(insertChatMessage: InsertChatMessage): Promise<ChatMessage>;
  
  // Agent Logs
  getAgentLogs(agentId?: string, limit?: number): Promise<AgentLog[]>;
  createAgentLog(insertAgentLog: InsertAgentLog): Promise<AgentLog>;
  
  // Vector Cache
  searchVectorCache(agentId: string, embedding: number[], threshold?: number): Promise<VectorCache[]>;
  createVectorCache(insertVectorCache: InsertVectorCache): Promise<VectorCache>;
  
  // Module Definitions
  getModuleDefinitions(): Promise<ModuleDefinition[]>;
  getModuleDefinition(id: string): Promise<ModuleDefinition | undefined>;
  
  // Agent Chains
  getAgentChains(): Promise<AgentChain[]>;
  getAgentChain(id: string): Promise<AgentChain | undefined>;
  createAgentChain(insertChain: InsertAgentChain): Promise<AgentChain>;
  updateAgentChain(id: string, updates: Partial<InsertAgentChain>): Promise<AgentChain>;
  deleteAgentChain(id: string): Promise<void>;
  
  // Agent Messages
  getAgentMessages(agentId: string, options?: { messageType?: string; status?: string; limit?: number }): Promise<AgentMessage[]>;
  createAgentMessage(insertMessage: InsertAgentMessage): Promise<AgentMessage>;
  updateAgentMessage(id: string, updates: Partial<InsertAgentMessage>): Promise<AgentMessage>;
  
  // Chain Executions
  getChainExecutions(chainId: string): Promise<ChainExecution[]>;
  getChainExecution(id: string): Promise<ChainExecution | undefined>;
  createChainExecution(insertExecution: InsertChainExecution): Promise<ChainExecution>;
  updateChainExecution(id: string, updates: Partial<InsertChainExecution>): Promise<ChainExecution>;
  
  // Agent Memory (Enhanced Multi-Agent Orchestration)
  getAgentMemories(agentId: string, options?: { memoryTypes?: string[]; limit?: number }): Promise<AgentMemory[]>;
  createAgentMemory(insertMemory: InsertAgentMemory): Promise<AgentMemory>;
  updateAgentMemory(id: number, updates: Partial<InsertAgentMemory>): Promise<AgentMemory>;
  deleteAgentMemory(id: number): Promise<void>;
  
  // MCP Connectors
  getMcpConnectors(filters?: { type?: string; category?: string; isActive?: boolean; isPublic?: boolean; createdBy?: number }): Promise<McpConnector[]>;
  getMcpConnector(id: string): Promise<McpConnector | null>;
  createMcpConnector(insertConnector: InsertMcpConnector): Promise<McpConnector>;
  updateMcpConnector(id: string, updates: Partial<InsertMcpConnector>): Promise<McpConnector>;
  deleteMcpConnector(id: string): Promise<void>;
  
  // Agent Apps
  getAgentApps(filters?: { category?: string; isActive?: boolean; isPublic?: boolean; createdBy?: number }): Promise<AgentApp[]>;
  getAgentApp(id: string): Promise<AgentApp | null>;
  createAgentApp(insertApp: InsertAgentApp): Promise<AgentApp>;
  updateAgentApp(id: string, updates: Partial<InsertAgentApp>): Promise<AgentApp>;
  deleteAgentApp(id: string): Promise<void>;
  
  // Agent App Executions
  createAgentAppExecution(insertExecution: InsertAgentAppExecution): Promise<AgentAppExecution>;
  updateAgentAppExecution(id: string, updates: Partial<InsertAgentAppExecution>): Promise<AgentAppExecution>;
  
  // Execution Logs
  createExecutionLog(insertLog: InsertExecutionLog): Promise<ExecutionLog>;
  getExecutionLogs(filters?: { executionId?: string; agentId?: string; sessionId?: string; stepType?: string; logLevel?: string; startDate?: Date; endDate?: Date; limit?: number }): Promise<ExecutionLog[]>;

  // System Stats and Monitoring
  getSystemStats(): Promise<any>;
  getRecentLogs(limit?: number): Promise<AgentLog[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // User Sessions
  async createUserSession(insertSession: InsertUserSession): Promise<UserSession> {
    const [session] = await db
      .insert(userSessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async getUserSession(id: string): Promise<UserSession | undefined> {
    const [session] = await db.select().from(userSessions).where(eq(userSessions.id, id));
    return session;
  }

  async deleteUserSession(id: string): Promise<void> {
    await db.delete(userSessions).where(eq(userSessions.id, id));
  }

  async deleteExpiredSessions(): Promise<void> {
    await db.delete(userSessions).where(sql`${userSessions.expiresAt} < NOW()`);
  }

  // API Keys
  async getApiKeys(userId: number): Promise<ApiKey[]> {
    return db.select().from(apiKeys).where(eq(apiKeys.userId, userId));
  }

  async getApiKey(id: number): Promise<ApiKey | undefined> {
    const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.id, id));
    return apiKey;
  }

  async createApiKey(insertApiKey: InsertApiKey): Promise<ApiKey> {
    const [apiKey] = await db
      .insert(apiKeys)
      .values(insertApiKey)
      .returning();
    return apiKey;
  }

  async updateApiKey(id: number, updates: Partial<InsertApiKey>): Promise<ApiKey> {
    const [apiKey] = await db
      .update(apiKeys)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(apiKeys.id, id))
      .returning();
    return apiKey;
  }

  async deleteApiKey(id: number): Promise<void> {
    await db.delete(apiKeys).where(eq(apiKeys.id, id));
  }

  // Agent Templates
  async getAgentTemplates(userId?: number): Promise<AgentTemplate[]> {
    if (userId) {
      return db.select().from(agentTemplates).where(
        sql`${agentTemplates.isPublic} = true OR ${agentTemplates.createdBy} = ${userId}`
      );
    }
    return db.select().from(agentTemplates).where(eq(agentTemplates.isPublic, true));
  }

  async getAgentTemplate(id: number): Promise<AgentTemplate | undefined> {
    const [template] = await db.select().from(agentTemplates).where(eq(agentTemplates.id, id));
    return template;
  }

  async createAgentTemplate(insertTemplate: InsertAgentTemplate): Promise<AgentTemplate> {
    const [template] = await db
      .insert(agentTemplates)
      .values(insertTemplate)
      .returning();
    return template;
  }

  async updateAgentTemplate(id: number, updates: Partial<InsertAgentTemplate>): Promise<AgentTemplate> {
    const [template] = await db
      .update(agentTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(agentTemplates.id, id))
      .returning();
    return template;
  }

  async deleteAgentTemplate(id: number): Promise<void> {
    await db.delete(agentTemplates).where(eq(agentTemplates.id, id));
  }

  // Custom Models
  async getCustomModels(userId: number): Promise<CustomModel[]> {
    return db.select().from(customModels).where(eq(customModels.userId, userId));
  }

  async getCustomModel(id: number): Promise<CustomModel | undefined> {
    const [model] = await db.select().from(customModels).where(eq(customModels.id, id));
    return model;
  }

  async createCustomModel(insertModel: InsertCustomModel): Promise<CustomModel> {
    const [model] = await db
      .insert(customModels)
      .values(insertModel)
      .returning();
    return model;
  }

  async updateCustomModel(id: number, updates: Partial<InsertCustomModel>): Promise<CustomModel> {
    const [model] = await db
      .update(customModels)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(customModels.id, id))
      .returning();
    return model;
  }

  async deleteCustomModel(id: number): Promise<void> {
    await db.delete(customModels).where(eq(customModels.id, id));
  }
  
  // Agents
  async getAgents(userId?: number): Promise<Agent[]> {
    if (userId) {
      return await db.select().from(agents)
        .where(eq(agents.createdBy, userId))
        .orderBy(desc(agents.createdAt));
    }
    return await db.select().from(agents).orderBy(desc(agents.createdAt));
  }
  
  async getAgent(id: string): Promise<Agent | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.id, id));
    return agent || undefined;
  }
  
  async createAgent(insertAgent: InsertAgent): Promise<Agent> {
    const [agent] = await db
      .insert(agents)
      .values(insertAgent)
      .returning();
    return agent;
  }
  
  async updateAgent(id: string, updates: Partial<InsertAgent>): Promise<Agent> {
    const [agent] = await db
      .update(agents)
      .set(updates)
      .where(eq(agents.id, id))
      .returning();
    return agent;
  }
  
  async deleteAgent(id: string): Promise<void> {
    await db.delete(agents).where(eq(agents.id, id));
  }
  
  // Chat Sessions
  async getChatSessions(agentId?: string): Promise<ChatSession[]> {
    if (agentId) {
      return await db.select().from(chatSessions)
        .where(eq(chatSessions.agentId, agentId))
        .orderBy(desc(chatSessions.createdAt));
    }
    return await db.select().from(chatSessions).orderBy(desc(chatSessions.createdAt));
  }
  
  async getChatSession(id: string): Promise<ChatSession | undefined> {
    const [session] = await db.select().from(chatSessions).where(eq(chatSessions.id, id));
    return session || undefined;
  }
  
  async createChatSession(insertChatSession: InsertChatSession): Promise<ChatSession> {
    const [session] = await db
      .insert(chatSessions)
      .values(insertChatSession)
      .returning();
    return session;
  }
  
  // Chat Messages
  async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
    return await db.select().from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.timestamp);
  }
  
  async createChatMessage(insertChatMessage: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db
      .insert(chatMessages)
      .values(insertChatMessage)
      .returning();
    return message;
  }
  
  // Agent Logs
  async getAgentLogs(agentId?: string, limit = 100): Promise<AgentLog[]> {
    let query = db.select().from(agentLogs);
    
    if (agentId) {
      query = query.where(eq(agentLogs.agentId, agentId));
    }
    
    return await query
      .orderBy(desc(agentLogs.timestamp))
      .limit(limit);
  }
  
  async createAgentLog(insertAgentLog: InsertAgentLog): Promise<AgentLog> {
    const [log] = await db
      .insert(agentLogs)
      .values(insertAgentLog)
      .returning();
    return log;
  }
  
  // Vector Cache
  async searchVectorCache(agentId: string, embedding: number[], threshold = 0.9): Promise<VectorCache[]> {
    // Note: This is a simplified version. In production, you'd use proper vector similarity search
    return await db.select().from(vectorCache)
      .where(eq(vectorCache.agentId, agentId))
      .limit(10);
  }
  
  async createVectorCache(insertVectorCache: InsertVectorCache): Promise<VectorCache> {
    const [cache] = await db
      .insert(vectorCache)
      .values(insertVectorCache)
      .returning();
    return cache;
  }
  
  // Module Definitions
  async getModuleDefinitions(): Promise<ModuleDefinition[]> {
    return await db.select().from(moduleDefinitions).orderBy(moduleDefinitions.name);
  }
  
  async getModuleDefinition(id: string): Promise<ModuleDefinition | undefined> {
    const [module] = await db.select().from(moduleDefinitions).where(eq(moduleDefinitions.id, id));
    return module || undefined;
  }
  
  // System Stats and Monitoring
  async getSystemStats(): Promise<any> {
    try {
      const [agentCount] = await db.select({ count: sql<number>`count(*)` }).from(agents);
      const [sessionCount] = await db.select({ count: sql<number>`count(*)` }).from(chatSessions);
      const [messageCount] = await db.select({ count: sql<number>`count(*)` }).from(chatMessages);
      const [logCount] = await db.select({ count: sql<number>`count(*)` }).from(agentLogs);
      
      return {
        totalAgents: agentCount.count,
        totalSessions: sessionCount.count,
        totalMessages: messageCount.count,
        totalLogs: logCount.count,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      };
    } catch (error) {
      return {
        totalAgents: 0,
        totalSessions: 0,
        totalMessages: 0,
        totalLogs: 0,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      };
    }
  }
  
  async getRecentLogs(limit = 50): Promise<AgentLog[]> {
    return await this.getAgentLogs(undefined, limit);
  }

  // Agent Chains
  async getAgentChains(): Promise<AgentChain[]> {
    return await db.select().from(agentChains)
      .orderBy(desc(agentChains.createdAt));
  }

  async getAgentChain(id: string): Promise<AgentChain | undefined> {
    const [chain] = await db.select().from(agentChains)
      .where(eq(agentChains.id, id));
    return chain;
  }

  async createAgentChain(insertChain: InsertAgentChain): Promise<AgentChain> {
    const [chain] = await db.insert(agentChains)
      .values(insertChain)
      .returning();
    return chain;
  }

  async updateAgentChain(id: string, updates: Partial<InsertAgentChain>): Promise<AgentChain> {
    const [chain] = await db.update(agentChains)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(agentChains.id, id))
      .returning();
    return chain;
  }

  async deleteAgentChain(id: string): Promise<void> {
    await db.delete(agentChains)
      .where(eq(agentChains.id, id));
  }

  // Agent Messages
  async getAgentMessages(agentId: string, options: { messageType?: string; status?: string; limit?: number } = {}): Promise<AgentMessage[]> {
    const { messageType, status, limit = 100 } = options;
    
    let query = db.select().from(agentMessages)
      .where(eq(agentMessages.toAgentId, agentId));

    if (messageType) {
      query = query.where(eq(agentMessages.messageType, messageType));
    }

    if (status) {
      query = query.where(eq(agentMessages.status, status));
    }

    return await query
      .orderBy(desc(agentMessages.timestamp))
      .limit(limit);
  }

  async createAgentMessage(insertMessage: InsertAgentMessage): Promise<AgentMessage> {
    const [message] = await db.insert(agentMessages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async updateAgentMessage(id: string, updates: Partial<InsertAgentMessage>): Promise<AgentMessage> {
    const [message] = await db.update(agentMessages)
      .set(updates)
      .where(eq(agentMessages.id, id))
      .returning();
    return message;
  }

  // Chain Executions
  async getChainExecutions(chainId: string): Promise<ChainExecution[]> {
    return await db.select().from(chainExecutions)
      .where(eq(chainExecutions.chainId, chainId))
      .orderBy(desc(chainExecutions.startedAt));
  }

  async getChainExecution(id: string): Promise<ChainExecution | undefined> {
    const [execution] = await db.select().from(chainExecutions)
      .where(eq(chainExecutions.id, id));
    return execution;
  }

  async createChainExecution(insertExecution: InsertChainExecution): Promise<ChainExecution> {
    const [execution] = await db.insert(chainExecutions)
      .values(insertExecution)
      .returning();
    return execution;
  }

  async updateChainExecution(id: string, updates: Partial<InsertChainExecution>): Promise<ChainExecution> {
    const [execution] = await db.update(chainExecutions)
      .set(updates)
      .where(eq(chainExecutions.id, id))
      .returning();
    return execution;
  }

  // Agent Memory Operations
  async getAgentMemories(agentId: string, options: { memoryTypes?: string[]; limit?: number } = {}): Promise<AgentMemory[]> {
    let query = db.select().from(agentMemory).where(eq(agentMemory.agentId, agentId));
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    return await query.orderBy(desc(agentMemory.createdAt));
  }

  async createAgentMemory(insertMemory: InsertAgentMemory): Promise<AgentMemory> {
    const [memory] = await db.insert(agentMemory).values(insertMemory).returning();
    return memory;
  }

  async updateAgentMemory(id: number, updates: Partial<InsertAgentMemory>): Promise<AgentMemory> {
    const [memory] = await db.update(agentMemory)
      .set(updates)
      .where(eq(agentMemory.id, id))
      .returning();
    return memory;
  }

  async deleteAgentMemory(id: number): Promise<void> {
    await db.delete(agentMemory).where(eq(agentMemory.id, id));
  }

  // MCP Connector Operations
  async getMcpConnectors(filters: { type?: string; category?: string; isActive?: boolean; isPublic?: boolean; createdBy?: number } = {}): Promise<McpConnector[]> {
    let query = db.select().from(mcpConnectors);
    
    const conditions = [];
    if (filters.type) conditions.push(eq(mcpConnectors.type, filters.type));
    if (filters.category) conditions.push(eq(mcpConnectors.category, filters.category));
    if (filters.isActive !== undefined) conditions.push(eq(mcpConnectors.isActive, filters.isActive));
    if (filters.isPublic !== undefined) conditions.push(eq(mcpConnectors.isPublic, filters.isPublic));
    if (filters.createdBy) conditions.push(eq(mcpConnectors.createdBy, filters.createdBy));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(mcpConnectors.createdAt));
  }

  async getMcpConnector(id: string): Promise<McpConnector | null> {
    const [connector] = await db.select().from(mcpConnectors).where(eq(mcpConnectors.id, id));
    return connector || null;
  }

  async createMcpConnector(insertConnector: InsertMcpConnector): Promise<McpConnector> {
    const [connector] = await db.insert(mcpConnectors).values(insertConnector).returning();
    return connector;
  }

  async updateMcpConnector(id: string, updates: Partial<InsertMcpConnector>): Promise<McpConnector> {
    const [connector] = await db.update(mcpConnectors)
      .set(updates)
      .where(eq(mcpConnectors.id, id))
      .returning();
    return connector;
  }

  async deleteMcpConnector(id: string): Promise<void> {
    await db.delete(mcpConnectors).where(eq(mcpConnectors.id, id));
  }

  // Agent App Operations
  async getAgentApps(filters: { category?: string; isActive?: boolean; isPublic?: boolean; createdBy?: number } = {}): Promise<AgentApp[]> {
    let query = db.select().from(agentApps);
    
    const conditions = [];
    if (filters.category) conditions.push(eq(agentApps.category, filters.category));
    if (filters.isActive !== undefined) conditions.push(eq(agentApps.isActive, filters.isActive));
    if (filters.isPublic !== undefined) conditions.push(eq(agentApps.isPublic, filters.isPublic));
    if (filters.createdBy) conditions.push(eq(agentApps.createdBy, filters.createdBy));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(agentApps.createdAt));
  }

  async getAgentApp(id: string): Promise<AgentApp | null> {
    const [app] = await db.select().from(agentApps).where(eq(agentApps.id, id));
    return app || null;
  }

  async createAgentApp(insertApp: InsertAgentApp): Promise<AgentApp> {
    const [app] = await db.insert(agentApps).values(insertApp).returning();
    return app;
  }

  async updateAgentApp(id: string, updates: Partial<InsertAgentApp>): Promise<AgentApp> {
    const [app] = await db.update(agentApps)
      .set(updates)
      .where(eq(agentApps.id, id))
      .returning();
    return app;
  }

  async deleteAgentApp(id: string): Promise<void> {
    await db.delete(agentApps).where(eq(agentApps.id, id));
  }

  // Agent App Execution Operations
  async createAgentAppExecution(insertExecution: InsertAgentAppExecution): Promise<AgentAppExecution> {
    const [execution] = await db.insert(agentAppExecutions).values(insertExecution).returning();
    return execution;
  }

  async updateAgentAppExecution(id: string, updates: Partial<InsertAgentAppExecution>): Promise<AgentAppExecution> {
    const [execution] = await db.update(agentAppExecutions)
      .set(updates)
      .where(eq(agentAppExecutions.id, id))
      .returning();
    return execution;
  }

  // Execution Log Operations
  async createExecutionLog(insertLog: InsertExecutionLog): Promise<ExecutionLog> {
    const [log] = await db.insert(executionLogs).values(insertLog).returning();
    return log;
  }

  async getExecutionLogs(filters: { executionId?: string; agentId?: string; sessionId?: string; stepType?: string; logLevel?: string; startDate?: Date; endDate?: Date; limit?: number } = {}): Promise<ExecutionLog[]> {
    let query = db.select().from(executionLogs);
    
    const conditions = [];
    if (filters.executionId) conditions.push(eq(executionLogs.executionId, filters.executionId));
    if (filters.agentId) conditions.push(eq(executionLogs.agentId, filters.agentId));
    if (filters.sessionId) conditions.push(eq(executionLogs.sessionId, filters.sessionId));
    if (filters.stepType) conditions.push(eq(executionLogs.stepType, filters.stepType));
    if (filters.logLevel) conditions.push(eq(executionLogs.logLevel, filters.logLevel));
    if (filters.startDate) conditions.push(gte(executionLogs.timestamp, filters.startDate));
    if (filters.endDate) conditions.push(lte(executionLogs.timestamp, filters.endDate));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    return await query.orderBy(desc(executionLogs.createdAt));
  }

  // Agent App Builder methods
  async getAgentApps(filters: { category?: string; isActive?: boolean; isPublic?: boolean; createdBy?: number } = {}): Promise<AgentApp[]> {
    let query = db.select().from(agentApps);
    
    const conditions = [];
    if (filters.category) conditions.push(eq(agentApps.category, filters.category));
    if (filters.isActive !== undefined) conditions.push(eq(agentApps.isActive, filters.isActive));
    if (filters.isPublic !== undefined) conditions.push(eq(agentApps.isPublic, filters.isPublic));
    if (filters.createdBy) conditions.push(eq(agentApps.createdBy, filters.createdBy));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const apps = await query.orderBy(desc(agentApps.createdAt));
    return apps.map(app => ({
      ...app,
      flowDefinition: app.flowDefinition as AgentFlowNode[],
      inputSchema: app.inputSchema as object,
      outputSchema: app.outputSchema as object,
      guardrails: app.guardrails as AppGuardrail[]
    }));
  }

  async getAgentAppById(id: string): Promise<AgentApp | null> {
    const [app] = await db.select().from(agentApps).where(eq(agentApps.id, id));
    if (!app) return null;
    
    return {
      ...app,
      flowDefinition: app.flowDefinition as AgentFlowNode[],
      inputSchema: app.inputSchema as object,
      outputSchema: app.outputSchema as object,
      guardrails: app.guardrails as AppGuardrail[]
    };
  }

  async createAgentApp(appData: any): Promise<AgentApp> {
    const [app] = await db.insert(agentApps).values({
      ...appData,
      id: nanoid(),
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    return {
      ...app,
      flowDefinition: app.flowDefinition as AgentFlowNode[],
      inputSchema: app.inputSchema as object,
      outputSchema: app.outputSchema as object,
      guardrails: app.guardrails as AppGuardrail[]
    };
  }

  async updateAgentApp(id: string, updates: any): Promise<AgentApp | null> {
    const [app] = await db.update(agentApps)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(agentApps.id, id))
      .returning();
    
    if (!app) return null;
    
    return {
      ...app,
      flowDefinition: app.flowDefinition as AgentFlowNode[],
      inputSchema: app.inputSchema as object,
      outputSchema: app.outputSchema as object,
      guardrails: app.guardrails as AppGuardrail[]
    };
  }

  async deleteAgentApp(id: string): Promise<void> {
    await db.delete(agentApps).where(eq(agentApps.id, id));
  }

  // MCP Connector methods
  async getMCPConnectors(): Promise<any[]> {
    const connectors = await db.select().from(mcpConnectors);
    return connectors;
  }

  async createMCPConnector(connectorData: any): Promise<any> {
    const [connector] = await db.insert(mcpConnectors).values({
      ...connectorData,
      id: nanoid(),
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    return connector;
  }

  // Agent Communication methods
  async createAgentMessage(messageData: any): Promise<any> {
    const [message] = await db.insert(agentMessages).values({
      ...messageData,
      id: nanoid(),
      timestamp: new Date()
    }).returning();
    
    return message;
  }

  async getAgentMessages(agentId: string, filters: any = {}): Promise<any[]> {
    let query = db.select().from(agentMessages).where(eq(agentMessages.toAgentId, agentId));
    
    if (filters.status) {
      query = query.where(eq(agentMessages.status, filters.status));
    }
    
    if (filters.messageType) {
      query = query.where(eq(agentMessages.messageType, filters.messageType));
    }
    
    const messages = await query.orderBy(desc(agentMessages.timestamp)).limit(filters.limit || 100);
    return messages;
  }

  async updateAgentMessage(messageId: string, updates: any): Promise<void> {
    await db.update(agentMessages)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(agentMessages.id, messageId));
  }

  async createCommunicationChannel(channelData: any): Promise<any> {
    const [channel] = await db.insert(agentCommunicationChannels).values({
      ...channelData,
      id: nanoid(),
      createdAt: new Date()
    }).returning();
    
    return channel;
  }

  async getCommunicationChannel(channelId: string): Promise<any> {
    const [channel] = await db.select().from(agentCommunicationChannels)
      .where(eq(agentCommunicationChannels.id, channelId));
    return channel;
  }

  async createCoordinationRule(ruleData: any): Promise<any> {
    const [rule] = await db.insert(agentCoordinationRules).values({
      ...ruleData,
      id: nanoid(),
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    return rule;
  }

  async getCommunicationStats(agentId?: string, period: string = 'day'): Promise<any> {
    let query = db.select().from(agentMessages);
    
    if (agentId) {
      query = query.where(eq(agentMessages.toAgentId, agentId));
    }
    
    const messages = await query;
    
    return {
      totalMessages: messages.length,
      pendingMessages: messages.filter(m => m.status === 'pending').length,
      processedMessages: messages.filter(m => m.status === 'processed').length,
      failedMessages: messages.filter(m => m.status === 'failed').length,
      messagesByType: messages.reduce((acc, msg) => {
        acc[msg.messageType] = (acc[msg.messageType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      messagesByPriority: messages.reduce((acc, msg) => {
        acc[msg.priority] = (acc[msg.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }
}

export const storage = new DatabaseStorage();