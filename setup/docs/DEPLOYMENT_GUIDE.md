# Independent Deployment Guide

## Overview

The AI Agent Platform now supports independent deployment of agents and agent apps as standalone services while maintaining centralized credential access. This enables you to deploy specific agents or workflows to external environments while keeping all API keys and credentials securely managed in the central platform.

## Key Features

### 🚀 Independent Service Deployment
- Deploy individual agents as standalone microservices
- Deploy complete agent apps (multi-agent workflows) as independent services
- Each deployment gets a unique access key for secure authentication

### 🔐 Centralized Credential Management
- All deployed services access credentials through the central platform
- No need to manage API keys separately in each deployment
- Automatic credential rotation and security updates
- Secure credential storage with encryption

### 🌐 Flexible Deployment Options
- **Standalone**: Complete independent service with its own API endpoints
- **Embedded**: Integration into existing applications
- **API Only**: Pure API access without UI components

### 🛡️ Enterprise Security
- Access key authentication for all deployed services
- Rate limiting and origin control
- Audit logging for all credential access
- Environment-specific deployments (development, staging, production)

## Deployment Process

### 1. Deploy an Agent

```bash
# Deploy agent as standalone service
curl -X POST https://your-platform.com/api/deployments/agents/AGENT_ID \
  -H "Content-Type: application/json" \
  -d '{
    "environment": "production",
    "deploymentType": "standalone",
    "allowedOrigins": ["https://your-app.com"]
  }'
```

Response:
```json
{
  "success": true,
  "deployment": {
    "id": "deploy-123",
    "name": "Marketing Assistant v1.0",
    "accessKey": "ak_prod_abc123...",
    "endpoints": {
      "execute": "https://deployed.your-platform.com/api/deployed/agents/AGENT_ID/execute",
      "status": "https://deployed.your-platform.com/api/deployed/agents/AGENT_ID/status"
    },
    "credentialRequirements": [
      {
        "provider": "openai",
        "keyType": "api_key",
        "required": true
      }
    ]
  }
}
```

### 2. Deploy an Agent App

```bash
# Deploy agent app workflow
curl -X POST https://your-platform.com/api/deployments/agent-apps/APP_ID \
  -H "Content-Type: application/json" \
  -d '{
    "environment": "production",
    "deploymentType": "standalone"
  }'
```

### 3. Execute Deployed Services

```bash
# Execute deployed agent
curl -X POST https://deployed.your-platform.com/api/deployed/agents/AGENT_ID/execute \
  -H "x-access-key: ak_prod_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Create a marketing campaign for our new product"
  }'
```

Response:
```json
{
  "success": true,
  "result": {
    "agentId": "agent-123",
    "output": "Here's a comprehensive marketing campaign...",
    "credentialUsed": "OpenAI Production Key",
    "executionTime": 2.5,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Authentication & Security

### Access Keys
Each deployment receives a unique access key that must be included in all requests:

```bash
# Include access key in header
-H "x-access-key: YOUR_ACCESS_KEY"
```

### Credential Access
Deployed services automatically access required credentials from the platform:

1. **No Manual Key Management**: Never expose API keys in deployment code
2. **Automatic Rotation**: Credentials are updated centrally without redeployment
3. **Audit Trail**: All credential access is logged for security compliance
4. **Environment Isolation**: Different environments can use different credential sets

### Rate Limiting
Configure rate limits per deployment:

```json
{
  "rateLimit": {
    "requests": 1000,
    "window": "1h",
    "burst": 50
  }
}
```

## Integration Examples

### JavaScript/Node.js

```javascript
class AgentPlatformClient {
  constructor(accessKey, baseUrl) {
    this.accessKey = accessKey;
    this.baseUrl = baseUrl;
  }

  async executeAgent(agentId, input) {
    const response = await fetch(
      `${this.baseUrl}/api/deployed/agents/${agentId}/execute`,
      {
        method: 'POST',
        headers: {
          'x-access-key': this.accessKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ input })
      }
    );

    return response.json();
  }

  async executeAgentApp(appId, input) {
    const response = await fetch(
      `${this.baseUrl}/api/deployed/agent-apps/${appId}/execute`,
      {
        method: 'POST',
        headers: {
          'x-access-key': this.accessKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ input })
      }
    );

    return response.json();
  }
}

// Usage
const client = new AgentPlatformClient(
  'ak_prod_abc123...',
  'https://deployed.your-platform.com'
);

