-- Direct PostgreSQL Import Script for Marketing Agents
-- File: import-agents-psql.sql
-- Usage: psql $DATABASE_URL -f import-agents-psql.sql

BEGIN;

-- Insert Marketing Campaign Specialist (with OpenAI GPT-4 integration)
INSERT INTO agents (
    id, name, goal, role, guardrails, modules, model, 
    vector_store_id, status, created_at, updated_at, created_by
) VALUES (
    '144b514f-7761-4ce5-95d4-675a54a6215a',
    'Marketing Campaign Specialist',
    'Generate comprehensive marketing campaigns for travel and hospitality clients with authentic hotel recommendations using OpenAI GPT-4. No hardcoded data - all responses generated in real-time.',
    'content-creator',
    '{"maxTokens": 4000, "readOnlyMode": false, "contentFiltering": true, "requireHumanApproval": false}',
    '[{"config": {"hotelRecommendations": true, "openaiIntegration": true}, "enabled": true, "version": "1.0.0", "moduleId": "marketing-campaign"}]',
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
    modules = EXCLUDED.modules,
    updated_at = NOW();

-- Insert Data Analysis Agent
INSERT INTO agents (
    id, name, goal, role, guardrails, modules, model,
    vector_store_id, status, created_at, updated_at, created_by
) VALUES (
    'ed948d5f-f4f0-431e-9342-4918793a0084',
    'Data Analysis Specialist',
    'Analyze marketing campaign performance and provide insights for travel industry campaigns',
    'data-analyst',
    '{"maxTokens": 4000, "readOnlyMode": false, "contentFiltering": true, "requireHumanApproval": false}',
    '[{"config": {}, "enabled": true, "version": "1.0.0", "moduleId": "data-analysis"}]',
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
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'C# Code Generation Specialist',
    'Generate high-quality C# code for web APIs, applications, and enterprise solutions',
    'software-engineer',
    '{"maxTokens": 6000, "readOnlyMode": false, "contentFiltering": true, "requireHumanApproval": false}',
    '[{"config": {"language": "csharp", "frameworks": ["ASP.NET", ".NET Core"]}, "enabled": true, "version": "1.0.0", "moduleId": "code-generation"}]',
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
    'f1e2d3c4-b5a6-7890-1234-567890abcdef',
    'General Assistant',
    'Provide comprehensive assistance across various domains including customer support and general inquiries',
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

-- Insert OpenAI credential for marketing agent (placeholder - replace with actual encrypted value)
INSERT INTO agent_credentials (
    id, agent_id, provider, api_key_name, encrypted_value, 
    created_at, updated_at, created_by
) VALUES (
    'openai-marketing-cred-001',
    '144b514f-7761-4ce5-95d4-675a54a6215a',
    'openai',
    'OPENAI_API_KEY',
    'ENCRYPTED_OPENAI_KEY_PLACEHOLDER',
    NOW(),
    NOW(),
    NULL
) ON CONFLICT (id) DO UPDATE SET
    encrypted_value = EXCLUDED.encrypted_value,
    updated_at = NOW();

-- Verify import results
SELECT 'Import Summary:' as status;
SELECT COUNT(*) as total_agents FROM agents WHERE status = 'active';
SELECT COUNT(*) as total_credentials FROM agent_credentials;

-- Show imported agents
SELECT id, name, role, model, status 
FROM agents 
WHERE id IN (
    '144b514f-7761-4ce5-95d4-675a54a6215a',
    'ed948d5f-f4f0-431e-9342-4918793a0084',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'f1e2d3c4-b5a6-7890-1234-567890abcdef'
)
ORDER BY created_at;

COMMIT;

-- Success message
\echo 'Agent import completed successfully!'
\echo 'Marketing Campaign Specialist includes OpenAI GPT-4 integration for authentic hotel recommendations'
\echo 'Remember to set OPENAI_API_KEY environment variable'