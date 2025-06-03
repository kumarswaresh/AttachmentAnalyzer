import { BaseMCPConnector } from './base-connector';
import axios from 'axios';

export interface TrendsSearchParams {
  keyword: string;
  geo?: string;
  time?: string;
  category?: number;
  property?: string;
}

export interface TrendsResult {
  interest_over_time?: Array<{
    timestamp: string;
    value: number;
  }>;
  interest_by_region?: Array<{
    geoName: string;
    value: number;
  }>;
  related_topics?: Array<{
    query: string;
    value: number;
    extracted_value: number;
  }>;
  related_queries?: Array<{
    query: string;
    value: number;
    extracted_value: number;
  }>;
  trending_searches?: Array<{
    query: string;
    exploreLink: string;
    formattedTraffic: string;
  }>;
}

export class GoogleTrendsConnector extends BaseMCPConnector {
  private apiKey: string;
  private baseUrl = 'https://serpapi.com/search';

  constructor(config: any) {
    super({
      id: 'google-trends',
      name: 'Google Trends',
      description: 'Access Google Trends data for keyword research and market analysis',
      category: 'analytics',
      type: 'trends',
      ...config
    });
    
    this.apiKey = process.env.SERPAPI_API_KEY || config.apiKey;
    if (!this.apiKey) {
      throw new Error('SERPAPI_API_KEY is required for Google Trends connector');
    }
  }

  async getTrends(params: TrendsSearchParams): Promise<TrendsResult> {
    try {
      const searchParams = new URLSearchParams({
        api_key: this.apiKey,
        engine: 'google_trends',
        q: params.keyword,
        geo: params.geo || 'US',
        time: params.time || 'today 12-m',
        category: (params.category || 0).toString(),
        property: params.property || '',
        output: 'json'
      });

      const response = await axios.get(`${this.baseUrl}?${searchParams}`);
      
      return {
        interest_over_time: response.data.interest_over_time?.timeline_data || [],
        interest_by_region: response.data.interest_by_region || [],
        related_topics: response.data.related_topics?.rising || [],
        related_queries: response.data.related_queries?.rising || [],
        trending_searches: response.data.trending_searches || []
      };
    } catch (error: any) {
      throw new Error(`Google Trends search failed: ${error.message}`);
    }
  }

  async getTrendingSearches(geo: string = 'US'): Promise<any> {
    try {
      const searchParams = new URLSearchParams({
        api_key: this.apiKey,
        engine: 'google_trends_trending_now',
        geo: geo,
        output: 'json'
      });

      const response = await axios.get(`${this.baseUrl}?${searchParams}`);
      return response.data.trending_searches || [];
    } catch (error: any) {
      throw new Error(`Trending searches failed: ${error.message}`);
    }
  }

  async processMessage(message: any): Promise<any> {
    const { action, params } = message;

    switch (action) {
      case 'get_trends':
        return await this.getTrends(params);
      
      case 'get_trending_searches':
        return await this.getTrendingSearches(params.geo);
      
      case 'compare_keywords':
        const keywords = params.keywords || [];
        const results = await Promise.all(
          keywords.map((keyword: string) => 
            this.getTrends({ ...params, keyword })
          )
        );
        return { comparison: results };

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  getEndpoints() {
    return [
      {
        path: '/trends',
        method: 'POST' as const,
        description: 'Get Google Trends data for a keyword',
        schema: {
          type: 'object',
          properties: {
            keyword: { type: 'string', description: 'Search keyword' },
            geo: { type: 'string', default: 'US', description: 'Geographic location' },
            time: { type: 'string', default: 'today 12-m', description: 'Time range' },
            category: { type: 'number', default: 0, description: 'Category ID' }
          },
          required: ['keyword']
        }
      },
      {
        path: '/trending',
        method: 'GET' as const,
        description: 'Get current trending searches',
        schema: {
          type: 'object',
          properties: {
            geo: { type: 'string', default: 'US', description: 'Geographic location' }
          }
        }
      },
      {
        path: '/compare',
        method: 'POST' as const,
        description: 'Compare multiple keywords trends',
        schema: {
          type: 'object',
          properties: {
            keywords: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Array of keywords to compare' 
            },
            geo: { type: 'string', default: 'US' },
            time: { type: 'string', default: 'today 12-m' }
          },
          required: ['keywords']
        }
      }
    ];
  }

  getCapabilities() {
    return [
      'trend_analysis',
      'keyword_research',
      'market_analysis',
      'trending_topics',
      'geographic_trends',
      'temporal_analysis'
    ];
  }
}