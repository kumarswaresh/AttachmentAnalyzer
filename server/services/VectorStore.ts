import { db } from "../db";
import { vectorCache, agentMemoryEvolution } from "@shared/schema";
import { sql, eq, desc, and, gte, or } from "drizzle-orm";
import type { InsertAgentMemoryEvolution, InsertVectorCache } from "@shared/schema";

export class VectorStore {
  private openaiApiKey: string;

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY || process.env.VECTOR_API_KEY || "";
  }

  async cacheResult(
    agentId: string, 
    question: string, 
    answer: string, 
    sessionId?: string,
    memoryType: 'input' | 'output' | 'feedback' | 'general' = 'general',
    contextMetadata: Record<string, any> = {}
  ): Promise<number | null> {
    try {
      // Generate embedding for the question
      const embedding = await this.generateEmbedding(question);
      
      const insertData: InsertVectorCache = {
        agentId,
        question,
        questionEmbedding: JSON.stringify(embedding),
        answer,
        sessionId,
        memoryType,
        contextMetadata,
        importanceScore: this.calculateImportanceScore(question, answer, contextMetadata)
      };
      
      const [result] = await db.insert(vectorCache).values(insertData).returning({ id: vectorCache.id });
      
      return result.id;
    } catch (error) {
      console.error("Failed to cache vector result:", error);
      return null;
    }
  }

  private calculateImportanceScore(question: string, answer: string, metadata: Record<string, any>): number {
    let score = 0.5; // Base score
    
    // Increase importance for longer, more detailed responses
    if (answer.length > 500) score += 0.2;
    if (answer.length > 1000) score += 0.1;
    
    // Increase importance for complex questions
    if (question.includes('?') && question.split('?').length > 2) score += 0.1;
    
    // Increase importance based on metadata indicators
    if (metadata.userFeedback === 'positive') score += 0.3;
    if (metadata.complexity === 'high') score += 0.2;
    if (metadata.businessCritical) score += 0.4;
    
    return Math.min(1.0, Math.max(0.1, score));
  }

  async searchSimilar(agentId: string, question: string, threshold: number = 0.9): Promise<{
    id: number;
    answer: string;
    cosineSimilarity: number;
  } | null> {
    try {
      const queryEmbedding = await this.generateEmbedding(question);
      
      // Use pgvector cosine similarity search
      const results = await db.execute(sql`
        SELECT 
          id,
          answer,
          1 - (question_embedding <=> ${queryEmbedding}) as cosine_similarity
        FROM vector_cache 
        WHERE agent_id = ${agentId}
          AND 1 - (question_embedding <=> ${queryEmbedding}) >= ${threshold}
        ORDER BY question_embedding <=> ${queryEmbedding}
        LIMIT 1
      `);

      if (results.rows.length > 0) {
        const row = results.rows[0] as any;
        return {
          id: row.id,
          answer: row.answer,
          cosineSimilarity: row.cosine_similarity
        };
      }

      return null;
    } catch (error) {
      console.error("Vector search failed:", error);
      return null;
    }
  }

  async incrementHitCount(cacheId: number): Promise<void> {
    try {
      await db.execute(sql`
        UPDATE vector_cache 
        SET 
          hit_count = hit_count + 1,
          last_used = NOW()
        WHERE id = ${cacheId}
      `);
    } catch (error) {
      console.error("Failed to increment hit count:", error);
    }
  }

  async getAgentCacheStats(agentId: string): Promise<{
    totalCached: number;
    totalHits: number;
    hitRate: number;
    recentCached: number;
  }> {
    try {
      const totalResults = await db.execute(sql`
        SELECT 
          COUNT(*) as total_cached,
          COALESCE(SUM(hit_count), 0) as total_hits
        FROM vector_cache 
        WHERE agent_id = ${agentId}
      `);

      const recentResults = await db.execute(sql`
        SELECT COUNT(*) as recent_cached
        FROM vector_cache 
        WHERE agent_id = ${agentId}
          AND created_at >= NOW() - INTERVAL '7 days'
      `);

      const totalRow = totalResults.rows[0] as any;
      const recentRow = recentResults.rows[0] as any;

      const totalCached = parseInt(totalRow.total_cached) || 0;
      const totalHits = parseInt(totalRow.total_hits) || 0;
      const recentCached = parseInt(recentRow.recent_cached) || 0;

      // Calculate hit rate (hits per cache entry)
      const hitRate = totalCached > 0 ? totalHits / totalCached : 0;

      return {
        totalCached,
        totalHits,
        hitRate,
        recentCached
      };
    } catch (error) {
      console.error("Failed to get cache stats:", error);
      return {
        totalCached: 0,
        totalHits: 0,
        hitRate: 0,
        recentCached: 0
      };
    }
  }

  async cleanupOldCache(daysOld: number = 30): Promise<number> {
    try {
      const result = await db.execute(sql`
        DELETE FROM vector_cache 
        WHERE created_at < NOW() - INTERVAL '${sql.raw(daysOld.toString())} days'
          AND hit_count = 0
      `);

      return result.rowCount || 0;
    } catch (error) {
      console.error("Failed to cleanup old cache:", error);
      return 0;
    }
  }

  async addMemoryFeedback(
    memoryId: number,
    feedbackScore: number,
    feedbackSource: 'user' | 'system' | 'agent',
    feedbackData: Record<string, any> = {}
  ): Promise<void> {
    try {
      // Get current memory entry
      const [memory] = await db.select()
        .from(vectorCache)
        .where(eq(vectorCache.id, memoryId));

      if (!memory) {
        throw new Error(`Memory entry ${memoryId} not found`);
      }

      const previousScore = memory.importanceScore || 0.5;
      const newScore = this.calculateUpdatedImportanceScore(previousScore, feedbackScore, feedbackSource);

      // Update the memory importance score
      await db.update(vectorCache)
        .set({ 
          importanceScore: newScore,
          feedbackScore 
        })
        .where(eq(vectorCache.id, memoryId));

      // Record the evolution
      const evolutionData: InsertAgentMemoryEvolution = {
        agentId: memory.agentId!,
        memoryId,
        evolutionType: feedbackScore > 0 ? 'reinforcement' : 'correction',
        feedbackSource,
        feedbackData,
        previousScore,
        newScore
      };

      await db.insert(agentMemoryEvolution).values(evolutionData);
    } catch (error) {
      console.error("Failed to add memory feedback:", error);
      throw error;
    }
  }

  private calculateUpdatedImportanceScore(
    currentScore: number,
    feedback: number,
    source: string
  ): number {
    let adjustment = 0;
    
    // Weight feedback based on source reliability
    const sourceWeight = {
      'user': 0.8,
      'system': 0.6,
      'agent': 0.4
    }[source] || 0.5;

    // Calculate adjustment based on feedback (-1 to 1 scale)
    adjustment = feedback * sourceWeight * 0.3;
    
    const newScore = currentScore + adjustment;
    return Math.min(1.0, Math.max(0.1, newScore));
  }

  async searchMemoryByContext(
    agentId: string,
    contextFilters: {
      sessionId?: string;
      memoryType?: string;
      minImportance?: number;
      timeRange?: { start: Date; end: Date };
    },
    limit: number = 10
  ): Promise<Array<{
    id: number;
    question: string;
    answer: string;
    importanceScore: number;
    memoryType: string;
    contextMetadata: Record<string, any>;
    createdAt: Date;
  }>> {
    try {
      let query = db.select({
        id: vectorCache.id,
        question: vectorCache.question,
        answer: vectorCache.answer,
        importanceScore: vectorCache.importanceScore,
        memoryType: vectorCache.memoryType,
        contextMetadata: vectorCache.contextMetadata,
        createdAt: vectorCache.createdAt
      })
      .from(vectorCache)
      .where(eq(vectorCache.agentId, agentId));

      // Apply filters
      const conditions = [eq(vectorCache.agentId, agentId)];
      
      if (contextFilters.sessionId) {
        conditions.push(eq(vectorCache.sessionId, contextFilters.sessionId));
      }
      
      if (contextFilters.memoryType) {
        conditions.push(eq(vectorCache.memoryType, contextFilters.memoryType));
      }
      
      if (contextFilters.minImportance) {
        conditions.push(gte(vectorCache.importanceScore, contextFilters.minImportance));
      }

      const results = await db.select({
        id: vectorCache.id,
        question: vectorCache.question,
        answer: vectorCache.answer,
        importanceScore: vectorCache.importanceScore,
        memoryType: vectorCache.memoryType,
        contextMetadata: vectorCache.contextMetadata,
        createdAt: vectorCache.createdAt
      })
      .from(vectorCache)
      .where(and(...conditions))
      .orderBy(desc(vectorCache.importanceScore))
      .limit(limit);

      return results as any[];
    } catch (error) {
      console.error("Failed to search memory by context:", error);
      return [];
    }
  }

  async getMemoryEvolution(agentId: string, memoryId?: number): Promise<Array<{
    id: number;
    memoryId: number;
    evolutionType: string;
    feedbackSource: string;
    previousScore: number;
    newScore: number;
    timestamp: Date;
  }>> {
    try {
      const conditions = [eq(agentMemoryEvolution.agentId, agentId)];
      
      if (memoryId) {
        conditions.push(eq(agentMemoryEvolution.memoryId, memoryId));
      }

      const results = await db.select()
        .from(agentMemoryEvolution)
        .where(and(...conditions))
        .orderBy(desc(agentMemoryEvolution.timestamp));

      return results.map(r => ({
        ...r,
        previousScore: r.previousScore || 0,
        newScore: r.newScore || 0
      }));
    } catch (error) {
      console.error("Failed to get memory evolution:", error);
      return [];
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    if (!this.openaiApiKey) {
      throw new Error("OpenAI API key not configured for embeddings");
    }

    try {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.openaiApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: text,
          encoding_format: "float"
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error("Failed to generate embedding:", error);
      throw error;
    }
  }
}
