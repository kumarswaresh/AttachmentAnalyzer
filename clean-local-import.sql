-- Clean Local PostgreSQL Import Script
-- This removes all Neon-specific roles, extensions, and database references
-- Usage: psql -U anandkumar -d postgres -f clean-local-import.sql

-- Create the agent_platform database if it doesn't exist
DROP DATABASE IF EXISTS agent_platform;
CREATE DATABASE agent_platform;

-- Connect to the new database
\c agent_platform;

-- Create all tables without owner specifications
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

-- Create indexes for performance
CREATE INDEX idx_sessions_expire ON sessions(expire);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_api_keys_key_id ON api_keys(key_id);

-- Insert roles
INSERT INTO roles (name, description, permissions) VALUES 
('admin', 'Administrator with full access', ARRAY['admin:read', 'admin:write', 'users:manage', 'agents:manage']),
('user', 'Regular user', ARRAY['agents:read', 'agents:execute']),
('developer', 'Developer access', ARRAY['agents:read', 'agents:write', 'agents:execute']);

-- Insert organizations
INSERT INTO organizations (name, description) VALUES 
('ACME Corporation', 'Main organization for platform administration'),
('Tech Startup Inc', 'Technology startup organization'),
('Marketing Agency Ltd', 'Digital marketing and advertising agency'),
('Global Hotels Group', 'International hotel chain management'),
('Travel Solutions Inc', 'Travel technology and booking platform'),
('Hospitality Partners', 'Hotel consulting and management services'),
('Digital Marketing Hub', 'Full-service digital marketing agency'),
('Tourism Board Alliance', 'Regional tourism promotion organization'),
('Boutique Hotel Collection', 'Luxury boutique hotel management'),
('Corporate Travel Services', 'Business travel management company'),
('Resort Management Group', 'Resort and vacation property management'),
('Event Planning Solutions', 'Corporate and leisure event planning'),
('Airline Partnership Network', 'Airline industry collaboration platform'),
('Cruise Line Operations', 'Cruise ship and voyage management'),
('Adventure Travel Co', 'Specialized adventure and eco-tourism'),
('Business Conference Center', 'Corporate meeting and conference facilities'),
('Vacation Rental Platform', 'Short-term rental management system'),
('Travel Insurance Group', 'Comprehensive travel protection services');

-- Insert admin user (password: admin123)
INSERT INTO users (username, email, password_hash, first_name, last_name) VALUES 
('admin', 'admin@localhost', '$2b$10$8K1p/a8glBjRlGpyGqIJMeJ.Q/WlJHG5JOXYdvf7qYl6KQfJUkQKu', 'Admin', 'User');

-- Insert demo users
INSERT INTO users (username, email, password_hash, first_name, last_name) VALUES 
('demo-admin', 'demo-admin@localhost', '$2b$10$8K1p/a8glBjRlGpyGqIJMeJ.Q/WlJHG5JOXYdvf7qYl6KQfJUkQKu', 'Demo', 'Admin'),
('marketing-user', 'marketing@localhost', '$2b$10$8K1p/a8glBjRlGpyGqIJMeJ.Q/WlJHG5JOXYdvf7qYl6KQfJUkQKu', 'Marketing', 'Specialist'),
('developer', 'dev@localhost', '$2b$10$8K1p/a8glBjRlGpyGqIJMeJ.Q/WlJHG5JOXYdvf7qYl6KQfJUkQKu', 'Developer', 'User'),
('analyst', 'analyst@localhost', '$2b$10$8K1p/a8glBjRlGpyGqIJMeJ.Q/WlJHG5JOXYdvf7qYl6KQfJUkQKu', 'Data', 'Analyst'),
('agent-manager', 'manager@localhost', '$2b$10$8K1p/a8glBjRlGpyGqIJMeJ.Q/WlJHG5JOXYdvf7qYl6KQfJUkQKu', 'Agent', 'Manager');

-- Insert user roles
INSERT INTO user_roles (user_id, role_id, organization_id) VALUES 
(1, 1, 1), -- admin as admin in ACME Corporation
(2, 1, 2), -- demo-admin as admin in Tech Startup
(3, 2, 3), -- marketing-user as user in Marketing Agency
(4, 3, 1), -- developer as developer in ACME Corporation
(5, 2, 4), -- analyst as user in Global Hotels Group
(6, 1, 5); -- agent-manager as admin in Travel Solutions

-- Insert organization memberships
INSERT INTO organization_members (user_id, organization_id, role) VALUES 
(1, 1, 'admin'),
(2, 2, 'admin'),
(3, 3, 'member'),
(4, 1, 'developer'),
(5, 4, 'analyst'),
(6, 5, 'manager');

-- Insert Marketing Campaign Specialist Agent (with OpenAI GPT-4 integration)
INSERT INTO agents (id, name, goal, role, guardrails, modules, model, vector_store_id, status, created_by) VALUES 
('144b514f-7761-4ce5-95d4-675a54a6215a', 
 'Marketing Campaign Specialist', 
 'Generate comprehensive marketing campaigns for travel and hospitality clients with authentic hotel recommendations using OpenAI GPT-4. No hardcoded data - all responses generated in real-time from OpenAI API.',
 'content-creator',
 '{"maxTokens": 4000, "readOnlyMode": false, "contentFiltering": true, "requireHumanApproval": false}',
 '[{"config": {"hotelRecommendations": true, "openaiIntegration": true, "authenticData": true}, "enabled": true, "version": "1.0.0", "moduleId": "marketing-campaign"}]',
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

-- Insert OpenAI credential for marketing agent
INSERT INTO agent_credentials (id, agent_id, provider, api_key_name, encrypted_value, created_by) VALUES 
('openai-marketing-cred-001',
 '144b514f-7761-4ce5-95d4-675a54a6215a',
 'openai',
 'OPENAI_API_KEY',
 'ENCRYPTED_OPENAI_KEY_PLACEHOLDER',
 1);

-- Insert API keys for testing
INSERT INTO api_keys (key_id, user_id, name, permissions, allowed_endpoints, organization_id) VALUES 
('api_key_admin_001', 1, 'Admin Master Key', ARRAY['admin:read', 'admin:write', 'agents:manage'], ARRAY['/api/v1/admin/*', '/api/v1/agents/*'], 1),
('api_key_marketing_001', 3, 'Marketing API Key', ARRAY['agents:read', 'agents:execute'], ARRAY['/api/v1/marketing/*'], 3);

-- Display success message and summary
SELECT 'Database import completed successfully!' as status;
SELECT COUNT(*) as total_agents FROM agents;
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as total_organizations FROM organizations;
SELECT COUNT(*) as total_roles FROM roles;

-- Show the imported agents
SELECT id, name, role, model, status FROM agents ORDER BY created_at;