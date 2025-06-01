import { storage } from '../storage';

export interface ExternalIntegration {
  id: string;
  name: string;
  type: 'api' | 'webhook' | 'database' | 'file_system' | 'cloud_service';
  status: 'active' | 'inactive' | 'error' | 'pending';
  configuration: {
    endpoint?: string;
    apiKey?: string;
    headers?: Record<string, string>;
    authentication?: {
      type: 'bearer' | 'api_key' | 'oauth' | 'basic';
      credentials: Record<string, any>;
    };
    rateLimits?: {
      requestsPerMinute: number;
      requestsPerHour: number;
      burstLimit: number;
    };
    retryPolicy?: {
      maxRetries: number;
      backoffStrategy: 'exponential' | 'linear' | 'fixed';
      initialDelay: number;
    };
  };
  capabilities: string[];
  lastHealthCheck?: Date;
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    lastRequestTime?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationRequest {
  integrationId: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retryOnFailure?: boolean;
}

export interface IntegrationResponse {
  success: boolean;
  statusCode: number;
  data?: any;
  error?: string;
  responseTime: number;
  timestamp: Date;
}

export class ExternalIntegrationService {
  private integrations: Map<string, ExternalIntegration> = new Map();
  private requestCache: Map<string, { response: IntegrationResponse; expiresAt: Date }> = new Map();

  constructor() {
    this.initializeDefaultIntegrations();
    this.startHealthCheckScheduler();
  }

