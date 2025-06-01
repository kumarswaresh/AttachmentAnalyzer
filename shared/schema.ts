import { pgTable, text, serial, integer, boolean, timestamp, jsonb, vector, real, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table (keeping existing structure)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Agent specifications
export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  goal: text("goal").notNull(),
  role: text("role").notNull(),
  guardrails: jsonb("guardrails").$type<GuardrailPolicy>().notNull(),
  modules: jsonb("modules").$type<ModuleConfig[]>().notNull(),
  model: text("model").notNull(),
  vectorStoreId: text("vector_store_id"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id),
});

// Agent execution logs
export const agentLogs = pgTable("agent_logs", {
  id: serial("id").primaryKey(),
  agentId: uuid("agent_id").references(() => agents.id).notNull(),
  executionId: uuid("execution_id").notNull(),
  status: text("status").notNull(), // success, error, running
  input: jsonb("input"),
  output: jsonb("output"),
  duration: integer("duration"), // milliseconds
  tokenCount: integer("token_count"),
  model: text("model"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"),
});

// Vector cache for question -> embedding -> answer
export const vectorCache = pgTable("vector_cache", {
  id: serial("id").primaryKey(),
  agentId: uuid("agent_id").references(() => agents.id),
  question: text("question").notNull(),
  questionEmbedding: vector("question_embedding", { dimensions: 1536 }),
  answer: text("answer").notNull(),
  cosineSimilarity: real("cosine_similarity"),
  hitCount: integer("hit_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUsed: timestamp("last_used").defaultNow().notNull(),
});

// Chat sessions
export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").references(() => agents.id).notNull(),
  userId: integer("user_id").references(() => users.id),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Chat messages
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: uuid("session_id").references(() => chatSessions.id).notNull(),
  role: text("role").notNull(), // user, agent, system
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Module definitions
export const moduleDefinitions = pgTable("module_definitions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  version: text("version").notNull(),
  description: text("description"),
  type: text("type").notNull(), // core, integration, analysis, generation
  schema: jsonb("schema"),
  implementation: text("implementation"), // TypeScript code
  dependencies: jsonb("dependencies").$type<string[]>(),
  status: text("status").notNull().default("stable"), // stable, beta, deprecated
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const agentRelations = relations(agents, ({ many, one }) => ({
  logs: many(agentLogs),
  vectorCache: many(vectorCache),
  chatSessions: many(chatSessions),
  createdBy: one(users, {
    fields: [agents.createdBy],
    references: [users.id],
  }),
}));

export const chatSessionRelations = relations(chatSessions, ({ many, one }) => ({
  messages: many(chatMessages),
  agent: one(agents, {
    fields: [chatSessions.agentId],
    references: [agents.id],
  }),
  user: one(users, {
    fields: [chatSessions.userId],
    references: [users.id],
  }),
}));

export const chatMessageRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
}));

export const agentLogRelations = relations(agentLogs, ({ one }) => ({
  agent: one(agents, {
    fields: [agentLogs.agentId],
    references: [agents.id],
  }),
}));

// Types and schemas
export interface GuardrailPolicy {
  requireHumanApproval: boolean;
  contentFiltering: boolean;
  readOnlyMode: boolean;
  maxTokens?: number;
  allowedDomains?: string[];
  blockedKeywords?: string[];
}

export interface ModuleConfig {
  moduleId: string;
  version: string;
  config: Record<string, any>;
  enabled: boolean;
}

export interface LlmChoice {
  provider: "bedrock" | "custom";
  model: string;
  temperature?: number;
  maxTokens?: number;
  contextLength?: number;
}

// Agent spec interface from requirements
export interface AgentSpec {
  id: string;
  goal: string;
  role: string;
  guardrails: GuardrailPolicy;
  modules: ModuleConfig[];
  model: LlmChoice;
  vectorStoreId: string;
}

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertAgentSchema = createInsertSchema(agents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  timestamp: true,
});

export const insertAgentLogSchema = createInsertSchema(agentLogs).omit({
  id: true,
  timestamp: true,
});

export const insertVectorCacheSchema = createInsertSchema(vectorCache).omit({
  id: true,
  createdAt: true,
  lastUsed: true,
  hitCount: true,
});

// Select types
export type User = typeof users.$inferSelect;
export type Agent = typeof agents.$inferSelect;
export type AgentLog = typeof agentLogs.$inferSelect;
export type VectorCache = typeof vectorCache.$inferSelect;
export type ChatSession = typeof chatSessions.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type ModuleDefinition = typeof moduleDefinitions.$inferSelect;

// Insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type InsertAgentLog = z.infer<typeof insertAgentLogSchema>;
export type InsertVectorCache = z.infer<typeof insertVectorCacheSchema>;
