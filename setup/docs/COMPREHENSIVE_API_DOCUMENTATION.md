# AI Agent Platform - Comprehensive API Documentation

## Table of Contents
1. [Platform Overview](#platform-overview)
2. [Authentication & Security](#authentication--security)
3. [User Management APIs](#user-management-apis)
4. [Role-Based Access Control](#role-based-access-control)
5. [Agent Orchestration](#agent-orchestration)
6. [Credential Management](#credential-management)
7. [Organization Management](#organization-management)
8. [Email Marketing System](#email-marketing-system)
9. [Monitoring & Analytics](#monitoring--analytics)
10. [Error Handling](#error-handling)
11. [Rate Limiting](#rate-limiting)
12. [Deployment Guide](#deployment-guide)

## Platform Overview

The AI Agent Platform is a comprehensive enterprise-grade solution for multi-tenant agent orchestration and management. It provides:

- **Multi-tenant Architecture**: Complete data isolation between organizations
- **Role-Based Access Control**: Hierarchical permissions with predefined and custom roles
- **Agent Orchestration**: Dynamic multi-agent systems with real-time monitoring
- **Credential Management**: Secure storage with AWS Parameter Store integration
- **Email Marketing**: Advanced campaign management with analytics
- **Real-time Monitoring**: Comprehensive analytics and performance tracking

## Authentication & Security

### Base URL
```
Development: http://localhost:5000/api
Production: https://your-domain.com/api
```

### Authentication Methods

#### Session-Based Authentication
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@platform.com",
    "role": "admin"
  }
}
```

#### API Key Authentication
```http
GET /api/protected-endpoint
Authorization: Bearer your_api_key
```

### Security Features
- **HTTPS Enforcement**: All communications encrypted with TLS 1.3
- **Session Management**: Secure cookie-based sessions with rotation
- **CORS Protection**: Configurable cross-origin request policies
- **Rate Limiting**: Prevents abuse with configurable limits
- **Input Validation**: Comprehensive request validation and sanitization

## User Management APIs

### Administrative User Management

#### Get All Users with Statistics
```http
GET /api/admin/users
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": 1,
    "username": "admin",
    "email": "admin@platform.com",
    "role": "admin",
    "organization": "ACME Corporation",
    "userType": "super_admin",
    "status": "active",
    "createdAt": "2025-06-01T07:00:48.612Z",
    "lastLogin": "6/1/2025, 10:33:13 AM",
    "agentsCount": 15,
    "apiCallsToday": 45,
    "creditsUsedToday": 809,
    "creditsRemaining": 1422,
    "storageUsedMB": 998,
    "deploymentsActive": 4
  }
]
```

#### User Profile Management
```http
GET /api/auth/profile
Authorization: Bearer {token}
```

#### Create User
```http
POST /api/admin/users
Content-Type: application/json
Authorization: Bearer {token}

{
  "username": "newuser",
  "email": "user@example.com",
  "password": "securepassword",
  "role": "user",
  "organizationId": 1
}
```

### User Activity Monitoring

#### Activity Logs
```http
GET /api/admin/activity-logs?userId=1&limit=50
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": 1,
    "userId": 1,
    "action": "login",
    "details": "User logged in successfully",
    "ipAddress": "192.168.1.100",
    "timestamp": "2025-06-04T12:00:00.000Z",
    "userAgent": "Mozilla/5.0..."
  }
]
```

## Role-Based Access Control

### Role Management

#### Get All Roles
```http
GET /api/roles
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Super Admin",
    "description": "Full system administration access",
    "permissions": [
      "manage_users",
      "manage_roles",
      "manage_organizations",
      "manage_agents",
      "manage_credentials",
      "access_billing",
      "view_analytics"
    ],
    "resourceLimits": {
      "maxAgents": null,
      "maxDeployments": null,
      "maxApiKeys": null,
      "maxCredentials": null,
      "dailyApiCalls": null,
      "monthlyCost": null
    },
    "isSystemRole": true,
    "createdAt": "2025-06-01T00:00:00.000Z"
  }
]
```

#### Create Custom Role
```http
POST /api/roles
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Custom Manager",
  "description": "Custom role for project managers",
  "permissions": [
    "manage_agents",
    "view_analytics",
    "manage_credentials"
  ],
  "resourceLimits": {
    "maxAgents": 10,
    "maxDeployments": 5,
    "dailyApiCalls": 1000
  }
}
```

#### Seed Predefined Roles
```http
POST /api/admin/seed-roles
Authorization: Bearer {token}
```

### Role Assignment

#### Assign Role to User
```http
POST /api/admin/users/{userId}/assign-role
Content-Type: application/json
Authorization: Bearer {token}

{
  "roleId": 2
}
```

### Predefined System Roles

1. **Super Admin**
   - All system permissions
   - Unlimited resources
   - Cross-tenant access

2. **Organization Admin**
   - Organization management
   - User management within org
   - Billing access
   - Resource limits: 100 agents, 50 deployments

3. **Client Admin**
   - Agent management
   - Credential management
   - Analytics access
   - Resource limits: 25 agents, 15 deployments

4. **Standard User**
   - Basic agent usage
   - View analytics
   - Resource limits: 5 agents, 3 deployments

5. **Read Only**
   - View-only access
   - No creation/modification rights

## Agent Orchestration

### Agent Management

#### Get All Agents
```http
GET /api/agents?category=marketing&status=active
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": "agent_123",
    "name": "Marketing Intelligence Agent",
    "category": "marketing",
    "description": "AI agent specialized in marketing analytics",
    "status": "active",
    "version": "1.2.0",
    "configuration": {
      "model": "gpt-4o",
      "temperature": 0.7,
      "maxTokens": 2048
    },
    "metrics": {
      "totalRequests": 1250,
      "successRate": 98.4,
      "averageResponseTime": 1.2
    }
  }
]
```

#### Create Agent
```http
POST /api/agents
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Customer Service Agent",
  "category": "technology",
  "description": "AI agent for automated customer support",
  "template": "customer_service_template",
  "configuration": {
    "role": "Customer Service Representative",
    "goal": "Provide helpful customer support",
    "model": "gpt-4o",
    "temperature": 0.3,
    "guardrails": {
      "requireHumanApproval": true,
      "contentFiltering": true
    }
  }
}
```

### Agent Templates by Category

#### Technology
- IT automation agents
- Development workflow agents
- Technical support agents

#### Healthcare
- Medical research agents
- Patient care coordination
- Healthcare analytics

#### Finance
- Financial analysis agents
- Risk assessment agents
- Trading automation

#### Education
- Learning management agents
- Tutoring systems
- Educational content creation

#### Marketing
- Campaign management agents
- Customer analytics
- Content optimization

### Agent Deployment

#### Deploy Agent
```http
POST /api/agents/{id}/deploy
Content-Type: application/json
Authorization: Bearer {token}

