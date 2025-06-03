import { randomUUID } from 'crypto';
import { storage } from '../storage';
import type { 
  AgentMemory, 
  InsertAgentMemory,
  ExecutionLog,
  InsertExecutionLog 
} from '@shared/schema';

interface MemorySearchResult extends AgentMemory {
  similarity: number;
}

interface EmbeddingResponse {
  embedding: number[];
}

export class VectorMemoryService {
  private openaiApiKey: string;

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
  }

  // Generate embeddings using OpenAI
  private async generateEmbedding(text: string): Promise<number[]> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured for vector memory');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  // Store memory with embedding
  async storeMemory(
    agentId: string,
    content: string,
    memoryType: 'input' | 'output' | 'feedback' | 'context' | 'learning',
    sessionId?: string,
    importance: number = 1,
    semanticTags: string[] = [],
    metadata: Record<string, any> = {}
  ): Promise<AgentMemory> {
    try {
      // Generate embedding for semantic search
      const embedding = await this.generateEmbedding(content);
      
      const memoryData: InsertAgentMemory = {
        agentId,
        sessionId,
        memoryType,
        content,
        embedding: JSON.stringify(embedding),
        semanticTags,
        importance,
        metadata
      };

      return await storage.createAgentMemory(memoryData);
    } catch (error) {
      console.error('Error storing memory:', error);
      throw error;
    }
  }

  // Search memories by semantic similarity
  async searchMemories(
    agentId: string,
    query: string,
    threshold: number = 0.7,
    limit: number = 10,
    memoryTypes?: string[]
  ): Promise<MemorySearchResult[]> {
    try {
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Get memories and calculate similarity
      const memories = await storage.getAgentMemories(agentId, { memoryTypes, limit: 100 });
      
      const resultsWithSimilarity = memories
        .map(memory => {
          if (!memory.embedding) return null;
          
          try {
            const memoryEmbedding = JSON.parse(memory.embedding);
            const similarity = this.calculateCosineSimilarity(queryEmbedding, memoryEmbedding);
            
            return {
              ...memory,
              similarity
            };
          } catch (error) {
            console.error('Error parsing embedding:', error);
            return null;
          }
        })
        .filter(result => result !== null && result.similarity >= threshold)
        .sort((a, b) => b!.similarity - a!.similarity)
        .slice(0, limit) as MemorySearchResult[];

      // Update access count for retrieved memories
      for (const memory of resultsWithSimilarity) {
        await storage.updateAgentMemory(memory.id, {
          accessCount: memory.accessCount + 1,
          lastAccessed: new Date()
        });
      }

      return resultsWithSimilarity;
    } catch (error) {
      console.error('Error searching memories:', error);
      throw error;
    }
  }

  // Calculate cosine similarity between two vectors
  private calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  // Get memory analytics for an agent
  async getMemoryAnalytics(agentId: string): Promise<{
    totalMemories: number;
    memoryTypeDistribution: Record<string, number>;
    averageImportance: number;
    mostAccessedMemories: AgentMemory[];
    recentMemories: AgentMemory[];
  }> {
    const memories = await storage.getAgentMemories(agentId, { limit: 1000 });
    
    const memoryTypeDistribution = memories.reduce((acc, memory) => {
      acc[memory.memoryType] = (acc[memory.memoryType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const averageImportance = memories.length > 0
      ? memories.reduce((sum, memory) => sum + memory.importance, 0) / memories.length
      : 0;

    const mostAccessedMemories = memories
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 5);

    const recentMemories = memories
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    return {
      totalMemories: memories.length,
      memoryTypeDistribution,
      averageImportance,
      mostAccessedMemories,
      recentMemories
    };
  }

  // Clean up old or low-importance memories
  async cleanupMemories(
    agentId: string,
    options: {
      maxAge?: number; // days
      minImportance?: number;
      maxCount?: number;
    } = {}
  ): Promise<number> {
    const { maxAge = 30, minImportance = 1, maxCount = 1000 } = options;
    
    const memories = await storage.getAgentMemories(agentId, { limit: 10000 });
    
    // Filter memories to keep
    const cutoffDate = new Date(Date.now() - maxAge * 24 * 60 * 60 * 1000);
    
    const memoriesToDelete = memories.filter(memory => {
      const isOld = new Date(memory.createdAt) < cutoffDate;
      const isLowImportance = memory.importance < minImportance;
      const isLowAccess = memory.accessCount === 0;
      
      return (isOld && isLowImportance) || (isLowAccess && memories.length > maxCount);
    });

    // Delete selected memories
    for (const memory of memoriesToDelete) {
      await storage.deleteAgentMemory(memory.id);
    }

    return memoriesToDelete.length;
  }

  // Store execution logs with real-time streaming capability
  async logExecution(
    executionId: string,
    agentId: string,
    stepType: 'start' | 'processing' | 'api_call' | 'memory_access' | 'completion' | 'error',
    message: string,
    details: Record<string, any> = {},
    duration?: number,
    sessionId?: string
  ): Promise<ExecutionLog> {
    const logData: InsertExecutionLog = {
      executionId,
      agentId,
      sessionId,
      stepType,
      logLevel: stepType === 'error' ? 'error' : 'info',
      message,
      details,
      duration,
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'VectorMemoryService'
      }
    };

    const log = await storage.createExecutionLog(logData);

    // Emit real-time log event (WebSocket broadcasting would be handled in routes)
    this.emitLogEvent(log);

    return log;
  }

  // Emit log event for real-time streaming
  private emitLogEvent(log: ExecutionLog): void {
    // This would be connected to WebSocket broadcasting in the main application
    console.log(`[Real-time Log] ${log.stepType}: ${log.message}`);
  }

  // Get execution logs with filtering
  async getExecutionLogs(
    filters: {
      executionId?: string;
      agentId?: string;
      sessionId?: string;
      stepType?: string;
      logLevel?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {}
  ): Promise<ExecutionLog[]> {
    return await storage.getExecutionLogs(filters);
  }
}

export const vectorMemoryService = new VectorMemoryService();