  private initializeDefaultIntegrations() {
    const defaultIntegrations: ExternalIntegration[] = [
      {
        id: 'salesforce-api',
        name: 'Salesforce CRM Integration',
        type: 'api',
        status: 'inactive',
        configuration: {
          endpoint: 'https://api.salesforce.com/services/data/v57.0',
          authentication: {
            type: 'oauth',
            credentials: {
              clientId: process.env.SALESFORCE_CLIENT_ID,
              clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
              redirectUri: process.env.SALESFORCE_REDIRECT_URI
            }
          },
          rateLimits: {
            requestsPerMinute: 100,
            requestsPerHour: 5000,
            burstLimit: 20
          },
          retryPolicy: {
            maxRetries: 3,
            backoffStrategy: 'exponential',
            initialDelay: 1000
          }
        },
        capabilities: ['leads', 'contacts', 'opportunities', 'accounts', 'tasks'],
        metrics: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTime: 0
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'slack-webhook',
        name: 'Slack Notifications',
        type: 'webhook',
        status: 'inactive',
        configuration: {
          endpoint: process.env.SLACK_WEBHOOK_URL,
          headers: {
            'Content-Type': 'application/json'
          },
          rateLimits: {
            requestsPerMinute: 1,
            requestsPerHour: 60,
            burstLimit: 5
          }
        },
        capabilities: ['notifications', 'alerts', 'status_updates'],
        metrics: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTime: 0
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'hubspot-api',
        name: 'HubSpot CRM Integration',
        type: 'api',
        status: 'inactive',
        configuration: {
          endpoint: 'https://api.hubapi.com',
          authentication: {
            type: 'api_key',
            credentials: {
              apiKey: process.env.HUBSPOT_API_KEY
            }
          },
          rateLimits: {
            requestsPerMinute: 100,
            requestsPerHour: 10000,
            burstLimit: 10
          },
          retryPolicy: {
            maxRetries: 2,
            backoffStrategy: 'exponential',
            initialDelay: 500
          }
        },
        capabilities: ['contacts', 'companies', 'deals', 'tickets', 'analytics'],
        metrics: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTime: 0
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'google-analytics',
        name: 'Google Analytics Integration',
        type: 'api',
        status: 'inactive',
        configuration: {
          endpoint: 'https://analyticsreporting.googleapis.com/v4',
          authentication: {
            type: 'oauth',
            credentials: {
              clientId: process.env.GOOGLE_CLIENT_ID,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET,
              refreshToken: process.env.GOOGLE_REFRESH_TOKEN
            }
          },
          rateLimits: {
            requestsPerMinute: 10,
            requestsPerHour: 1000,
            burstLimit: 5
          }
        },
        capabilities: ['reports', 'real_time', 'goals', 'audiences', 'events'],
        metrics: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTime: 0
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'aws-s3',
        name: 'AWS S3 Storage',
        type: 'cloud_service',
        status: 'inactive',
        configuration: {
          endpoint: 'https://s3.amazonaws.com',
          authentication: {
            type: 'basic',
            credentials: {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
              region: process.env.AWS_REGION || 'us-east-1'
            }
          }
        },
        capabilities: ['file_upload', 'file_download', 'file_management', 'backup'],
        metrics: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTime: 0
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    defaultIntegrations.forEach(integration => {
      this.integrations.set(integration.id, integration);
      // Set status based on credential availability
      if (this.hasRequiredCredentials(integration)) {
        integration.status = 'active';
      }
    });
  }

  private hasRequiredCredentials(integration: ExternalIntegration): boolean {
    const auth = integration.configuration.authentication;
    if (!auth) return true;

    switch (auth.type) {
      case 'api_key':
        return !!auth.credentials.apiKey;
      case 'oauth':
        return !!(auth.credentials.clientId && auth.credentials.clientSecret);
      case 'basic':
        return !!(auth.credentials.accessKeyId && auth.credentials.secretAccessKey);
      case 'bearer':
        return !!auth.credentials.token;
      default:
        return false;
    }
  }

  async makeRequest(request: IntegrationRequest): Promise<IntegrationResponse> {
    const startTime = Date.now();
    const integration = this.integrations.get(request.integrationId);
    
    if (!integration) {
      return {
        success: false,
        statusCode: 404,
        error: `Integration '${request.integrationId}' not found`,
        responseTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }

    if (integration.status !== 'active') {
      return {
        success: false,
        statusCode: 503,
        error: `Integration '${request.integrationId}' is not active`,
        responseTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }

    // Check rate limits
    if (!this.checkRateLimit(integration)) {
      return {
        success: false,
        statusCode: 429,
        error: 'Rate limit exceeded',
        responseTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(request);
    const cached = this.requestCache.get(cacheKey);
    if (cached && cached.expiresAt > new Date()) {
      return cached.response;
    }

    try {
      const response = await this.executeRequest(integration, request);
      
      // Update metrics
      this.updateMetrics(integration, response);
      
      // Cache successful responses
      if (response.success && request.method === 'GET') {
        this.requestCache.set(cacheKey, {
          response,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
        });
      }

      return response;
    } catch (error) {
      const response: IntegrationResponse = {
        success: false,
        statusCode: 500,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
        timestamp: new Date()
      };

      this.updateMetrics(integration, response);
      return response;
    }
  }

  private async executeRequest(integration: ExternalIntegration, request: IntegrationRequest): Promise<IntegrationResponse> {
    const startTime = Date.now();
    const url = `${integration.configuration.endpoint}${request.endpoint}`;
    
    const headers = {
      ...integration.configuration.headers,
      ...request.headers,
      ...this.getAuthHeaders(integration)
    };

    const fetchOptions: RequestInit = {
      method: request.method,
      headers,
      signal: AbortSignal.timeout(request.timeout || 30000)
    };

    if (request.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
      fetchOptions.body = JSON.stringify(request.body);
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }

    const response = await fetch(url, fetchOptions);
    const responseTime = Date.now() - startTime;

    let data;
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : null;
    } catch {
      data = await response.text();
    }

    return {
      success: response.ok,
      statusCode: response.status,
      data,
      error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
      responseTime,
      timestamp: new Date()
    };
  }

  private getAuthHeaders(integration: ExternalIntegration): Record<string, string> {
    const auth = integration.configuration.authentication;
    if (!auth) return {};

    switch (auth.type) {
      case 'api_key':
        return { 'Authorization': `Bearer ${auth.credentials.apiKey}` };
      case 'bearer':
        return { 'Authorization': `Bearer ${auth.credentials.token}` };
      case 'basic':
        const credentials = Buffer.from(
          `${auth.credentials.username}:${auth.credentials.password}`
        ).toString('base64');
        return { 'Authorization': `Basic ${credentials}` };
      default:
        return {};
    }
  }

  private checkRateLimit(integration: ExternalIntegration): boolean {
    const limits = integration.configuration.rateLimits;
    if (!limits) return true;

    // Simplified rate limiting - in production, use a proper rate limiter like Redis
    const now = Date.now();
    const lastRequest = integration.metrics.lastRequestTime;
    
    if (!lastRequest) return true;
    
    const timeSinceLastRequest = now - lastRequest.getTime();
    const minInterval = 60000 / limits.requestsPerMinute; // ms between requests
    
    return timeSinceLastRequest >= minInterval;
  }

  private updateMetrics(integration: ExternalIntegration, response: IntegrationResponse): void {
    integration.metrics.totalRequests++;
    integration.metrics.lastRequestTime = response.timestamp;
    
    if (response.success) {
      integration.metrics.successfulRequests++;
    } else {
      integration.metrics.failedRequests++;
    }

    // Update average response time
    const total = integration.metrics.totalRequests;
    const current = integration.metrics.averageResponseTime;
    integration.metrics.averageResponseTime = 
      ((current * (total - 1)) + response.responseTime) / total;

    integration.updatedAt = new Date();
  }

  private generateCacheKey(request: IntegrationRequest): string {
    return `${request.integrationId}:${request.method}:${request.endpoint}:${
      JSON.stringify(request.body || {})
    }`;
  }

  private startHealthCheckScheduler(): void {
    // Run health checks every 5 minutes
    setInterval(async () => {
      await this.performHealthChecks();
    }, 5 * 60 * 1000);
  }

  private async performHealthChecks(): Promise<void> {
    for (const integration of this.integrations.values()) {
      if (integration.status === 'active') {
        try {
          const healthCheck = await this.makeRequest({
            integrationId: integration.id,
            method: 'GET',
            endpoint: '/health',
            timeout: 5000
          });

          if (!healthCheck.success) {
            integration.status = 'error';
            console.warn(`Health check failed for integration: ${integration.id}`);
          }
        } catch (error) {
          integration.status = 'error';
          console.error(`Health check error for integration ${integration.id}:`, error);
        }

        integration.lastHealthCheck = new Date();
      }
    }
  }

  // Public API methods
  getIntegrations(): ExternalIntegration[] {
    return Array.from(this.integrations.values());
  }

  getIntegration(id: string): ExternalIntegration | undefined {
    return this.integrations.get(id);
  }

  addIntegration(integration: ExternalIntegration): void {
    integration.createdAt = new Date();
    integration.updatedAt = new Date();
    integration.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0
    };
    
    if (this.hasRequiredCredentials(integration)) {
      integration.status = 'active';
    }
    
    this.integrations.set(integration.id, integration);
  }

  updateIntegration(id: string, updates: Partial<ExternalIntegration>): boolean {
    const integration = this.integrations.get(id);
    if (!integration) return false;

    Object.assign(integration, updates, { updatedAt: new Date() });
    
    if (this.hasRequiredCredentials(integration)) {
      integration.status = 'active';
    } else {
      integration.status = 'inactive';
    }

    return true;
  }

  removeIntegration(id: string): boolean {
    return this.integrations.delete(id);
  }

  async testIntegration(id: string): Promise<IntegrationResponse> {
    return await this.makeRequest({
      integrationId: id,
      method: 'GET',
      endpoint: '/health',
      timeout: 10000
    });
  }

  getIntegrationMetrics(id: string): any {
    const integration = this.integrations.get(id);
    if (!integration) return null;

    return {
      ...integration.metrics,
      status: integration.status,
      lastHealthCheck: integration.lastHealthCheck,
      uptime: integration.status === 'active' ? 
        Date.now() - integration.createdAt.getTime() : 0
    };
  }

  clearCache(): void {
    this.requestCache.clear();
  }
}

export const externalIntegrationService = new ExternalIntegrationService();