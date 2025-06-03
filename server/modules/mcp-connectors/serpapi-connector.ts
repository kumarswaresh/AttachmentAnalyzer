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
  category?: string;
  checkin_date?: string;
  checkout_date?: string;
  adults?: number;
  children?: number;
  travel_class?: string;
  departure_id?: string;
  arrival_id?: string;
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
      description: 'Search Google and other search engines via SerpAPI with travel-focused categories',
      category: 'search',
      type: 'search',
      ...config
    });
    
    this.apiKey = process.env.SERPAPI_API_KEY || config.apiKey;
    // Allow initialization without API key for configuration purposes
  }

  private validateApiKey(): void {
    if (!this.apiKey) {
      throw new Error('SERPAPI_API_KEY is required. Please configure your API key in the environment variables.');
    }
  }

  async search(params: SerpAPISearchParams): Promise<SerpAPIResult> {
    this.validateApiKey();
    
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

  async searchHotels(params: SerpAPISearchParams): Promise<any> {
    this.validateApiKey();
    
    try {
      const searchParams = new URLSearchParams({
        api_key: this.apiKey,
        engine: 'google_hotels',
        q: params.q,
        location: params.location || '',
        checkin_date: params.checkin_date || '',
        checkout_date: params.checkout_date || '',
        adults: (params.adults || 1).toString(),
        children: (params.children || 0).toString(),
        gl: params.gl || 'us',
        hl: params.hl || 'en',
        output: 'json'
      });

      const response = await axios.get(`${this.baseUrl}?${searchParams}`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Hotel search failed: ${error.message}`);
    }
  }

  async searchFlights(params: SerpAPISearchParams): Promise<any> {
    this.validateApiKey();
    
    try {
      const searchParams = new URLSearchParams({
        api_key: this.apiKey,
        engine: 'google_flights',
        departure_id: params.departure_id || '',
        arrival_id: params.arrival_id || '',
        outbound_date: params.checkin_date || '',
        return_date: params.checkout_date || '',
        adults: (params.adults || 1).toString(),
        children: (params.children || 0).toString(),
        travel_class: params.travel_class || 'Economy',
        gl: params.gl || 'us',
        hl: params.hl || 'en',
        output: 'json'
      });

      const response = await axios.get(`${this.baseUrl}?${searchParams}`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Flight search failed: ${error.message}`);
    }
  }

  async searchEvents(params: SerpAPISearchParams): Promise<any> {
    this.validateApiKey();
    
    try {
      const searchParams = new URLSearchParams({
        api_key: this.apiKey,
        engine: 'google_events',
        q: params.q,
        location: params.location || '',
        start_date: params.checkin_date || '',
        end_date: params.checkout_date || '',
        gl: params.gl || 'us',
        hl: params.hl || 'en',
        output: 'json'
      });

      const response = await axios.get(`${this.baseUrl}?${searchParams}`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Events search failed: ${error.message}`);
    }
  }

  async searchLocal(params: SerpAPISearchParams): Promise<any> {
    this.validateApiKey();
    
    try {
      const searchParams = new URLSearchParams({
        api_key: this.apiKey,
        engine: 'google_local',
        q: params.q,
        location: params.location || '',
        gl: params.gl || 'us',
        hl: params.hl || 'en',
        output: 'json'
      });

      const response = await axios.get(`${this.baseUrl}?${searchParams}`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Local search failed: ${error.message}`);
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

      case 'search_hotels':
        return await this.searchHotels(params);

      case 'search_flights':
        return await this.searchFlights(params);

      case 'search_events':
        return await this.searchEvents(params);

      case 'search_local':
      case 'search_destinations':
        return await this.searchLocal(params);

      case 'search_trends':
        return await this.search({ ...params, engine: 'google_trends_autocomplete' });

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  getEndpoints() {
    return [
      {
        path: '/search',
        method: 'POST' as const,
        description: 'General web search via SerpAPI',
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
        path: '/search/hotels',
        method: 'POST' as const,
        description: 'Search hotels with booking details',
        schema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Hotel or destination name' },
            location: { type: 'string', description: 'City or location' },
            checkin_date: { type: 'string', description: 'Check-in date (YYYY-MM-DD)' },
            checkout_date: { type: 'string', description: 'Check-out date (YYYY-MM-DD)' },
            adults: { type: 'number', default: 1, description: 'Number of adults' },
            children: { type: 'number', default: 0, description: 'Number of children' },
            gl: { type: 'string', default: 'us' },
            hl: { type: 'string', default: 'en' }
          },
          required: ['q']
        }
      },
      {
        path: '/search/flights',
        method: 'POST' as const,
        description: 'Search flights with travel details',
        schema: {
          type: 'object',
          properties: {
            departure_id: { type: 'string', description: 'Departure airport code' },
            arrival_id: { type: 'string', description: 'Arrival airport code' },
            checkin_date: { type: 'string', description: 'Departure date (YYYY-MM-DD)' },
            checkout_date: { type: 'string', description: 'Return date (YYYY-MM-DD)' },
            adults: { type: 'number', default: 1, description: 'Number of adults' },
            children: { type: 'number', default: 0, description: 'Number of children' },
            travel_class: { 
              type: 'string', 
              default: 'Economy',
              enum: ['Economy', 'Premium Economy', 'Business', 'First'],
              description: 'Travel class'
            },
            gl: { type: 'string', default: 'us' },
            hl: { type: 'string', default: 'en' }
          },
          required: ['departure_id', 'arrival_id', 'checkin_date']
        }
      },
      {
        path: '/search/events',
        method: 'POST' as const,
        description: 'Search events, festivals, and activities',
        schema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Event name or type (festivals, concerts, sports)' },
            location: { type: 'string', description: 'City or location' },
            checkin_date: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            checkout_date: { type: 'string', description: 'End date (YYYY-MM-DD)' },
            category: { 
              type: 'string',
              enum: ['festivals', 'concerts', 'sports', 'exhibitions', 'theater', 'nightlife', 'food'],
              description: 'Event category'
            },
            gl: { type: 'string', default: 'us' },
            hl: { type: 'string', default: 'en' }
          },
          required: ['q']
        }
      },
      {
        path: '/search/destinations',
        method: 'POST' as const,
        description: 'Search travel destinations and local attractions',
        schema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Destination or attraction name' },
            location: { type: 'string', description: 'City or region' },
            category: { 
              type: 'string',
              enum: ['attractions', 'restaurants', 'museums', 'parks', 'beaches', 'shopping', 'nightlife'],
              description: 'Destination category'
            },
            gl: { type: 'string', default: 'us' },
            hl: { type: 'string', default: 'en' }
          },
          required: ['q']
        }
      },
      {
        path: '/search/news',
        method: 'POST' as const,
        description: 'Search travel news and updates',
        schema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'News search query' },
            location: { type: 'string', description: 'Geographic focus' },
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
        description: 'Search destination and travel images',
        schema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Image search query' },
            location: { type: 'string', description: 'Location context' },
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
      'hotel_search',
      'flight_search',
      'events_search',
      'destinations_search',
      'local_search',
      'travel_planning',
      'answer_extraction',
      'knowledge_graph'
    ];
  }
}