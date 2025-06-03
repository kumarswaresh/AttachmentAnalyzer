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
  messageType: varchar('message_type').notNull(), // 'task', 'result', 'error', 'context', 'data_share', 'coordination'
  content: jsonb('content').notNull(),
  status: varchar('status').default('pending'), // 'pending', 'delivered', 'processed', 'failed'
  priority: varchar('priority').default('medium'), // 'low', 'medium', 'high', 'urgent'
  responseRequired: boolean('response_required').default(false),
  responseTimeout: integer('response_timeout'), // seconds
  correlationId: uuid('correlation_id'), // for request-response patterns
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  processedAt: timestamp('processed_at'),
  responseReceivedAt: timestamp('response_received_at'),
  metadata: jsonb('metadata').$type<Record<string, any>>().default({})
});

// Agent Communication Channels for organized messaging
export const agentCommunicationChannels = pgTable('agent_communication_channels', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name').notNull(),
  description: text('description'),
  channelType: varchar('channel_type').notNull(), // 'broadcast', 'group', 'direct', 'workflow'
  participantAgents: jsonb('participant_agents').$type<string[]>().notNull(),
  moderatorAgent: uuid('moderator_agent').references(() => agents.id),
  configuration: jsonb('configuration').$type<Record<string, any>>().default({}),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: integer('created_by').references(() => users.id).notNull()
});

// Agent Coordination Rules for complex workflows
export const agentCoordinationRules = pgTable('agent_coordination_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name').notNull(),
  description: text('description'),
  triggerConditions: jsonb('trigger_conditions').$type<CoordinationTrigger[]>().notNull(),
  actions: jsonb('actions').$type<CoordinationAction[]>().notNull(),
  priority: integer('priority').default(1),
  isActive: boolean('is_active').default(true),
  agentScope: jsonb('agent_scope').$type<string[]>(), // specific agents or null for global
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: integer('created_by').references(() => users.id).notNull()
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

// Vector Memory for Agent Long-term Memory with pgvector
export const agentMemory = pgTable('agent_memory', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').references(() => agents.id).notNull(),
  sessionId: uuid('session_id'),
  memoryType: varchar('memory_type').notNull(), // 'input', 'output', 'feedback', 'context', 'learning'
  content: text('content').notNull(),
  embedding: text('embedding'), // Store as string, convert to vector in application
  semanticTags: jsonb('semantic_tags').$type<string[]>().default([]),
  importance: integer('importance').default(1), // 1-10 scale
  accessCount: integer('access_count').default(0),
  lastAccessed: timestamp('last_accessed'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  metadata: jsonb('metadata').$type<Record<string, any>>().default({})
});

// Custom Response Schemas for Agents
export const agentResponseSchemas = pgTable('agent_response_schemas', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').references(() => agents.id).notNull(),
  name: varchar('name').notNull(),
  description: text('description'),
  jsonSchema: jsonb('json_schema').notNull(), // JSON Schema definition
  isActive: boolean('is_active').default(true),
  version: integer('version').default(1),
  validationRules: jsonb('validation_rules').$type<ValidationRule[]>().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Live Execution Logs with Real-time Streaming
export const executionLogs = pgTable('execution_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  executionId: uuid('execution_id').references(() => chainExecutions.id),
  agentId: uuid('agent_id').references(() => agents.id),
  sessionId: uuid('session_id'),
  stepType: varchar('step_type').notNull(), // 'start', 'processing', 'api_call', 'memory_access', 'completion', 'error'
  logLevel: varchar('log_level').default('info'), // 'debug', 'info', 'warn', 'error'
  message: text('message').notNull(),
  details: jsonb('details').$type<Record<string, any>>().default({}),
  duration: integer('duration'), // milliseconds
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  metadata: jsonb('metadata').$type<Record<string, any>>().default({})
});

