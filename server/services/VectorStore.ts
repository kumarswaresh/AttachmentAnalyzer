import { db } from "../db";
import { vectorCache, agentMemoryEvolution } from "@shared/schema";
import { sql, eq, desc, and, gte, or } from "drizzle-orm";
import type { InsertAgentMemoryEvolution, InsertVectorCache } from "@shared/schema";

export class VectorStore {
  private openaiApiKey: string;

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY || process.env.VECTOR_API_KEY || "";
  }

  async cacheResult(agentId: string, question: string, answer: string): Promise<void> {
    try {
      // Generate embedding for the question
      const embedding = await this.generateEmbedding(question);
      
      await db.insert(vectorCache).values({
        agentId,
        question,
        questionEmbedding: embedding,
        answer,
        hitCount: 0
      });
    } catch (error) {
      console.error("Failed to cache vector result:", error);
      // Don't throw - caching failures shouldn't break the main flow
    }
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
