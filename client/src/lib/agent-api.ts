import { apiRequest } from "./queryClient";
import type { Agent, InsertAgent, ChatSession, ChatMessage, InsertChatSession, InsertChatMessage } from "@shared/schema";

export interface AgentExecutionResult {
  executionId: string;
  output: string;
  fromCache: boolean;
  duration: number;
}

export interface SystemStats {
  activeAgents: number;
  totalExecutions: number;
  successRate: number;
  averageResponseTime: number;
}

export interface ModelSuggestion {
  id: string;
  name: string;
  provider: string;
  cost: number;
  speed: number;
  quality: number;
  score: number;
  reasoning: string;
}

export interface ModuleDefinition {
  id: string;
  name: string;
  version: string;
  description: string;
  type: string;
  status: string;
}

export interface AgentLog {
  id: number;
  agentId: string;
  executionId: string;
  status: string;
  duration: number | null;
  timestamp: string;
  errorMessage: string | null;
  metadata: any;
}

// Agent Management
export async function getAgents(): Promise<Agent[]> {
  const response = await apiRequest("GET", "/api/agents");
  return response.json();
}

export async function getAgent(id: string): Promise<Agent> {
  const response = await apiRequest("GET", `/api/agents/${id}`);
  return response.json();
}

export async function createAgent(agent: InsertAgent): Promise<Agent> {
  const response = await apiRequest("POST", "/api/agents", agent);
  return response.json();
}

export async function updateAgent(id: string, agent: Partial<InsertAgent>): Promise<Agent> {
  const response = await apiRequest("PUT", `/api/agents/${id}`, agent);
  return response.json();
}

export async function deleteAgent(id: string): Promise<void> {
  await apiRequest("DELETE", `/api/agents/${id}`);
}

export async function executeAgent(id: string, input: string): Promise<AgentExecutionResult> {
  const response = await apiRequest("POST", `/api/agents/${id}/invoke`, { input });
  return response.json();
}

// Chat Management
export async function createChatSession(session: InsertChatSession): Promise<ChatSession> {
  const response = await apiRequest("POST", "/api/chat/sessions", session);
  return response.json();
}

export async function getChatMessages(sessionId: string): Promise<ChatMessage[]> {
  const response = await apiRequest("GET", `/api/chat/sessions/${sessionId}/messages`);
  return response.json();
}

export async function sendChatMessage(sessionId: string, message: Omit<InsertChatMessage, "sessionId">): Promise<{
  userMessage: ChatMessage;
  agentMessage?: ChatMessage;
  error?: string;
}> {
  const response = await apiRequest("POST", `/api/chat/sessions/${sessionId}/messages`, message);
  return response.json();
}

// Model Selection
export async function getModelSuggestions(criteria: {
  useCase: string;
  contextLength?: number;
  temperature?: number;
  budget?: "low" | "medium" | "high";
  latency?: "low" | "medium" | "high";
}): Promise<ModelSuggestion[]> {
  const response = await apiRequest("POST", "/api/models/suggest", criteria);
  return response.json();
}

// Monitoring
export async function getSystemStats(): Promise<SystemStats> {
  const response = await apiRequest("GET", "/api/monitoring/stats");
  return response.json();
}

export async function getRecentLogs(limit: number = 50): Promise<AgentLog[]> {
  const response = await apiRequest("GET", `/api/monitoring/logs?limit=${limit}`);
  return response.json();
}

// Module Library
export async function getModuleDefinitions(): Promise<ModuleDefinition[]> {
  const response = await apiRequest("GET", "/api/modules");
  return response.json();
}

// WebSocket connection for real-time updates
export function createWebSocketConnection(): WebSocket {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  return new WebSocket(wsUrl);
}