// MCP Connectors - Low-code Connector Builder
export const mcpConnectors = pgTable('mcp_connectors', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name').notNull().unique(),
  displayName: varchar('display_name').notNull(),
  description: text('description'),
  type: varchar('type').notNull(), // 'api', 'database', 'webhook', 'file', 'custom'
  category: varchar('category').notNull(), // 'data', 'communication', 'ai', 'business', 'utility'
  authConfig: jsonb('auth_config').$type<AuthConfig>().notNull(),
  endpoints: jsonb('endpoints').$type<ConnectorEndpoint[]>().notNull(),
  sampleRequest: jsonb('sample_request'),
  sampleResponse: jsonb('sample_response'),
  isActive: boolean('is_active').default(true),
  isPublic: boolean('is_public').default(false),
  createdBy: integer('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Agent Apps - Complete Multi-Agent Applications
export const agentApps = pgTable('agent_apps', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name').notNull(),
  description: text('description'),
  category: varchar('category').notNull(), // 'travel', 'marketing', 'analytics', 'customer_service', 'custom'
  icon: varchar('icon'),
  configuration: jsonb('configuration').$type<AgentAppConfig>().notNull(),
  flowDefinition: jsonb('flow_definition').$type<AgentFlowNode[]>().notNull(),
  inputSchema: jsonb('input_schema').notNull(), // JSON Schema for app inputs
  outputSchema: jsonb('output_schema').notNull(), // JSON Schema for app outputs
  guardrails: jsonb('guardrails').$type<AppGuardrail[]>().default([]),
  isActive: boolean('is_active').default(true),
  isPublic: boolean('is_public').default(false),
  executionCount: integer('execution_count').default(0),
  avgExecutionTime: integer('avg_execution_time'), // milliseconds
  createdBy: integer('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Agent App Executions
export const agentAppExecutions = pgTable('agent_app_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id').references(() => agentApps.id).notNull(),
  status: varchar('status').default('pending'), // 'pending', 'running', 'completed', 'failed', 'cancelled'
  input: jsonb('input').notNull(),
  output: jsonb('output'),
  context: jsonb('context').$type<Record<string, any>>().default({}),
  geoContext: jsonb('geo_context').$type<GeoContext>(), // For geo-personalized apps
  userProfile: jsonb('user_profile').$type<UserProfile>(), // User preferences and data
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  duration: integer('duration'), // milliseconds
  errorMessage: text('error_message'),
  executedBy: integer('executed_by').references(() => users.id),
  metadata: jsonb('metadata').$type<Record<string, any>>().default({})
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

// Types and schemas for enhanced multi-agent orchestration

// Vector Memory and Response Schema Types
export interface ValidationRule {
  field: string;
  type: 'required' | 'format' | 'range' | 'enum';
  value: any;
  message: string;
}

export interface AuthConfig {
  type: 'none' | 'api_key' | 'bearer' | 'oauth2' | 'basic';
  fields: Record<string, string>;
  headers?: Record<string, string>;
}

export interface ConnectorEndpoint {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description?: string;
  parameters: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object';
    required: boolean;
    description?: string;
  }>;
  responseSchema?: object;
}

// Agent App Configuration Types
export interface AgentAppConfig {
  version: string;
  timeout: number;
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
  };
  parallelExecution: boolean;
  memoryEnabled: boolean;
  loggingLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface AgentFlowNode {
  id: string;
  type: 'agent' | 'connector' | 'condition' | 'parallel' | 'merge' | 'memory' | 'transform';
  name: string;
  position: { x: number; y: number };
  config: Record<string, any>;
  inputs: string[];
  outputs: string[];
  conditions?: Array<{
    field: string;
    operator: '==' | '!=' | '>' | '<' | 'contains' | 'exists';
    value: any;
    nextNode?: string;
  }>;
}

export interface AppGuardrail {
  id: string;
  type: 'input_validation' | 'output_filter' | 'rate_limit' | 'content_safety' | 'data_privacy';
  config: Record<string, any>;
  enabled: boolean;
}

export interface GeoContext {
  latitude?: number;
  longitude?: number;
  city?: string;
  country?: string;
  timezone?: string;
  currency?: string;
  language?: string;
}

export interface UserProfile {
  ageRange?: string;
  interests?: string[];
  spendingCapacity?: 'low' | 'medium' | 'high' | 'luxury';
  cardholderStatus?: 'basic' | 'premium' | 'platinum' | 'black';
  travelPreferences?: {
    accommodationType?: string[];
    transportation?: string[];
    activities?: string[];
  };
  bookingHistory?: Array<{
    type: string;
    location: string;
    date: string;
    amount: number;
  }>;
}

// Agent Communication and Coordination Types
export interface CoordinationTrigger {
  type: 'message_received' | 'agent_status_change' | 'time_based' | 'condition_met' | 'error_occurred';
  conditions: Record<string, any>;
  agentFilters?: string[];
}

export interface CoordinationAction {
  type: 'send_message' | 'notify_agents' | 'trigger_workflow' | 'escalate' | 'retry' | 'pause_execution';
  parameters: Record<string, any>;
  targetAgents?: string[];
}

export interface AgentMessageContent {
  messageId?: string;
  subject?: string;
  body: string;
  data?: Record<string, any>;
  attachments?: Array<{
    type: string;
    content: any;
    metadata?: Record<string, any>;
  }>;
  instructions?: string[];
  expectedResponse?: 'acknowledgment' | 'data' | 'action_confirmation' | 'none';
}

export interface AgentCommunicationState {
  agentId: string;
  status: 'available' | 'busy' | 'offline' | 'error';
  currentTask?: string;
  messageQueue: string[];
  lastActivity: Date;
  capabilities: string[];
  workload: number; // 0-100 percentage
}

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

// Select types for enhanced multi-agent orchestration
export type AgentMemory = typeof agentMemory.$inferSelect;
export type AgentResponseSchema = typeof agentResponseSchemas.$inferSelect;
export type ExecutionLog = typeof executionLogs.$inferSelect;
export type McpConnector = typeof mcpConnectors.$inferSelect;
export type AgentApp = typeof agentApps.$inferSelect;
export type AgentAppExecution = typeof agentAppExecutions.$inferSelect;

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

// Insert types for enhanced multi-agent orchestration
export const insertAgentMemorySchema = createInsertSchema(agentMemory);
export const insertAgentResponseSchemaSchema = createInsertSchema(agentResponseSchemas);
export const insertExecutionLogSchema = createInsertSchema(executionLogs);
export const insertMcpConnectorSchema = createInsertSchema(mcpConnectors);
export const insertAgentAppSchema = createInsertSchema(agentApps);
export const insertAgentAppExecutionSchema = createInsertSchema(agentAppExecutions);

export type InsertAgentMemory = z.infer<typeof insertAgentMemorySchema>;
export type InsertAgentResponseSchema = z.infer<typeof insertAgentResponseSchemaSchema>;
export type InsertExecutionLog = z.infer<typeof insertExecutionLogSchema>;
export type InsertMcpConnector = z.infer<typeof insertMcpConnectorSchema>;
export type InsertAgentApp = z.infer<typeof insertAgentAppSchema>;
export type InsertAgentAppExecution = z.infer<typeof insertAgentAppExecutionSchema>;

export type HotelBooking = typeof hotelBookings.$inferSelect;
export type InsertHotelBooking = typeof hotelBookings.$inferInsert;
export type HotelAnalytic = typeof hotelAnalytics.$inferSelect;
export type InsertHotelAnalytic = typeof hotelAnalytics.$inferInsert;
