-- Local PostgreSQL Import Script
-- This script creates the schema and imports data for local PostgreSQL
-- Usage: psql "postgresql://anand_admin:admin@localhost:5432/agent_platform" < local-import.sql

-- Drop existing tables if they exist
DROP TABLE IF EXISTS agent_credentials CASCADE;
DROP TABLE IF EXISTS agent_executions CASCADE;
DROP TABLE IF EXISTS agent_messages CASCADE;
DROP TABLE IF EXISTS execution_logs CASCADE;
DROP TABLE IF EXISTS marketing_campaigns CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS agents CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;

-- Create tables
CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, role_id, organization_id)
);

CREATE TABLE organization_members (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

CREATE TABLE agents (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    goal TEXT,
    role VARCHAR(100),
    guardrails JSONB DEFAULT '{}',
    modules JSONB DEFAULT '[]',
    model VARCHAR(100),
    vector_store_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id)
);

CREATE TABLE agent_credentials (
    id VARCHAR(255) PRIMARY KEY,
    agent_id VARCHAR(255) REFERENCES agents(id) ON DELETE CASCADE,
    provider VARCHAR(100) NOT NULL,
    api_key_name VARCHAR(255) NOT NULL,
    encrypted_value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id)
);

CREATE TABLE api_keys (
    id SERIAL PRIMARY KEY,
    key_id VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    permissions TEXT[] DEFAULT '{}',
    allowed_endpoints TEXT[] DEFAULT '{}',
    organization_id INTEGER REFERENCES organizations(id),
    expires_at TIMESTAMP,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sessions (
    sid VARCHAR PRIMARY KEY,
    sess JSONB NOT NULL,
    expire TIMESTAMP NOT NULL
);

-- Create indexes
CREATE INDEX idx_sessions_expire ON sessions(expire);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_api_keys_key_id ON api_keys(key_id);

-- Insert sample data
INSERT INTO roles (id, name, description, permissions) VALUES
(1, 'admin', 'Administrator with full access', ARRAY['admin:read', 'admin:write', 'users:manage', 'agents:manage']),
(2, 'user', 'Regular user', ARRAY['agents:read', 'agents:execute']),
(3, 'developer', 'Developer access', ARRAY['agents:read', 'agents:write', 'agents:execute']);

INSERT INTO organizations (id, name, description) VALUES
(1, 'ACME Corporation', 'Main organization for platform administration'),
(2, 'Tech Startup Inc', 'Technology startup organization'),
(3, 'Marketing Agency Ltd', 'Digital marketing and advertising agency');

-- Insert admin user (password: admin123)
INSERT INTO users (id, username, email, password_hash, first_name, last_name) VALUES
(1, 'admin', 'admin@localhost', '$2b$10$8K1p/a8glBjRlGpyGqIJMeJ.Q/WlJHG5JOXYdvf7qYl6KQfJUkQKu', 'Admin', 'User');

-- Insert user roles
INSERT INTO user_roles (user_id, role_id, organization_id) VALUES
(1, 1, 1);

-- Insert organization membership
INSERT INTO organization_members (user_id, organization_id, role) VALUES
(1, 1, 'admin');

-- Insert Marketing Campaign Specialist Agent
INSERT INTO agents (id, name, goal, role, guardrails, modules, model, vector_store_id, status, created_by) VALUES
('144b514f-7761-4ce5-95d4-675a54a6215a', 
 'Marketing Campaign Specialist', 
 'Generate comprehensive marketing campaigns for travel and hospitality clients with authentic hotel recommendations using OpenAI GPT-4. No hardcoded data - all responses generated in real-time.',
 'content-creator',
 '{"maxTokens": 4000, "readOnlyMode": false, "contentFiltering": true, "requireHumanApproval": false}',
 '[{"config": {"hotelRecommendations": true, "openaiIntegration": true}, "enabled": true, "version": "1.0.0", "moduleId": "marketing-campaign"}]',
 'gpt-4o',
 'marketing-specialist-vector-store',
 'active',
 1);

-- Insert Data Analysis Agent
INSERT INTO agents (id, name, goal, role, guardrails, modules, model, vector_store_id, status, created_by) VALUES
('ed948d5f-f4f0-431e-9342-4918793a0084',
 'Data Analysis Specialist',
 'Analyze marketing campaign performance and provide insights for travel industry campaigns',
 'data-analyst',
 '{"maxTokens": 4000, "readOnlyMode": false, "contentFiltering": true, "requireHumanApproval": false}',
 '[{"config": {}, "enabled": true, "version": "1.0.0", "moduleId": "data-analysis"}]',
 'claude-3-sonnet',
 'data-analyst-vector-store',
 'active',
 1);

-- Insert C# Code Generation Agent
INSERT INTO agents (id, name, goal, role, guardrails, modules, model, vector_store_id, status, created_by) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 'C# Code Generation Specialist',
 'Generate high-quality C# code for web APIs, applications, and enterprise solutions',
 'software-engineer',
 '{"maxTokens": 6000, "readOnlyMode": false, "contentFiltering": true, "requireHumanApproval": false}',
 '[{"config": {"language": "csharp", "frameworks": ["ASP.NET", ".NET Core"]}, "enabled": true, "version": "1.0.0", "moduleId": "code-generation"}]',
 'gpt-4o',
 'csharp-specialist-vector-store',
 'active',
 1);

-- Insert General Assistant Agent
INSERT INTO agents (id, name, goal, role, guardrails, modules, model, vector_store_id, status, created_by) VALUES
('f1e2d3c4-b5a6-7890-1234-567890abcdef',
 'General Assistant',
 'Provide comprehensive assistance across various domains including customer support and general inquiries',
 'assistant',
 '{"maxTokens": 4000, "readOnlyMode": false, "contentFiltering": true, "requireHumanApproval": false}',
 '[{"config": {}, "enabled": true, "version": "1.0.0", "moduleId": "general-assistance"}]',
 'gpt-4o-mini',
 'general-assistant-vector-store',
 'active',
 1);

-- Insert OpenAI credential (placeholder - replace with actual encrypted value)
INSERT INTO agent_credentials (id, agent_id, provider, api_key_name, encrypted_value, created_by) VALUES
('openai-marketing-cred-001',
 '144b514f-7761-4ce5-95d4-675a54a6215a',
 'openai',
 'OPENAI_API_KEY',
 'ENCRYPTED_OPENAI_KEY_PLACEHOLDER',
 1);

-- Reset sequences
SELECT setval('organizations_id_seq', (SELECT MAX(id) FROM organizations));
SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles));
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('user_roles_id_seq', (SELECT MAX(id) FROM user_roles));
SELECT setval('organization_members_id_seq', (SELECT MAX(id) FROM organization_members));
SELECT setval('api_keys_id_seq', (SELECT MAX(id) FROM api_keys));
SELECT setval('user_sessions_id_seq', (SELECT MAX(id) FROM user_sessions));

-- Verification
SELECT 'Import completed successfully!' as status;
SELECT COUNT(*) as total_agents FROM agents;
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as total_organizations FROM organizations;