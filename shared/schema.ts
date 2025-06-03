import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real, uuid, varchar, date, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table with authentication and roles
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"), // admin, manager, user
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// API Keys management
export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  provider: text("provider").notNull(), // openai, anthropic, google, etc.
  keyName: text("key_name").notNull(),
  encryptedKey: text("encrypted_key").notNull(),
  isActive: boolean("is_active").default(true),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Agent Templates
export const agentTemplates = pgTable("agent_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // marketing, analytics, coding, support, etc.
  icon: text("icon"),
  defaultGoal: text("default_goal").notNull(),
  defaultRole: text("default_role").notNull(),
  defaultGuardrails: jsonb("default_guardrails").$type<GuardrailPolicy>().notNull(),
  defaultModules: jsonb("default_modules").$type<ModuleConfig[]>().notNull(),
  defaultModel: text("default_model").notNull(),
  isPublic: boolean("is_public").default(true),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Custom Model Configurations
export const customModels = pgTable("custom_models", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  provider: text("provider").notNull(), // openai, anthropic, google, azure, custom
  modelId: text("model_id").notNull(),
  endpoint: text("endpoint"),
  apiKeyId: integer("api_key_id").references(() => apiKeys.id),
  configuration: jsonb("configuration"), // model-specific config
  capabilities: jsonb("capabilities").$type<string[]>(), // text, vision, function_calling, etc.
  contextLength: integer("context_length"),
  maxTokens: integer("max_tokens"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User Sessions
export const userSessions = pgTable("user_sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  stepType: varchar("step_type"), // 'initialization', 'processing', 'memory_retrieval', 'response_generation'
  executionContext: jsonb("execution_context"),
  performanceMetrics: jsonb("performance_metrics"),
  sessionId: varchar("session_id")
});

// Vector cache for question -> embedding -> answer
export const vectorCache = pgTable("vector_cache", {
  id: serial("id").primaryKey(),
  agentId: uuid("agent_id").references(() => agents.id),
  question: text("question").notNull(),
  questionEmbedding: text("question_embedding"), // Temporarily using text instead of vector
  answer: text("answer").notNull(),
  cosineSimilarity: real("cosine_similarity"),
  hitCount: integer("hit_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUsed: timestamp("last_used").defaultNow().notNull(),
  sessionId: varchar("session_id"),
  feedbackScore: real("feedback_score"),
  memoryType: varchar("memory_type").default("general"), // 'input', 'output', 'feedback', 'general'
  contextMetadata: jsonb("context_metadata").$type<Record<string, any>>().default({}),
  importanceScore: real("importance_score").default(0.5)
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

export const hotelBookings = pgTable("hotel_bookings", {
  id: varchar("id").primaryKey().notNull(),
  hotelId: varchar("hotel_id").notNull(),
  hotelName: varchar("hotel_name").notNull(),
  location: varchar("location").notNull(),
  checkInDate: date("check_in_date").notNull(),
  checkOutDate: date("check_out_date").notNull(),
  guestCount: integer("guest_count").notNull(),
  roomType: varchar("room_type").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").default("USD").notNull(),
  bookingStatus: varchar("booking_status").notNull(),
  bookedAt: timestamp("booked_at").defaultNow(),
  specialRequests: jsonb("special_requests"),
  eventType: varchar("event_type"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const hotelAnalytics = pgTable("hotel_analytics", {
  id: serial("id").primaryKey(),
  periodType: varchar("period_type").notNull(),
  periodValue: varchar("period_value").notNull(),
  bookingCount: integer("booking_count").default(0),
  totalRevenue: decimal("total_revenue", { precision: 12, scale: 2 }).default("0"),
  averagePrice: decimal("average_price", { precision: 10, scale: 2 }).default("0"),
  topDestinations: jsonb("top_destinations"),
  eventMetrics: jsonb("event_metrics"),
  calculatedAt: timestamp("calculated_at").defaultNow(),
});

// Agent communication and chaining tables
export const agentChains = pgTable('agent_chains', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name').notNull(),
  description: text('description'),
  steps: jsonb('steps').$type<ChainStep[]>().notNull(),
  isActive: boolean('is_active').default(true),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const agentMessages = pgTable('agent_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  chainExecutionId: uuid('chain_execution_id'),
  fromAgentId: uuid('from_agent_id').references(() => agents.id),
  toAgentId: uuid('to_agent_id').references(() => agents.id).notNull(),
  messageType: varchar('message_type').notNull(), // 'task', 'result', 'error', 'context'
  content: jsonb('content').notNull(),
  status: varchar('status').default('pending'), // 'pending', 'delivered', 'processed', 'failed'
  priority: integer('priority').default(1), // 1-5, higher is more urgent
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  processedAt: timestamp('processed_at'),
  metadata: jsonb('metadata')
});

export const chainExecutions = pgTable('chain_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  chainId: uuid('chain_id').references(() => agentChains.id).notNull(),
  status: varchar('status').default('pending'), // 'pending', 'running', 'completed', 'failed', 'cancelled'
  currentStep: integer('current_step').default(0),
  input: jsonb('input'),
  output: jsonb('output'),
  context: jsonb('context').$type<Record<string, any>>().default({}),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  errorMessage: text('error_message'),
  executedBy: integer('executed_by').references(() => users.id),
  metadata: jsonb('metadata')
});

// Agent Memory Evolution
export const agentMemoryEvolution = pgTable('agent_memory_evolution', {
  id: serial('id').primaryKey(),
  agentId: uuid('agent_id').references(() => agents.id).notNull(),
  memoryId: integer('memory_id').references(() => vectorCache.id).notNull(),
  evolutionType: varchar('evolution_type').notNull(), // 'reinforcement', 'correction', 'expansion'
  feedbackSource: varchar('feedback_source').notNull(), // 'user', 'system', 'agent'
  feedbackData: jsonb('feedback_data'),
  previousScore: real('previous_score'),
  newScore: real('new_score'),
  timestamp: timestamp('timestamp').defaultNow().notNull()
});

// Agent Response Schemas
export const agentResponseSchemas = pgTable('agent_response_schemas', {
  id: serial('id').primaryKey(),
  agentId: uuid('agent_id').references(() => agents.id).notNull(),
  schemaName: varchar('schema_name').notNull(),
  jsonSchema: jsonb('json_schema').notNull(),
  validationRules: jsonb('validation_rules'),
  isActive: boolean('is_active').default(true),
  version: varchar('version').default('1.0.0'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// MCP Connectors
export const mcpConnectors = pgTable('mcp_connectors', {
  id: serial('id').primaryKey(),
  name: varchar('name').notNull(),
  connectorType: varchar('connector_type').notNull(), // 'api', 'database', 'file', 'webhook'
  authConfig: jsonb('auth_config'),
  endpointConfig: jsonb('endpoint_config'),
  sampleRequest: jsonb('sample_request'),
  sampleResponse: jsonb('sample_response'),
  validationSchema: jsonb('validation_schema'),
  isActive: boolean('is_active').default(true),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Connector Usage Logs
export const connectorUsageLogs = pgTable('connector_usage_logs', {
  id: serial('id').primaryKey(),
  connectorId: integer('connector_id').references(() => mcpConnectors.id).notNull(),
  agentId: uuid('agent_id').references(() => agents.id),
  requestData: jsonb('request_data'),
  responseData: jsonb('response_data'),
  success: boolean('success').notNull(),
  latencyMs: integer('latency_ms'),
  errorMessage: text('error_message'),
  timestamp: timestamp('timestamp').defaultNow().notNull()
});

// Module Registry
export const moduleRegistry = pgTable('module_registry', {
  id: serial('id').primaryKey(),
  moduleName: varchar('module_name').unique().notNull(),
  moduleType: varchar('module_type').notNull(), // 'prompt', 'logging', 'recommendation', etc.
  version: varchar('version').notNull(),
  interfaceSchema: jsonb('interface_schema'),
  implementationCode: text('implementation_code'),
  dependencies: jsonb('dependencies'),
  isCore: boolean('is_core').default(false),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Agent Module Instances
export const agentModuleInstances = pgTable('agent_module_instances', {
  id: serial('id').primaryKey(),
  agentId: uuid('agent_id').references(() => agents.id).notNull(),
  moduleId: integer('module_id').references(() => moduleRegistry.id).notNull(),
  configuration: jsonb('configuration'),
  executionOrder: integer('execution_order').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Agent Apps
export const agentApps = pgTable('agent_apps', {
  id: serial('id').primaryKey(),
  name: varchar('name').notNull(),
  description: text('description'),
  appConfig: jsonb('app_config'), // visual flow configuration
  agents: jsonb('agents'), // agent references and configurations
  connectors: jsonb('connectors'), // connector references
  modules: jsonb('modules'), // module configurations
  logicGates: jsonb('logic_gates'), // flow control logic
  inputSchema: jsonb('input_schema'),
  outputSchema: jsonb('output_schema'),
  isPublic: boolean('is_public').default(false),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// App Executions
export const appExecutions = pgTable('app_executions', {
  id: serial('id').primaryKey(),
  appId: integer('app_id').references(() => agentApps.id).notNull(),
  inputData: jsonb('input_data'),
  outputData: jsonb('output_data'),
  executionTrace: jsonb('execution_trace'),
  status: varchar('status').notNull().default('pending'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  errorMessage: text('error_message'),
  executedBy: integer('executed_by').references(() => users.id)
});

// User Profiles for Geo-personalization
export const userProfiles = pgTable('user_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  ageRange: varchar('age_range'),
  cardholderStatus: varchar('cardholder_status'),
  location: jsonb('location'), // lat, lng, city, country
  spendingCapacity: varchar('spending_capacity'),
  preferences: jsonb('preferences'),
  bookingHistory: jsonb('booking_history'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Geospatial Events
export const geospatialEvents = pgTable('geospatial_events', {
  id: serial('id').primaryKey(),
  eventName: varchar('event_name').notNull(),
  eventType: varchar('event_type').notNull(), // 'concert', 'festival', 'conference'
  location: jsonb('location'), // lat, lng, address
  dateRange: jsonb('date_range'), // start_date, end_date
  metadata: jsonb('metadata'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
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
// Define agent role types with access controls
export interface AgentRole {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  restrictions: string[];
  accessLevel: "basic" | "intermediate" | "advanced" | "admin";
}

export const AGENT_ROLES: Record<string, AgentRole> = {
  "content-creator": {
    id: "content-creator",
    name: "Content Creator",
    description: "Creates marketing content, blog posts, and social media materials",
    capabilities: ["text-generation", "content-optimization", "seo-analysis", "social-media"],
    restrictions: ["no-code-execution", "no-database-write", "no-external-api-calls"],
    accessLevel: "basic"
  },
  "data-analyst": {
    id: "data-analyst",
    name: "Data Analyst",
    description: "Analyzes data, generates reports, and provides insights",
    capabilities: ["data-analysis", "report-generation", "visualization", "database-read", "sql-queries"],
    restrictions: ["no-database-write", "no-external-api-calls"],
    accessLevel: "intermediate"
  },
  "developer-assistant": {
    id: "developer-assistant",
    name: "Developer Assistant",
    description: "Helps with code generation, debugging, and technical documentation",
    capabilities: ["code-generation", "debugging", "documentation", "api-integration", "testing"],
    restrictions: ["no-production-deployment", "code-review-required"],
    accessLevel: "advanced"
  },
  "customer-support": {
    id: "customer-support",
    name: "Customer Support",
    description: "Handles customer inquiries, troubleshooting, and support tickets",
    capabilities: ["conversation", "knowledge-base-search", "ticket-creation", "escalation"],
    restrictions: ["no-sensitive-data-access", "human-approval-required"],
    accessLevel: "basic"
  },
  "research-assistant": {
    id: "research-assistant",
    name: "Research Assistant",
    description: "Conducts research, summarizes findings, and gathers information",
    capabilities: ["web-search", "document-analysis", "summarization", "fact-checking"],
    restrictions: ["no-database-write", "citation-required"],
    accessLevel: "intermediate"
  },
  "automation-specialist": {
    id: "automation-specialist",
    name: "Automation Specialist",
    description: "Automates workflows, integrates systems, and manages processes",
    capabilities: ["workflow-automation", "api-integration", "system-monitoring", "task-scheduling"],
    restrictions: ["approval-required-for-critical-operations"],
    accessLevel: "advanced"
  },
  "admin-agent": {
    id: "admin-agent",
    name: "Administrative Agent",
    description: "Full system access for administrative tasks and management",
    capabilities: ["full-database-access", "system-administration", "user-management", "security-operations"],
    restrictions: [],
    accessLevel: "admin"
  }
};

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

export interface ChainStep {
  id: string;
  agentId: string;
  name: string;
  condition?: {
    type: 'always' | 'if_success' | 'if_error' | 'custom';
    expression?: string;
  };
  inputMapping?: Record<string, string>; // Map previous step outputs to this step's inputs
  outputMapping?: Record<string, string>; // Map this step's outputs to chain context
  timeout?: number; // Timeout in seconds
  retryCount?: number;
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
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastUsed: true,
});

export const insertAgentTemplateSchema = createInsertSchema(agentTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomModelSchema = createInsertSchema(customModels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  createdAt: true,
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

export const insertAgentChainSchema = createInsertSchema(agentChains).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAgentMessageSchema = createInsertSchema(agentMessages).omit({
  id: true,
  timestamp: true,
});

export const insertChainExecutionSchema = createInsertSchema(chainExecutions).omit({
  id: true,
  startedAt: true,
});

// Select types
export type User = typeof users.$inferSelect;
export type Agent = typeof agents.$inferSelect;
export type AgentLog = typeof agentLogs.$inferSelect;
export type VectorCache = typeof vectorCache.$inferSelect;
export type ChatSession = typeof chatSessions.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type ModuleDefinition = typeof moduleDefinitions.$inferSelect;

// Select types for new authentication tables
export type ApiKey = typeof apiKeys.$inferSelect;
export type AgentTemplate = typeof agentTemplates.$inferSelect;
export type CustomModel = typeof customModels.$inferSelect;
export type UserSession = typeof userSessions.$inferSelect;

// Select types for new agent communication tables
export type AgentChain = typeof agentChains.$inferSelect;
export type AgentMessage = typeof agentMessages.$inferSelect;
export type ChainExecution = typeof chainExecutions.$inferSelect;

// Insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type InsertAgentTemplate = z.infer<typeof insertAgentTemplateSchema>;
export type InsertCustomModel = z.infer<typeof insertCustomModelSchema>;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type InsertAgentLog = z.infer<typeof insertAgentLogSchema>;
export type InsertVectorCache = z.infer<typeof insertVectorCacheSchema>;
export type InsertAgentChain = z.infer<typeof insertAgentChainSchema>;
export type InsertAgentMessage = z.infer<typeof insertAgentMessageSchema>;
export type InsertChainExecution = z.infer<typeof insertChainExecutionSchema>;

export type HotelBooking = typeof hotelBookings.$inferSelect;
export type InsertHotelBooking = typeof hotelBookings.$inferInsert;
export type HotelAnalytic = typeof hotelAnalytics.$inferSelect;
export type InsertHotelAnalytic = typeof hotelAnalytics.$inferInsert;

// New enhanced types
export type AgentMemoryEvolution = typeof agentMemoryEvolution.$inferSelect;
export type InsertAgentMemoryEvolution = typeof agentMemoryEvolution.$inferInsert;
export type AgentResponseSchema = typeof agentResponseSchemas.$inferSelect;
export type InsertAgentResponseSchema = typeof agentResponseSchemas.$inferInsert;
export type McpConnector = typeof mcpConnectors.$inferSelect;
export type InsertMcpConnector = typeof mcpConnectors.$inferInsert;
export type ConnectorUsageLog = typeof connectorUsageLogs.$inferSelect;
export type InsertConnectorUsageLog = typeof connectorUsageLogs.$inferInsert;
export type ModuleRegistryEntry = typeof moduleRegistry.$inferSelect;
export type InsertModuleRegistryEntry = typeof moduleRegistry.$inferInsert;
export type AgentModuleInstance = typeof agentModuleInstances.$inferSelect;
export type InsertAgentModuleInstance = typeof agentModuleInstances.$inferInsert;
export type AgentApp = typeof agentApps.$inferSelect;
export type InsertAgentApp = typeof agentApps.$inferInsert;
export type AppExecution = typeof appExecutions.$inferSelect;
export type InsertAppExecution = typeof appExecutions.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;
export type GeospatialEvent = typeof geospatialEvents.$inferSelect;
export type InsertGeospatialEvent = typeof geospatialEvents.$inferInsert;
