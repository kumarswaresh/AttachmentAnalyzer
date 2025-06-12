# API Versioning Implementation

## Overview

The AI Agent Platform now implements comprehensive API versioning with configurable version prefixes, backward compatibility, and structured endpoint organization.

## Implementation Details

### Version Configuration
- **Current Version**: v1
- **Base Path**: `/api/v1`
- **Legacy Support**: Enabled with deprecation warnings
- **Sunset Date**: 2025-12-31

### Architecture Components

#### 1. API Configuration (`server/config/api.ts`)
- Centralized version management
- Environment-based configuration
- Legacy API support settings
- Documentation metadata

#### 2. Versioning Middleware (`server/middleware/api-versioning.ts`)
- Automatic version header injection
- Legacy endpoint detection
- Deprecation warnings
- Request logging

#### 3. Route Organization (`server/routes/v1/`)
- Structured endpoint organization
- Version-specific route handlers
- Modular architecture

#### 4. Frontend Integration (`client/src/lib/queryClient.ts`)
- Automatic URL versioning
- Backward compatibility
- Centralized API configuration

### Endpoint Structure

#### Versioned Endpoints (v1)
```
/api/v1/marketing/demo-campaign
/api/v1/marketing/demo-campaign-bedrock
/api/v1/user/profile
/api/v1/agents
/api/v1/credentials
/api/v1/health
```

#### Legacy Endpoints (Deprecated)
```
/api/marketing/demo-campaign → redirects to /api/v1/marketing/demo-campaign
/api/user/profile → redirects to /api/v1/user/profile
```

### Response Headers

All API responses include versioning information:
- `X-API-Version`: Current API version
- `X-API-Deprecated`: Present for legacy endpoints
- `X-API-Sunset-Date`: Deprecation timeline

### Frontend Integration

#### Automatic URL Versioning
```typescript
// Automatically converts to /api/v1/endpoint
const response = await apiRequest('GET', '/api/endpoint');

// Query keys automatically versioned
const { data } = useQuery({
  queryKey: ['/api/v1/users'], // Auto-converted
});
```

#### Manual Version Control
```typescript
// Explicit version control
const url = getApiUrl('/api/users'); // Returns /api/v1/users
```

### Testing & Monitoring

#### API Version Status Page (`/api-version-status`)
- Real-time endpoint testing
- Version compatibility checks
- Response time monitoring
- Error tracking

#### Test Coverage
- Marketing campaign endpoints
- User management APIs
- Authentication endpoints
- Health checks

### Migration Strategy

#### Phase 1: Implementation (Current)
- All new endpoints use v1 prefix
- Legacy endpoints remain functional
- Deprecation warnings implemented

#### Phase 2: Migration (Q3 2025)
- Frontend migration to v1 endpoints
- Enhanced monitoring and alerts
- Documentation updates

#### Phase 3: Sunset (Q4 2025)
- Legacy endpoint removal
- v2 planning and implementation
- Complete migration verification

### Development Guidelines

#### Creating New Endpoints
1. Use `/api/v1` prefix for all new routes
2. Add appropriate Swagger documentation
3. Include version headers in responses
4. Update test coverage

#### Version Upgrades
1. Create new version directory (`server/routes/v2/`)
2. Update configuration files
3. Implement migration utilities
4. Update documentation

### Configuration Options

#### Environment Variables
```env
API_VERSION=v1
API_LEGACY_ENABLED=true
API_DEPRECATION_WARNING=true
API_SUNSET_DATE=2025-12-31
```

#### Runtime Configuration
```typescript
const API_CONFIG = {
  version: 'v1',
  baseUrl: '/api',
  legacy: {
    enabled: true,
    deprecationWarning: true,
    sunsetDate: '2025-12-31'
  }
};
```

### Swagger Documentation

Updated to support versioned APIs:
- Multiple server configurations
- Version-specific paths
- Legacy endpoint deprecation notices
- Interactive testing interface

### Benefits

1. **Backward Compatibility**: Existing clients continue working
2. **Gradual Migration**: Smooth transition timeline
3. **Clear Versioning**: Explicit version management
4. **Monitoring**: Comprehensive tracking and alerts
5. **Documentation**: Auto-generated API documentation
6. **Testing**: Built-in endpoint validation

### Best Practices

1. Always use versioned endpoints for new development
2. Monitor legacy endpoint usage patterns
3. Provide clear migration timelines
4. Maintain comprehensive test coverage
5. Document breaking changes thoroughly

### Support & Troubleshooting

#### Common Issues
- **404 Errors**: Check endpoint versioning
- **Legacy Warnings**: Update to v1 endpoints
- **CORS Issues**: Verify version headers

#### Monitoring Tools
- API Version Status Dashboard
- Request logging and analytics
- Performance monitoring
- Error tracking

### Next Steps

1. Complete frontend migration to v1 endpoints
2. Implement comprehensive monitoring
3. Plan v2 API features and improvements
4. Develop automated migration tools

---

For technical support or questions about API versioning, contact the development team or refer to the interactive API documentation at `/docs`.