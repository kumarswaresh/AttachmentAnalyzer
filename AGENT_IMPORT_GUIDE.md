# Latest Marketing Agent Import Guide

## Export Package Details
- **File**: `latest-marketing-agent-export.json`
- **Date**: June 12, 2025 - 21:13:54 UTC
- **Contains**: 4 agents with OpenAI GPT-4 integration
- **Key Features**: Authentic hotel recommendations, no hardcoded data
- **Size**: 0.01 MB

## Step-by-Step Import Process

### Step 1: Generate Security Token

**Option A: Admin API Key**
```bash
curl -X POST http://your-server.com/api/v1/admin/api-keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_SESSION_TOKEN" \
  -d '{
    "name": "Agent Import Token",
    "permissions": ["admin:write", "agents:create", "agents:update"],
    "allowedEndpoints": ["/api/v1/admin/*", "/api/v1/agents/*"],
    "expiresAt": "2025-12-31T23:59:59.000Z"
  }'
```

**Option B: Login Session**
```bash
curl -X POST http://your-server.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your_admin_password"
  }'
```

### Step 2: Transfer Export File

**Upload to target server:**
```bash
scp latest-marketing-agent-export.json user@target-server:/path/to/agent-platform/imports/
```

**Or via HTTP:**
```bash
curl -X POST http://your-server.com/api/v1/admin/upload-agent-export \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@latest-marketing-agent-export.json"
```

### Step 3: Import Agents

**Method A: Direct File Import**
```bash
# On target server
node scripts/import-agents.js imports/latest-marketing-agent-export.json
```

**Method B: API Import**
```bash
curl -X POST http://your-server.com/api/v1/admin/import-agents \
  -H "Content-Type: multipart/form-data" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@latest-marketing-agent-export.json" \
  -F "overwrite=true"
```

### Step 4: Verify Import

**Check imported agents:**
```bash
curl -X GET http://your-server.com/api/v1/agents \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Test marketing agent:**
```bash
curl -X GET http://your-server.com/api/v1/agents/marketing-campaign-specialist \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 5: Test Hotel Recommendations

**Test OpenAI integration:**
```bash
curl -X POST http://your-server.com/api/v1/marketing/hotel-recommendations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "destination": "Barcelona, Spain",
    "travelType": "cultural",
    "starRating": 4,
    "propertyCount": 3
  }'
```

**Expected response format:**
```json
[
  {
    "countryCode": "ES",
    "countryName": "Spain",
    "stateCode": "CT",
    "state": "Catalonia",
    "cityCode": 1,
    "cityName": "Barcelona",
    "code": 101,
    "name": "Hotel Casa Fuster",
    "rating": 4.5,
    "description": "Luxury modernist hotel in the heart of Barcelona...",
    "imageUrl": "https://example.com/images/hotel-casa-fuster.jpg"
  }
]
```

## Environment Requirements

**Required environment variables on target server:**
```bash
export OPENAI_API_KEY="sk-proj-..."
export DATABASE_URL="postgresql://user:password@host:port/database"
export SESSION_SECRET="your-session-secret"
export NODE_ENV="production"
```

## Verification Commands

**Check agent status:**
```bash
curl -X GET http://your-server.com/api/v1/admin/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Test agent execution:**
```bash
curl -X POST http://your-server.com/api/v1/agents/marketing-campaign-specialist/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "input": {
      "destination": "Rome, Italy",
      "travelType": "historical",
      "starRating": 4.5,
      "propertyCount": 2
    }
  }'
```

## Troubleshooting

**If import fails:**
1. Check API key permissions include `admin:write`
2. Verify file upload size limits (current: 0.01 MB)
3. Ensure database connectivity
4. Confirm OpenAI API key is configured
5. Check server logs for detailed error messages

**If hotel recommendations fail:**
1. Verify OPENAI_API_KEY environment variable
2. Test OpenAI connectivity: `curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models`
3. Check API rate limits and quotas
4. Review server logs for timeout errors

## Security Notes

- API tokens should have minimum required permissions
- Use HTTPS for all API calls in production
- Store environment variables securely
- Rotate API keys regularly
- Monitor API usage and logs

## Agent Features After Import

- **Marketing Campaign Specialist**: Creates comprehensive travel campaigns
- **Hotel Recommendations**: OpenAI-powered authentic hotel data
- **JSON API Responses**: Structured data in required format
- **Multi-destination Support**: Works with any global destination
- **Real-time Generation**: 5-8 second response times
- **No Hardcoded Data**: All responses from OpenAI GPT-4