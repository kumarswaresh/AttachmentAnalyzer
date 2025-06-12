# Direct PostgreSQL Import Guide

## Export File
- **File**: `latest-marketing-agent-export.json`
- **Contains**: 4 agents with OpenAI GPT-4 integration
- **Date**: June 12, 2025

## PostgreSQL Direct Import Steps

### Step 1: Connect to Database
```bash
# Connect to your PostgreSQL database
psql "postgresql://username:password@host:port/database_name"

# Or using environment variables
psql $DATABASE_URL
```

### Step 2: Prepare Agent Data

Extract agent data from the JSON file and insert directly:

```sql
-- Insert Marketing Campaign Specialist Agent
INSERT INTO agents (
    id, name, goal, role, guardrails, modules, model, 
    vector_store_id, status, created_at, updated_at, created_by
) VALUES (
    '144b514f-7761-4ce5-95d4-675a54a6215a',
    'Marketing Campaign Specialist',
    'Generate comprehensive marketing campaigns for travel and hospitality clients with authentic hotel recommendations using OpenAI GPT-4',
    'content-creator',
    '{"maxTokens": 4000, "readOnlyMode": false, "contentFiltering": true, "requireHumanApproval": false}',
    '[{"config": {}, "enabled": true, "version": "1.0.0", "moduleId": "marketing-campaign"}]',
    'gpt-4o',
    'marketing-specialist-vector-store',
    'active',
    NOW(),
    NOW(),
    NULL
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    goal = EXCLUDED.goal,
    model = EXCLUDED.model,
    updated_at = NOW();

-- Insert Data Analysis Agent
INSERT INTO agents (
    id, name, goal, role, guardrails, modules, model,
    vector_store_id, status, created_at, updated_at, created_by
) VALUES (
    'ed948d5f-f4f0-431e-9342-4918793a0084',
    'Data Analysis Specialist',
    'Analyze marketing campaign performance and provide insights',
    'data-analyst',
    '{"maxTokens": 4000, "readOnlyMode": false, "contentFiltering": true, "requireHumanApproval": false}',
    '[{"config": {}, "enabled": true, "version": "1.0.0", "moduleId": "marketing-campaign"}]',
    'claude-3-sonnet',
    'data-analyst-vector-store',
    'active',
    NOW(),
    NOW(),
    NULL
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    goal = EXCLUDED.goal,
    updated_at = NOW();

-- Insert C# Code Generation Agent
INSERT INTO agents (
    id, name, goal, role, guardrails, modules, model,
    vector_store_id, status, created_at, updated_at, created_by
) VALUES (
    'csharp-code-gen-agent-uuid',
    'C# Code Generation Specialist',
    'Generate high-quality C# code for web APIs and applications',
    'software-engineer',
    '{"maxTokens": 6000, "readOnlyMode": false, "contentFiltering": true, "requireHumanApproval": false}',
    '[{"config": {}, "enabled": true, "version": "1.0.0", "moduleId": "code-generation"}]',
    'gpt-4o',
    'csharp-specialist-vector-store',
    'active',
    NOW(),
    NOW(),
    NULL
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    goal = EXCLUDED.goal,
    updated_at = NOW();

-- Insert General Assistant Agent
INSERT INTO agents (
    id, name, goal, role, guardrails, modules, model,
    vector_store_id, status, created_at, updated_at, created_by
) VALUES (
    'general-assistant-uuid',
    'General Assistant',
    'Provide general assistance and answer questions across various domains',
    'assistant',
    '{"maxTokens": 4000, "readOnlyMode": false, "contentFiltering": true, "requireHumanApproval": false}',
    '[{"config": {}, "enabled": true, "version": "1.0.0", "moduleId": "general-assistance"}]',
    'gpt-4o-mini',
    'general-assistant-vector-store',
    'active',
    NOW(),
    NOW(),
    NULL
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    goal = EXCLUDED.goal,
    updated_at = NOW();
```

### Step 3: Insert Agent Credentials
```sql
-- Insert OpenAI API credential for marketing agent
INSERT INTO agent_credentials (
    id, agent_id, provider, api_key_name, encrypted_value, 
    created_at, updated_at, created_by
) VALUES (
    'openai-marketing-cred-uuid',
    '144b514f-7761-4ce5-95d4-675a54a6215a',
    'openai',
    'OPENAI_API_KEY',
    'your_encrypted_openai_api_key_here',
    NOW(),
    NOW(),
    NULL
) ON CONFLICT (id) DO UPDATE SET
    encrypted_value = EXCLUDED.encrypted_value,
    updated_at = NOW();
```

### Step 4: Verify Import
```sql
-- Check imported agents
SELECT id, name, role, model, status, created_at 
FROM agents 
ORDER BY created_at DESC;

-- Check agent credentials
SELECT id, agent_id, provider, api_key_name, created_at
FROM agent_credentials
WHERE agent_id IN (
    '144b514f-7761-4ce5-95d4-675a54a6215a',
    'ed948d5f-f4f0-431e-9342-4918793a0084'
);

-- Count total agents
SELECT COUNT(*) as total_agents FROM agents WHERE status = 'active';
```

## Environment Setup

After importing, ensure these environment variables are set:

```bash
export OPENAI_API_KEY="sk-proj-your-key-here"
export DATABASE_URL="postgresql://user:password@host:port/database"
export SESSION_SECRET="your-session-secret"
```

## Test Marketing Agent

Once imported, test the marketing agent with:

```bash
# Test hotel recommendations endpoint
curl -X POST http://your-server.com/api/v1/marketing/hotel-recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "Paris, France",
    "travelType": "luxury",
    "starRating": 4.5,
    "propertyCount": 3
  }'
```

## Alternative: Bulk Import Script

Create a SQL file for batch import:

```sql
-- agents_import.sql
BEGIN;

-- Clear existing data (optional)
-- DELETE FROM agent_credentials WHERE agent_id IN ('144b514f-7761-4ce5-95d4-675a54a6215a', 'ed948d5f-f4f0-431e-9342-4918793a0084');
-- DELETE FROM agents WHERE id IN ('144b514f-7761-4ce5-95d4-675a54a6215a', 'ed948d5f-f4f0-431e-9342-4918793a0084');

-- Insert all agents and credentials (use statements from Step 2 and 3 above)

COMMIT;
```

Execute the script:
```bash
psql $DATABASE_URL -f agents_import.sql
```

## Key Benefits

- Direct database access, no API dependencies
- Faster import process
- Full control over data insertion
- Easy to modify agent configurations
- Can handle large datasets efficiently
- Works with any PostgreSQL client

## Security Notes

- Use parameterized queries if building dynamic scripts
- Encrypt sensitive credentials before storage
- Backup database before importing
- Test import on staging environment first