{
  "environment": "production",
  "configuration": {
    "replicas": 3,
    "resources": {
      "cpu": "1000m",
      "memory": "2Gi"
    }
  }
}
```

#### Monitor Deployment
```http
GET /api/deployments/{deploymentId}
Authorization: Bearer {token}
```

### Agent Communication

#### Send Message to Agent
```http
POST /api/agents/{id}/message
Content-Type: application/json
Authorization: Bearer {token}

{
  "message": "Analyze latest marketing campaign performance",
  "context": {
    "campaignId": "campaign_456",
    "timeframe": "last_7_days"
  },
  "priority": "high"
}
```

## Credential Management

### Secure Credential Storage

#### Get All Credentials
```http
GET /api/client-api-keys
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": "cred_123",
    "name": "Production API Key",
    "keyType": "api_key",
    "provider": "openai",
    "category": "ai_models",
    "description": "OpenAI API key for production agents",
    "isRequired": true,
    "isConfigured": true,
    "useAwsParameterStore": false,
    "createdAt": "2025-06-01T10:00:00.000Z",
    "metadata": {
      "environment": "production"
    }
  }
]
```

#### Create Credential
```http
POST /api/client-api-keys
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Stripe API Key",
  "keyType": "api_key",
  "provider": "stripe",
  "category": "payments",
  "description": "Stripe API key for payment processing",
  "value": "sk_live_...",
  "isRequired": true,
  "metadata": {
    "environment": "production"
  }
}
```

### AWS Parameter Store Integration

#### Store in AWS Parameter Store
```http
POST /api/client-api-keys/{id}/aws-parameter-store
Content-Type: application/json
Authorization: Bearer {token}

