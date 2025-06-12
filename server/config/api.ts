// API Configuration
export const API_CONFIG = {
  // API versioning
  version: process.env.API_VERSION || 'v1',
  baseUrl: process.env.API_BASE_URL || '/api',
  
  // Get the full API path with version
  getVersionedPath(endpoint: string = ''): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.baseUrl}/${this.version}${cleanEndpoint}`;
  },
  
  // Get the base versioned API path
  get basePath(): string {
    return `${this.baseUrl}/${this.version}`;
  },
  
  // API documentation
  docs: {
    title: 'AI Agent Platform API',
    description: 'Comprehensive API for managing AI agents, campaigns, and integrations',
    version: process.env.API_VERSION || '1.0.0',
    termsOfService: 'https://aiagentplatform.com/terms',
    contact: {
      name: 'API Support',
      email: 'api-support@aiagentplatform.com',
      url: 'https://aiagentplatform.com/support'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  
  // Rate limiting configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },
  
  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
  }
};

// Legacy API support (for backward compatibility)
export const LEGACY_API_CONFIG = {
  enabled: process.env.ENABLE_LEGACY_API === 'true',
  deprecationWarning: true,
  sunsetDate: process.env.LEGACY_API_SUNSET_DATE || '2025-12-31'
};