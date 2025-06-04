# Credential Management API Documentation

## Overview
Secure credential storage and management system with multi-provider support, encryption, and audit logging.

## Credential Management Endpoints

### Get All Credentials
```http
GET /api/client-api-keys
```

**Description:** Retrieve all API keys and credentials with metadata.

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
    "updatedAt": "2025-06-04T12:00:00.000Z",
    "metadata": {
      "environment": "production",
      "permissions": ["models.read", "completions.create"]
    }
  }
]
```

### Get Credential by ID
```http
GET /api/client-api-keys/:id
```

**Response:**
```json
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
  "awsParameterPath": null,
  "metadata": {
    "environment": "production",
    "lastUsed": "2025-06-04T15:30:00.000Z"
  }
}
```

### Create Credential
```http
POST /api/client-api-keys
```

**Request Body:**
```json
{
  "name": "Stripe API Key",
  "keyType": "api_key",
  "provider": "stripe",
  "category": "payments",
  "description": "Stripe API key for payment processing",
  "value": "sk_live_...",
  "isRequired": true,
  "useAwsParameterStore": false,
  "metadata": {
    "environment": "production",
    "permissions": ["charges.create", "customers.read"]
  }
}
```

**Response:**
```json
{
  "id": "cred_456",
  "name": "Stripe API Key",
  "keyType": "api_key",
  "provider": "stripe",
  "category": "payments",
  "isConfigured": true,
  "createdAt": "2025-06-04T16:00:00.000Z"
}
```

### Update Credential
```http
PUT /api/client-api-keys/:id
```

**Request Body:**
```json
{
  "name": "Updated API Key Name",
  "description": "Updated description",
  "value": "new_api_key_value",
  "metadata": {
    "environment": "staging"
  }
}
```

### Delete Credential
```http
DELETE /api/client-api-keys/:id
```

**Response:**
```json
{
  "message": "Credential deleted successfully"
}
```

## AWS Parameter Store Integration

### Store Credential in AWS Parameter Store
```http
POST /api/client-api-keys/:id/aws-parameter-store
```

**Request Body:**
```json
{
  "parameterPath": "/ai-platform/production/openai-api-key",
  "description": "OpenAI API key for production environment",
  "type": "SecureString",
  "kmsKeyId": "alias/parameter-store-key"
}
```

**Response:**
```json
{
  "message": "Credential stored in AWS Parameter Store successfully",
  "parameterPath": "/ai-platform/production/openai-api-key",
  "version": 1
}
```

### Retrieve from AWS Parameter Store
```http
GET /api/client-api-keys/:id/aws-parameter-store
```

**Response:**
```json
{
  "parameterPath": "/ai-platform/production/openai-api-key",
  "value": "sk-...",
  "version": 1,
  "lastModified": "2025-06-04T16:00:00.000Z",
  "type": "SecureString"
}
```

## Credential Categories

### AI/ML Providers
- **OpenAI**: API keys for GPT models and services
- **Anthropic**: Claude API credentials
- **Google AI**: Vertex AI and other Google AI services
- **Azure OpenAI**: Microsoft Azure AI services
- **Hugging Face**: Model hosting and inference

### Cloud Providers
- **AWS**: Access keys, secret keys, role ARNs
- **Google Cloud**: Service account keys, project IDs
- **Azure**: Subscription keys, tenant IDs
- **DigitalOcean**: API tokens

### Communication Services
- **SendGrid**: Email delivery API keys
- **Twilio**: SMS and voice API credentials
- **Slack**: Bot tokens and webhook URLs
- **Discord**: Bot tokens and application IDs

### Payment Processing
- **Stripe**: API keys for payment processing
- **PayPal**: Client IDs and secrets
- **Square**: Application IDs and access tokens

### Database & Storage
- **MongoDB**: Connection strings and credentials
- **Redis**: Connection URLs and passwords
- **S3**: Bucket access credentials
- **Elasticsearch**: Cluster credentials

## Credential Security

### Encryption
```http
GET /api/client-api-keys/:id/encryption-status
```

**Response:**
```json
{
  "credentialId": "cred_123",
  "isEncrypted": true,
  "encryptionMethod": "AES-256-GCM",
  "keyRotationDate": "2025-06-01T00:00:00.000Z",
  "nextRotationDate": "2025-07-01T00:00:00.000Z"
}
```

### Rotate Credential
```http
POST /api/client-api-keys/:id/rotate
```

**Request Body:**
```json
{
  "newValue": "new_encrypted_credential_value"
}
```

**Response:**
```json
{
  "message": "Credential rotated successfully",
  "rotatedAt": "2025-06-04T16:30:00.000Z",
  "previousVersion": 2,
  "currentVersion": 3
}
```

## Access Control & Audit

### Get Credential Usage
```http
GET /api/client-api-keys/:id/usage
```

**Query Parameters:**
- `timeframe`: "1h", "24h", "7d", "30d"

**Response:**
```json
{
  "credentialId": "cred_123",
  "timeframe": "24h",
  "usage": {
    "totalRequests": 1250,
    "uniqueAgents": 15,
    "environments": ["production", "staging"],
    "lastUsed": "2025-06-04T16:00:00.000Z"
  },
  "topConsumers": [
    {
      "agentId": "agent_123",
      "agentName": "Marketing Agent",
      "requestCount": 450
    }
  ]
}
```

### Get Access Logs
```http
GET /api/client-api-keys/:id/access-logs
```

**Query Parameters:**
- `limit`: Number of logs to return (default: 50)
- `offset`: Pagination offset
- `startDate`: Filter from date
- `endDate`: Filter to date

**Response:**
```json
[
  {
    "id": "log_789",
    "credentialId": "cred_123",
    "accessedBy": "agent_123",
    "accessType": "read",
    "timestamp": "2025-06-04T16:00:00.000Z",
    "ipAddress": "10.0.1.100",
    "userAgent": "AI-Agent/1.0",
    "success": true
  }
]
```

## Credential Validation

### Test Credential
```http
POST /api/client-api-keys/:id/test
```

**Description:** Validate credential by making a test API call to the provider.

**Response:**
```json
{
  "credentialId": "cred_123",
  "isValid": true,
  "testResult": {
    "provider": "openai",
    "responseTime": 245,
    "statusCode": 200,
    "permissions": ["models.read", "completions.create"]
  },
  "testedAt": "2025-06-04T16:15:00.000Z"
}
```

### Bulk Test Credentials
```http
POST /api/client-api-keys/test-all
```

**Request Body:**
```json
{
  "provider": "openai",
  "category": "ai_models"
}
```

**Response:**
```json
{
  "totalTested": 5,
  "validCredentials": 4,
  "invalidCredentials": 1,
  "results": [
    {
      "credentialId": "cred_123",
      "isValid": true,
      "responseTime": 245
    },
    {
      "credentialId": "cred_456",
      "isValid": false,
      "error": "Invalid API key"
    }
  ]
}
```

## Credential Templates

### Get Provider Templates
```http
GET /api/credential-templates
```

**Response:**
```json
[
  {
    "provider": "openai",
    "category": "ai_models",
    "template": {
      "name": "OpenAI API Key",
      "keyType": "api_key",
      "description": "API key for OpenAI services",
      "required": true,
      "validation": {
        "pattern": "^sk-[A-Za-z0-9]{48}$",
        "testEndpoint": "https://api.openai.com/v1/models"
      },
      "metadata": {
        "permissions": ["models.read", "completions.create"],
        "rateLimit": "3500 RPM"
      }
    }
  }
]
```

### Get Template by Provider
```http
GET /api/credential-templates/:provider
```

## Integration Endpoints

### Sync with External Vault
```http
POST /api/client-api-keys/sync/vault
```

**Request Body:**
```json
{
  "vaultUrl": "https://vault.company.com",
  "token": "vault_token",
  "path": "secret/ai-platform"
}
```

### Export Credentials (Encrypted)
```http
POST /api/client-api-keys/export
```

**Request Body:**
```json
{
  "format": "json",
  "encryptionKey": "export_encryption_key",
  "includeValues": false
}
```

**Response:**
```json
{
  "exportId": "export_123",
  "downloadUrl": "/api/downloads/export_123",
  "expiresAt": "2025-06-04T18:00:00.000Z"
}
```

## Error Responses

### 400 Bad Request - Invalid Credential Format
```json
{
  "error": "Validation Error",
  "message": "Invalid API key format",
  "details": {
    "field": "value",
    "expectedFormat": "sk-[A-Za-z0-9]{48}"
  }
}
```

### 403 Forbidden - Insufficient Permissions
```json
{
  "error": "Authorization Error",
  "message": "Insufficient permissions to manage credentials"
}
```

### 409 Conflict - Credential Name Exists
```json
{
  "error": "Resource Conflict",
  "message": "Credential with name 'Production API Key' already exists"
}
```

### 422 Unprocessable Entity - Invalid Credential
```json
{
  "error": "Invalid Credential",
  "message": "Credential validation failed",
  "details": {
    "provider": "openai",
    "testResult": {
      "statusCode": 401,
      "error": "Invalid API key"
    }
  }
}
```