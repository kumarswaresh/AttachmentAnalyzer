import { 
  users, agents, chatSessions, chatMessages, agentLogs, vectorCache, moduleDefinitions,
  type User, type Agent, type ChatSession, type ChatMessage, type AgentLog, type VectorCache, type ModuleDefinition,
  type InsertUser, type InsertAgent, type InsertChatSession, type InsertChatMessage, type InsertAgentLog, type InsertVectorCache
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  
  // Agents
  getAgents(): Promise<Agent[]>;
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  // Agents
  async getAgents(): Promise<Agent[]> {
    return await db.select().from(agents).orderBy(desc(agents.createdAt));
  }
  
  async getAgent(id: string): Promise<Agent | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.id, id));
    return agent || undefined;
  }
  
  async createAgent(insertAgent: InsertAgent): Promise<Agent> {
    const [agent] = await db
      .insert(agents)
      .values({
        ...insertAgent,
        updatedAt: new Date()
      })
      .returning();
    return agent;
  }
  
  async updateAgent(id: string, updates: Partial<InsertAgent>): Promise<Agent> {
    const [agent] = await db
      .update(agents)
      .set({
        ...updates,
        updatedAt: new Date()
      })
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
      .orderBy(chatMessages.createdAt);
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
}

export const storage = new DatabaseStorage();