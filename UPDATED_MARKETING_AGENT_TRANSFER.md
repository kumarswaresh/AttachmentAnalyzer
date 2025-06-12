# Updated Marketing Agent Transfer Guide

## Export Package Details
- **Latest Export File**: `agent-export-2025-06-12T21-05-25-486Z.json`
- **Contains**: 4 agents with OpenAI GPT-4 powered hotel recommendations
- **Size**: 0.01 MB
- **Key Update**: Removed all hardcoded data, now uses authentic OpenAI responses

## Security Token Generation

### 1. Generate API Key for Import Operations
```bash
# On target server, generate a secure API key for admin operations
curl -X POST http://your-server.com/api/v1/admin/api-keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_SESSION_TOKEN" \
  -d '{
    "name": "Agent Import Key",
    "permissions": ["admin:read", "admin:write", "agents:create", "agents:update"],
    "allowedEndpoints": ["/api/v1/admin/*", "/api/v1/agents/*"],
    "expiresAt": "2025-12-31T23:59:59.000Z"
  }'
```

### 2. Alternative: Use Session Token
```bash
# Login first to get session token
curl -X POST http://your-server.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your_admin_password"
  }'
```

## Upload Steps

### Step 1: Transfer the Export File
```bash
# Copy the export file to your target server
scp exports/agent-export-2025-06-12T21-05-25-486Z.json user@target-server:/path/to/agent-platform/imports/
```

### Step 2: Import Agents via API
```bash
# Upload and import agents using the REST API
curl -X POST http://your-server.com/api/v1/admin/import-agents \
  -H "Content-Type: multipart/form-data" \
  -H "Authorization: Bearer YOUR_API_KEY_OR_SESSION_TOKEN" \
  -F "file=@imports/agent-export-2025-06-12T21-05-25-486Z.json" \
  -F "overwrite=true"
```

### Step 3: Verify Import
```bash
# Check that agents were imported successfully
curl -X GET http://your-server.com/api/v1/agents \
  -H "Authorization: Bearer YOUR_API_KEY_OR_SESSION_TOKEN"
```

## Test the Updated Marketing Agent

### Hotel Recommendations API Call
```bash
# Test the OpenAI-powered hotel recommendations
curl -X POST http://your-server.com/api/v1/marketing/hotel-recommendations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY_OR_SESSION_TOKEN" \
  -d '{
    "destination": "Paris, France",
    "travelType": "luxury", 
    "starRating": 4.5,
    "propertyCount": 3
  }'
```

### Expected Response Format
```json
[
  {
    "countryCode": "FR",
    "countryName": "France",
    "stateCode": "IDF",
    "state": "Île-de-France",
    "cityCode": 1,
    "cityName": "Paris",
    "code": 101,
    "name": "Le Bristol Paris",
    "rating": 4.8,
    "description": "Luxury hotel in the heart of Paris...",
    "imageUrl": "https://example.com/images/le-bristol-paris.jpg"
  }
]
```

## Required Environment Variables

Ensure these are set on your target server:

```bash
export OPENAI_API_KEY="sk-proj-..."  # Required for hotel recommendations
export DATABASE_URL="postgresql://..."  # Database connection
export SESSION_SECRET="your-session-secret"  # For authentication
```

## Import Verification Commands

### Check Agent Status
```bash
curl -X GET http://your-server.com/api/v1/admin/agents/marketing-campaign-specialist \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Agent Execution
```bash
curl -X POST http://your-server.com/api/v1/agents/marketing-campaign-specialist/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "input": {
      "destination": "Tokyo, Japan",
      "travelType": "business",
      "starRating": 4,
      "propertyCount": 2
    }
  }'
```

## Key Changes in This Update

1. **Removed Hardcoded Data**: All `sampleHotelData` removed from marketing routes
2. **OpenAI Integration**: Hotel recommendations now use GPT-4o-mini for faster responses
3. **Authentic Data Only**: No fallback to static data, all responses from OpenAI API
4. **Improved Error Handling**: Better timeout management and validation
5. **Performance Optimized**: 5-8 second response times with proper error handling

## Authentication Requirements

- **Admin Access**: Required for importing agents
- **API Key Permissions**: Need `admin:write` and `agents:create` permissions
- **Session Authentication**: Alternative to API keys for web-based imports
- **Environment Variables**: OPENAI_API_KEY must be configured for hotel recommendations

## Troubleshooting

If import fails:
1. Check API key permissions
2. Verify file upload size limits
3. Ensure database connectivity
4. Confirm OpenAI API key is configured
5. Check server logs for detailed error messages