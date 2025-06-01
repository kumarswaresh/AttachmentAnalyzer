import { EventEmitter } from 'events';

export interface ExternalServiceConfig {
  name: string;
  baseUrl: string;
  authentication: {
    type: 'api-key' | 'bearer' | 'oauth' | 'basic';
    credentials: Record<string, string>;
  };
  rateLimit?: {
    requestsPerMinute: number;
    burstLimit: number;
  };
  timeout?: number;
  retryPolicy?: {
    maxRetries: number;
    backoffMultiplier: number;
  };
}

export interface IntegrationResponse {
  success: boolean;
  data?: any;
  error?: string;
  statusCode?: number;
  headers?: Record<string, string>;
  metadata?: {
    requestId: string;
    timestamp: string;
    processingTime: number;
  };
}

export class ExternalIntegrationService extends EventEmitter {
  private services: Map<string, ExternalServiceConfig> = new Map();
  private rateLimiters: Map<string, { count: number; resetTime: number }> = new Map();

  constructor() {
    super();
    this.initializeDefaultServices();
  }

  private initializeDefaultServices(): void {
    // Google Trends API Integration
    this.registerService({
      name: 'google-trends',
      baseUrl: 'https://trends.googleapis.com/trends/api',
      authentication: {
        type: 'api-key',
        credentials: {
          key: process.env.GOOGLE_TRENDS_API_KEY || ''
        }
      },
      rateLimit: {
        requestsPerMinute: 100,
        burstLimit: 10
      },
      timeout: 30000,
      retryPolicy: {
        maxRetries: 3,
        backoffMultiplier: 2
      }
    });

    // Market Data API Integration
    this.registerService({
      name: 'market-data',
      baseUrl: process.env.MARKET_DATA_API_URL || 'https://api.marketdata.com/v1',
      authentication: {
        type: 'bearer',
        credentials: {
          token: process.env.MARKET_DATA_API_TOKEN || ''
        }
      },
      rateLimit: {
        requestsPerMinute: 60,
        burstLimit: 5
      },
      timeout: 30000
    });

    // Social Media Analytics API
    this.registerService({
      name: 'social-analytics',
      baseUrl: process.env.SOCIAL_ANALYTICS_API_URL || 'https://api.socialanalytics.com/v2',
      authentication: {
        type: 'oauth',
        credentials: {
          clientId: process.env.SOCIAL_ANALYTICS_CLIENT_ID || '',
          clientSecret: process.env.SOCIAL_ANALYTICS_CLIENT_SECRET || '',
          accessToken: process.env.SOCIAL_ANALYTICS_ACCESS_TOKEN || ''
        }
      },
      rateLimit: {
        requestsPerMinute: 120,
        burstLimit: 15
      }
    });

    // Competitor Analysis API
    this.registerService({
      name: 'competitor-analysis',
      baseUrl: process.env.COMPETITOR_API_URL || 'https://api.competitorinsight.com/v1',
      authentication: {
        type: 'api-key',
        credentials: {
          key: process.env.COMPETITOR_API_KEY || ''
        }
      },
      rateLimit: {
        requestsPerMinute: 50,
        burstLimit: 5
      }
    });
  }

  public registerService(config: ExternalServiceConfig): void {
    this.services.set(config.name, config);
    this.emit('serviceRegistered', config.name);
  }

