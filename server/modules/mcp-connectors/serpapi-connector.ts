import { BaseMCPConnector } from './base-connector';
import axios from 'axios';

export interface SerpAPISearchParams {
  q: string;
  engine?: string;
  location?: string;
  hl?: string;
  gl?: string;
  num?: number;
  start?: number;
}

export interface SerpAPIResult {
  organic_results?: Array<{
    position: number;
    title: string;
    link: string;
    snippet: string;
    displayed_link: string;
  }>;
  answer_box?: {
    type: string;
    title: string;
    snippet: string;
    link: string;
  };
  knowledge_graph?: {
    title: string;
    type: string;
    description: string;
    thumbnail?: string;
  };
  related_questions?: Array<{
    question: string;
    snippet: string;
    link: string;
  }>;
}

export class SerpAPIConnector extends BaseMCPConnector {
  private apiKey: string;
  private baseUrl = 'https://serpapi.com/search';

  constructor(config: any) {
    super({
      id: 'serpapi',
      name: 'SerpAPI Search',
      description: 'Search Google and other search engines via SerpAPI',
      category: 'search',
      type: 'search',
      ...config
    });
    
    this.apiKey = process.env.SERPAPI_API_KEY || config.apiKey;
    if (!this.apiKey) {
      throw new Error('SERPAPI_API_KEY is required for SerpAPI connector');
    }
  }

  async search(params: SerpAPISearchParams): Promise<SerpAPIResult> {
    try {
      const searchParams = new URLSearchParams({
        api_key: this.apiKey,
        q: params.q,
        engine: params.engine || 'google',
        location: params.location || '',
        hl: params.hl || 'en',
        gl: params.gl || 'us',
        num: (params.num || 10).toString(),
        start: (params.start || 0).toString(),
        output: 'json'
      });

      const response = await axios.get(`${this.baseUrl}?${searchParams}`);
      
      return {
        organic_results: response.data.organic_results || [],
        answer_box: response.data.answer_box,
        knowledge_graph: response.data.knowledge_graph,
        related_questions: response.data.related_questions || []
      };
    } catch (error: any) {
      throw new Error(`SerpAPI search failed: ${error.message}`);
    }
  }

  async processMessage(message: any): Promise<any> {
    const { action, params } = message;

    switch (action) {
      case 'search':
        return await this.search(params);
      
      case 'search_news':
        return await this.search({ ...params, engine: 'google_news' });
      
      case 'search_images':
        return await this.search({ ...params, engine: 'google_images' });
      
      case 'search_videos':
        return await this.search({ ...params, engine: 'google_videos' });

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  getEndpoints() {
    return [
      {
        path: '/search',
        method: 'POST' as const,
        description: 'Search Google via SerpAPI',
        schema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search query' },
            engine: { type: 'string', default: 'google' },
            location: { type: 'string', description: 'Search location' },
            hl: { type: 'string', default: 'en' },
            gl: { type: 'string', default: 'us' },
            num: { type: 'number', default: 10 },
            start: { type: 'number', default: 0 }
          },
          required: ['q']
        }
      },
      {
        path: '/search/news',
        method: 'POST' as const,
        description: 'Search Google News via SerpAPI',
        schema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search query' },
            location: { type: 'string', description: 'Search location' },
            hl: { type: 'string', default: 'en' },
            gl: { type: 'string', default: 'us' },
            num: { type: 'number', default: 10 }
          },
          required: ['q']
        }
      },
      {
        path: '/search/images',
        method: 'POST' as const,
        description: 'Search Google Images via SerpAPI',
        schema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search query' },
            location: { type: 'string', description: 'Search location' },
            num: { type: 'number', default: 10 }
          },
          required: ['q']
        }
      }
    ];
  }

  getCapabilities() {
    return [
      'web_search',
      'news_search',
      'image_search',
      'video_search',
      'answer_extraction',
      'knowledge_graph'
    ];
  }
}