{
  "parameterPath": "/ai-platform/production/openai-api-key",
  "description": "OpenAI API key for production",
  "type": "SecureString"
}
```

### Supported Providers

#### AI/ML Providers
- OpenAI (GPT models)
- Anthropic (Claude)
- Google AI (Vertex AI)
- Azure OpenAI
- Hugging Face

#### Cloud Providers
- AWS (Access keys, roles)
- Google Cloud (Service accounts)
- Azure (Subscription keys)
- DigitalOcean (API tokens)

#### Communication Services
- SendGrid (Email delivery)
- Twilio (SMS/Voice)
- Slack (Bot tokens)
- Discord (Application IDs)

#### Payment Processing
- Stripe (Payment processing)
- PayPal (Client credentials)
- Square (Application access)

## Organization Management

### Multi-Tenant Architecture

#### Get Organizations
```http
GET /api/admin/organizations
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "ACME Corporation",
    "description": "Enterprise technology solutions",
    "settings": {
      "allowExternalAgents": true,
      "maxUsers": 100,
      "billingTier": "enterprise"
    },
    "isActive": true,
    "memberCount": 45,
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
]
```

#### Create Organization
```http
POST /api/admin/organizations
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "New Corporation",
  "description": "Technology startup",
  "settings": {
    "allowExternalAgents": false,
    "maxUsers": 50
  }
}
```

## Email Marketing System

### Campaign Management

#### Get Email Templates
```http
GET /api/email-marketing/templates
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": "template_123",
    "name": "Welcome Email",
    "subject": "Welcome to our platform!",
    "htmlContent": "<html>...</html>",
    "category": "welcome",
    "isActive": true
  }
]
```

#### Create Campaign
```http
POST /api/email-marketing/campaigns
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Product Launch Campaign",
  "templateId": "template_123",
  "subject": "Introducing our new features",
  "scheduledAt": "2025-06-05T10:00:00.000Z",
  "targetAudience": {
    "segment": "active_users",
    "filters": {
      "lastLogin": "last_30_days"
    }
  }
}
```

### Analytics & Reporting

#### Campaign Performance
```http
GET /api/email-marketing/campaigns/{id}/analytics
Authorization: Bearer {token}
```

**Response:**
```json
{
  "campaignId": "campaign_456",
  "sent": 5000,
  "delivered": 4850,
  "opened": 1455,
  "clicked": 436,
  "bounced": 150,
  "openRate": 30.0,
  "clickRate": 8.99,
  "bounceRate": 3.0
}
```

## Monitoring & Analytics

### System Statistics

#### Admin Dashboard Stats
```http
GET /api/admin/stats
Authorization: Bearer {token}
```

**Response:**
```json
{
  "totalUsers": 1247,
  "totalOrganizations": 18,
  "activeAgents": 342,
  "totalApiCalls": 15642,
  "totalCreditsUsed": 125000,
  "storageUsedGB": 45.6,
  "activeDeployments": 89
}
```

### Performance Monitoring

#### Agent Metrics
```http
GET /api/agents/{id}/metrics?timeframe=24h
Authorization: Bearer {token}
```

**Response:**
```json
{
  "agentId": "agent_123",
  "timeframe": "24h",
  "metrics": {
    "requests": {
      "total": 1250,
      "successful": 1230,
      "failed": 20,
      "successRate": 98.4
    },
    "performance": {
      "averageResponseTime": 1.2,
      "throughput": 52.0
    },
    "resources": {
      "cpuUsage": 45.2,
      "memoryUsage": 68.7
    }
  }
}
```

## Error Handling

### Standard Error Responses

#### 400 Bad Request
```json
{
  "error": "Validation Error",
  "message": "Invalid email format",
  "details": {
    "field": "email",
    "value": "invalid-email"
  }
}
```

#### 401 Unauthorized
```json
{
  "error": "Authentication Error",
  "message": "Invalid credentials or session expired"
}
```

#### 403 Forbidden
```json
{
  "error": "Authorization Error",
  "message": "Insufficient permissions to access this resource"
}
```

#### 404 Not Found
```json
{
  "error": "Resource Not Found",
  "message": "User with ID 999 not found"
}
```

#### 429 Too Many Requests
```json
{
  "error": "Rate Limit Exceeded",
  "message": "Too many requests. Please try again later.",
  "retryAfter": 300
}
```

#### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred",
  "requestId": "req_123456789"
}
```

## Rate Limiting

### Default Limits
- **Standard endpoints**: 100 requests per minute per user
- **Bulk operations**: 10 requests per minute per user
- **Analytics endpoints**: 20 requests per minute per user
- **Agent communication**: 50 requests per minute per agent

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Deployment Guide

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/agent_platform

# Authentication
SESSION_SECRET=your_session_secret_key
JWT_SECRET=your_jwt_secret_key

# External Services
OPENAI_API_KEY=sk-...
SENDGRID_API_KEY=SG.
AWS_ACCESS_KEY_ID=AKIAI...
AWS_SECRET_ACCESS_KEY=...

# Application
NODE_ENV=production
PORT=5000
```

### Docker Deployment
```yaml
version: '3.8'
services:
  app:
    image: ai-agent-platform:latest
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - SESSION_SECRET=${SESSION_SECRET}
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: agent_platform
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password

  redis:
    image: redis:7
```

### Health Check Endpoints
```http
GET /health
GET /health/db
GET /health/redis
```

## Support & Resources

- **API Documentation**: Available at `/api/docs` when running
- **Postman Collection**: Import collection for easy testing
- **SDK Libraries**: Available for Python, Node.js, and Go
- **Community**: GitHub discussions and issue tracking
- **Enterprise Support**: Contact for dedicated support plans

This comprehensive documentation covers all implemented features of the AI Agent Platform, providing developers and administrators with complete guidance for integration and usage.