  public async makeRequest(
    serviceName: string,
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      data?: any;
      headers?: Record<string, string>;
      params?: Record<string, string>;
    } = {}
  ): Promise<IntegrationResponse> {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const service = this.services.get(serviceName);
      if (!service) {
        return {
          success: false,
          error: `Service '${serviceName}' not found`,
          metadata: {
            requestId,
            timestamp: new Date().toISOString(),
            processingTime: Date.now() - startTime
          }
        };
      }

      // Check rate limiting
      if (!this.checkRateLimit(serviceName, service)) {
        return {
          success: false,
          error: 'Rate limit exceeded',
          statusCode: 429,
          metadata: {
            requestId,
            timestamp: new Date().toISOString(),
            processingTime: Date.now() - startTime
          }
        };
      }

      // Build request URL
      const url = new URL(endpoint, service.baseUrl);
      if (options.params) {
        Object.entries(options.params).forEach(([key, value]) => {
          url.searchParams.append(key, value);
        });
      }

      // Build headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Agent-Platform/1.0.0',
        ...options.headers
      };

      // Add authentication headers
      this.addAuthenticationHeaders(headers, service.authentication);

      // Make the request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), service.timeout || 30000);

      const fetchOptions: RequestInit = {
        method: options.method || 'GET',
        headers,
        signal: controller.signal
      };

      if (options.data && (options.method === 'POST' || options.method === 'PUT')) {
        fetchOptions.body = JSON.stringify(options.data);
      }

      const response = await fetch(url.toString(), fetchOptions);
      clearTimeout(timeoutId);

      const responseData = await this.parseResponse(response);

      this.emit('requestCompleted', {
        serviceName,
        endpoint,
        statusCode: response.status,
        success: response.ok,
        processingTime: Date.now() - startTime
      });

      return {
        success: response.ok,
        data: responseData,
        statusCode: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };

    } catch (error) {
      this.emit('requestError', {
        serviceName,
        endpoint,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      };
    }
  }

  private addAuthenticationHeaders(headers: Record<string, string>, auth: ExternalServiceConfig['authentication']): void {
    switch (auth.type) {
      case 'api-key':
        if (auth.credentials.key) {
          headers['X-API-Key'] = auth.credentials.key;
        }
        break;
      case 'bearer':
        if (auth.credentials.token) {
          headers['Authorization'] = `Bearer ${auth.credentials.token}`;
        }
        break;
      case 'oauth':
        if (auth.credentials.accessToken) {
          headers['Authorization'] = `Bearer ${auth.credentials.accessToken}`;
        }
        break;
      case 'basic':
        if (auth.credentials.username && auth.credentials.password) {
          const credentials = Buffer.from(`${auth.credentials.username}:${auth.credentials.password}`).toString('base64');
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;
    }
  }

  private async parseResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      return await response.json();
    } else if (contentType?.includes('text/')) {
      return await response.text();
    } else {
      return await response.arrayBuffer();
    }
  }

  private checkRateLimit(serviceName: string, service: ExternalServiceConfig): boolean {
    if (!service.rateLimit) return true;

    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    
    let limiter = this.rateLimiters.get(serviceName);
    if (!limiter || now > limiter.resetTime) {
      limiter = {
        count: 0,
        resetTime: now + windowMs
      };
      this.rateLimiters.set(serviceName, limiter);
    }

    if (limiter.count >= service.rateLimit.requestsPerMinute) {
      return false;
    }

    limiter.count++;
    return true;
  }

  // Specific service methods for common use cases

  public async getTrendingTopics(region: string = 'US', category?: string): Promise<IntegrationResponse> {
    return this.makeRequest('google-trends', '/explore', {
      method: 'GET',
      params: {
        geo: region,
        cat: category || '0',
        time: 'today 12-m',
        gprop: ''
      }
    });
  }

  public async getMarketData(symbol: string, timeframe: string = '1D'): Promise<IntegrationResponse> {
    return this.makeRequest('market-data', '/quote', {
      method: 'GET',
      params: {
        symbol,
        timeframe
      }
    });
  }

  public async getSocialMediaMetrics(platform: string, account: string): Promise<IntegrationResponse> {
    return this.makeRequest('social-analytics', `/metrics/${platform}/${account}`, {
      method: 'GET'
    });
  }

  public async getCompetitorAnalysis(domain: string, competitors: string[]): Promise<IntegrationResponse> {
    return this.makeRequest('competitor-analysis', '/analyze', {
      method: 'POST',
      data: {
        target_domain: domain,
        competitor_domains: competitors,
        metrics: ['traffic', 'keywords', 'backlinks', 'social']
      }
    });
  }

  public async getIndustryBenchmarks(industry: string): Promise<IntegrationResponse> {
    return this.makeRequest('market-data', `/benchmarks/${industry}`, {
      method: 'GET'
    });
  }

  // Service management methods

  public getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }

  public getServiceConfig(serviceName: string): ExternalServiceConfig | undefined {
    return this.services.get(serviceName);
  }

  public updateServiceCredentials(serviceName: string, credentials: Record<string, string>): boolean {
    const service = this.services.get(serviceName);
    if (!service) return false;

    service.authentication.credentials = { ...service.authentication.credentials, ...credentials };
    this.emit('credentialsUpdated', serviceName);
    return true;
  }

  public testServiceConnection(serviceName: string): Promise<IntegrationResponse> {
    return this.makeRequest(serviceName, '/health', { method: 'GET' });
  }

  public getRateLimitStatus(serviceName: string): { remaining: number; resetTime: number } | null {
    const service = this.services.get(serviceName);
    const limiter = this.rateLimiters.get(serviceName);
    
    if (!service?.rateLimit || !limiter) return null;

    return {
      remaining: Math.max(0, service.rateLimit.requestsPerMinute - limiter.count),
      resetTime: limiter.resetTime
    };
  }
}

export const externalIntegrationService = new ExternalIntegrationService();