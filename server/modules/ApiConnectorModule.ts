export interface ApiConnectorConfig {
  endpoints: Record<string, EndpointConfig>;
  authentication: AuthConfig;
  rateLimiting: {
    requestsPerMinute: number;
    burstLimit: number;
  };
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
  timeout: number;
  validateResponses: boolean;
}

export interface EndpointConfig {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  bodyTemplate?: string;
  responseMapping?: Record<string, string>;
  cacheTtl?: number;
}

export interface AuthConfig {
  type: "none" | "bearer" | "basic" | "apikey" | "oauth2";
  credentials?: {
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    keyHeader?: string;
    clientId?: string;
    clientSecret?: string;
    tokenUrl?: string;
  };
}

export interface ApiConnectorRequest {
  endpoint: string;
  parameters?: Record<string, any>;
  overrideAuth?: AuthConfig;
  customHeaders?: Record<string, string>;
  timeout?: number;
}

export class ApiConnectorModule {
  private config: ApiConnectorConfig;
  private cache: Map<string, { data: any; expires: number }> = new Map();
  private rateLimitTracker: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(config: ApiConnectorConfig) {
    this.config = config;
  }

  async invoke(input: ApiConnectorRequest): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    metadata: {
      endpoint: string;
      responseTime: number;
      cached: boolean;
      rateLimited: boolean;
      retries: number;
    };
  }> {
    const startTime = Date.now();
    let retries = 0;
    let cached = false;
    let rateLimited = false;

    try {
      // Check rate limiting
      if (this.isRateLimited()) {
        rateLimited = true;
        throw new Error("Rate limit exceeded");
      }

      // Check cache
      const cacheKey = this.generateCacheKey(input);
      const cachedResult = this.getFromCache(cacheKey);
      if (cachedResult) {
        cached = true;
        return {
          success: true,
          data: cachedResult,
          metadata: {
            endpoint: input.endpoint,
            responseTime: Date.now() - startTime,
            cached: true,
            rateLimited: false,
            retries: 0,
          },
        };
      }

      // Get endpoint configuration
      const endpointConfig = this.config.endpoints[input.endpoint];
      if (!endpointConfig) {
        throw new Error(`Endpoint '${input.endpoint}' not configured`);
      }

      // Execute request with retry logic
      let lastError: Error | null = null;
      while (retries <= this.config.retryPolicy.maxRetries) {
        try {
          const response = await this.executeRequest(endpointConfig, input);
          
          // Cache successful response
          if (endpointConfig.cacheTtl && endpointConfig.cacheTtl > 0) {
            this.cacheResponse(cacheKey, response, endpointConfig.cacheTtl);
          }

          return {
            success: true,
            data: response,
            metadata: {
              endpoint: input.endpoint,
              responseTime: Date.now() - startTime,
              cached: false,
              rateLimited: false,
              retries,
            },
          };
        } catch (error) {
          lastError = error as Error;
          retries++;
          
          if (retries <= this.config.retryPolicy.maxRetries) {
            const delay = this.config.retryPolicy.initialDelay * 
              Math.pow(this.config.retryPolicy.backoffMultiplier, retries - 1);
            await this.sleep(delay);
          }
        }
      }

      throw lastError || new Error("Max retries exceeded");

    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        metadata: {
          endpoint: input.endpoint,
          responseTime: Date.now() - startTime,
          cached,
          rateLimited,
          retries,
        },
      };
    }
  }

  private async executeRequest(endpointConfig: EndpointConfig, input: ApiConnectorRequest): Promise<any> {
    // Build URL with parameters
    let url = endpointConfig.url;
    const queryParams = { ...endpointConfig.queryParams, ...input.parameters };
    
    if (Object.keys(queryParams).length > 0) {
      const params = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
      url += (url.includes('?') ? '&' : '?') + params.toString();
    }

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...endpointConfig.headers,
      ...input.customHeaders,
    };

    // Add authentication
    const authConfig = input.overrideAuth || this.config.authentication;
    this.addAuthHeaders(headers, authConfig);

    // Build request body
    let body: string | undefined;
    if (endpointConfig.method !== 'GET' && endpointConfig.bodyTemplate) {
      body = this.populateTemplate(endpointConfig.bodyTemplate, input.parameters || {});
    }

    // Execute request
    const controller = new AbortController();
    const timeout = input.timeout || this.config.timeout;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: endpointConfig.method,
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();

      // Apply response mapping if configured
      if (endpointConfig.responseMapping) {
        return this.mapResponse(responseData, endpointConfig.responseMapping);
      }

      // Validate response if configured
      if (this.config.validateResponses) {
        this.validateResponse(responseData);
      }

      return responseData;

    } finally {
      clearTimeout(timeoutId);
    }
  }

  private addAuthHeaders(headers: Record<string, string>, authConfig: AuthConfig): void {
    switch (authConfig.type) {
      case 'bearer':
        if (authConfig.credentials?.token) {
          headers['Authorization'] = `Bearer ${authConfig.credentials.token}`;
        }
        break;
      case 'basic':
        if (authConfig.credentials?.username && authConfig.credentials?.password) {
          const credentials = btoa(`${authConfig.credentials.username}:${authConfig.credentials.password}`);
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;
      case 'apikey':
        if (authConfig.credentials?.apiKey && authConfig.credentials?.keyHeader) {
          headers[authConfig.credentials.keyHeader] = authConfig.credentials.apiKey;
        }
        break;
    }
  }

  private populateTemplate(template: string, parameters: Record<string, any>): string {
    let result = template;
    Object.entries(parameters).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), String(value));
    });
    return result;
  }

  private mapResponse(data: any, mapping: Record<string, string>): any {
    const result: any = {};
    Object.entries(mapping).forEach(([targetKey, sourcePath]) => {
      result[targetKey] = this.getNestedValue(data, sourcePath);
    });
    return result;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private validateResponse(data: any): void {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid response format');
    }
  }

  private isRateLimited(): boolean {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window
    
    // Clean old entries
    for (const [key, tracker] of this.rateLimitTracker.entries()) {
      if (tracker.resetTime < windowStart) {
        this.rateLimitTracker.delete(key);
      }
    }

    const currentWindow = Math.floor(now / 60000);
    const tracker = this.rateLimitTracker.get(String(currentWindow)) || { count: 0, resetTime: now };
    
    if (tracker.count >= this.config.rateLimiting.requestsPerMinute) {
      return true;
    }

    tracker.count++;
    this.rateLimitTracker.set(String(currentWindow), tracker);
    return false;
  }

  private generateCacheKey(input: ApiConnectorRequest): string {
    return `${input.endpoint}:${JSON.stringify(input.parameters)}`;
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  private cacheResponse(key: string, data: any, ttlSeconds: number): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + (ttlSeconds * 1000),
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getSchema(): any {
    return {
      type: "object",
      properties: {
        endpoint: {
          type: "string",
          description: "The endpoint identifier to call",
          enum: Object.keys(this.config.endpoints),
        },
        parameters: {
          type: "object",
          description: "Parameters to pass to the endpoint",
          additionalProperties: true,
        },
        customHeaders: {
          type: "object",
          description: "Custom headers to include",
          additionalProperties: { type: "string" },
        },
        timeout: {
          type: "number",
          description: "Request timeout in milliseconds",
          minimum: 1000,
          maximum: 60000,
        },
      },
      required: ["endpoint"],
    };
  }
}