const result = await client.executeAgent('agent-123', {
  prompt: 'Generate a product description',
  context: { product: 'Smart Watch' }
});
```

### Python

```python
import requests

class AgentPlatformClient:
    def __init__(self, access_key, base_url):
        self.access_key = access_key
        self.base_url = base_url
        self.headers = {
            'x-access-key': access_key,
            'Content-Type': 'application/json'
        }

    def execute_agent(self, agent_id, input_data):
        url = f"{self.base_url}/api/deployed/agents/{agent_id}/execute"
        response = requests.post(url, headers=self.headers, json={'input': input_data})
        return response.json()

    def execute_agent_app(self, app_id, input_data):
        url = f"{self.base_url}/api/deployed/agent-apps/{app_id}/execute"
        response = requests.post(url, headers=self.headers, json={'input': input_data})
        return response.json()

# Usage
client = AgentPlatformClient(
    'ak_prod_abc123...',
    'https://deployed.your-platform.com'
)

result = client.execute_agent('agent-123', {
    'prompt': 'Analyze this customer feedback',
    'data': feedback_text
})
```

## Deployment Management

### List Deployments

```bash
curl -X GET https://your-platform.com/api/deployments
```

### Get Deployment Credentials

```bash
curl -X GET https://deployed.your-platform.com/api/deployments/credentials \
  -H "x-access-key: ak_prod_abc123..." \
  -G -d "provider=openai"
```

### Update Deployment Configuration

Deployments can be updated through the platform UI or API to modify:
- Environment settings
- Rate limits
- Allowed origins
- Access permissions

## Best Practices

### Security
1. **Rotate Access Keys**: Regularly rotate deployment access keys
2. **Environment Separation**: Use different deployments for dev/staging/prod
3. **Origin Control**: Limit allowed origins for web deployments
4. **Monitor Access**: Review audit logs for unusual credential access

### Performance
1. **Cache Responses**: Implement response caching where appropriate
2. **Batch Requests**: Group multiple operations when possible
3. **Monitor Metrics**: Track execution times and error rates
4. **Scale Resources**: Adjust rate limits based on usage patterns

### Maintenance
1. **Version Control**: Tag deployments with version numbers
2. **Rollback Strategy**: Maintain previous deployment versions
3. **Health Checks**: Implement endpoint monitoring
4. **Update Dependencies**: Keep agent definitions current

## Troubleshooting

### Common Issues

#### 401 Unauthorized
- Verify access key is correct and included in headers
- Check if access key has expired or been revoked
- Ensure deployment is in active status

#### 403 Forbidden
- Check allowed origins configuration
- Verify rate limits haven't been exceeded
- Confirm deployment has required permissions

#### 500 Server Error
- Check if required credentials are configured
- Verify agent/app dependencies are available
- Review execution logs for specific errors

### Support Resources

1. **Platform UI**: Use the Deployment Management interface for visual monitoring
2. **API Documentation**: Access Swagger docs at `/api/docs`
3. **Audit Logs**: Review credential access and execution logs
4. **Health Endpoints**: Monitor deployment status and performance

## Migration Guide

### From Direct API Keys to Centralized Credentials

1. **Inventory Current Keys**: List all API keys currently used in deployments
2. **Configure Platform Credentials**: Add all keys to the credential management system
3. **Update Deployments**: Redeploy services to use centralized credential access
4. **Remove Direct Keys**: Clean up hardcoded API keys from deployment code
5. **Test Integration**: Verify all services work with centralized credentials

### Deployment Checklist

- [ ] Agent/app tested and validated
- [ ] Required credentials configured in platform
- [ ] Environment settings configured
- [ ] Access key generated and secured
- [ ] Rate limits and origins configured
- [ ] Integration tested with sample requests
- [ ] Monitoring and alerting configured
- [ ] Documentation updated for consumers

## Architecture Overview

The independent deployment system consists of:

1. **Central Platform**: Manages agents, credentials, and deployment configurations
2. **Deployment Service**: Handles service deployment and access key management
3. **Credential Service**: Provides secure credential access to deployed services
4. **Execution Runtime**: Runs deployed agents and apps with credential integration
5. **Monitoring System**: Tracks performance, usage, and security metrics

This architecture ensures security, scalability, and maintainability while providing the flexibility to deploy AI capabilities anywhere they're needed.