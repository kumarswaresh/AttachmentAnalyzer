import { 
  users, agents, chatSessions, chatMessages, agentLogs, vectorCache, moduleDefinitions,
  apiKeys, agentTemplates, customModels, userSessions, agentChains, agentMessages, chainExecutions,
  type User, type Agent, type ChatSession, type ChatMessage, type AgentLog, type VectorCache, type ModuleDefinition,
  type ApiKey, type AgentTemplate, type CustomModel, type UserSession, type AgentChain, type AgentMessage, type ChainExecution,
  type InsertUser, type InsertAgent, type InsertChatSession, type InsertChatMessage, type InsertAgentLog, type InsertVectorCache,
  type InsertApiKey, type InsertAgentTemplate, type InsertCustomModel, type InsertUserSession,
  type InsertAgentChain, type InsertAgentMessage, type InsertChainExecution
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, sql } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();