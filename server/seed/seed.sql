-- Seed data for agent platform
-- Run with: psql -d your_database_name -f server/seed/seed.sql

-- Insert module definitions
INSERT INTO module_definitions (id, name, version, description, type, schema, dependencies, status) VALUES
('prompt-module', 'Prompt Module', '2.1.0', 'Advanced prompt engineering and template management', 'core', 
 '{"type": "object", "properties": {"templateId": {"type": "string"}, "variables": {"type": "object"}, "context": {"type": "array"}}}',
 '[]', 'stable'),
('recommendation-module', 'Recommendation Module', '1.8.2', 'Generate intelligent recommendations based on data analysis', 'analysis',
 '{"type": "object", "properties": {"context": {"type": "string"}, "userProfile": {"type": "object"}, "filters": {"type": "object"}}}',
 '["prompt-module"]', 'stable'),
('database-connector', 'Database Connector', '3.0.1', 'Secure database connections with query validation', 'integration',
 '{"type": "object", "properties": {"query": {"type": "string"}, "operation": {"type": "string"}, "table": {"type": "string"}}}',
 '[]', 'stable'),
('mcp-connector', 'MCP Connector', '2.0.0', 'Connect to external services via Model Context Protocol', 'integration',
 '{"type": "object", "properties": {"url": {"type": "string"}, "method": {"type": "string"}, "headers": {"type": "object"}}}',
 '[]', 'stable'),
('logging-module', 'Logging Module', '1.5.0', 'Comprehensive logging and monitoring capabilities', 'core',
 '{"type": "object", "properties": {"level": {"type": "string"}, "message": {"type": "string"}, "metadata": {"type": "object"}}}',
 '[]', 'stable')
ON CONFLICT (id) DO NOTHING;

-- Insert sample agents
INSERT INTO agents (id, name, goal, role, guardrails, modules, model, vector_store_id, status, created_at) VALUES
(gen_random_uuid(), 'Marketing Agent', 'Recommend multi-channel campaign content that maximises CVR', 'Marketing Campaign Specialist',
 '{"requireHumanApproval": false, "contentFiltering": true, "readOnlyMode": false, "maxTokens": 4000, "allowedDomains": ["marketing.company.com"], "blockedKeywords": ["competitor"]}',
 '[{"moduleId": "prompt-module", "version": "2.1.0", "config": {"templates": {"campaign_analysis": "Analyze the following campaign data and provide recommendations: {{data}}"}}, "enabled": true}, {"moduleId": "recommendation-module", "version": "1.8.2", "config": {"algorithm": "hybrid", "maxRecommendations": 5, "confidenceThreshold": 0.7}, "enabled": true}]',
 'gpt-4o', 'marketing-vector-store', 'active', NOW()),
(gen_random_uuid(), 'Release Notes Agent', 'Generate Confluence-ready release notes matching existing template', 'Technical Documentation Specialist',
 '{"requireHumanApproval": true, "contentFiltering": true, "readOnlyMode": true, "maxTokens": 3000, "allowedDomains": ["confluence.company.com", "jira.company.com"], "blockedKeywords": ["confidential", "internal"]}',
 '[{"moduleId": "prompt-module", "version": "2.1.0", "config": {"templates": {"release_notes": "Generate release notes for version {{version}} with the following changes: {{changes}}"}}, "enabled": true}, {"moduleId": "mcp-connector", "version": "2.0.0", "config": {"timeout": 30000, "retries": 3}, "enabled": true}]',
 'gpt-4o', 'release-notes-vector-store', 'active', NOW()),
(gen_random_uuid(), 'Hotel Booking Agent', 'Provide personalized hotel recommendations and booking assistance', 'Travel Specialist',
 '{"requireHumanApproval": false, "contentFiltering": true, "readOnlyMode": false, "maxTokens": 3500, "allowedDomains": ["booking.com", "hotels.com"], "blockedKeywords": ["fake", "scam"]}',
 '[{"moduleId": "recommendation-module", "version": "1.8.2", "config": {"algorithm": "collaborative", "maxRecommendations": 10, "confidenceThreshold": 0.8}, "enabled": true}, {"moduleId": "mcp-connector", "version": "2.0.0", "config": {"timeout": 25000, "retries": 2}, "enabled": true}]',
 'gpt-4o', 'hotel-vector-store', 'active', NOW());

-- Create a test user
INSERT INTO users (username, email, password_hash, role, is_active) VALUES
('demo_user', 'demo@example.com', '$2b$10$example_hash_placeholder', 'user', true)
ON CONFLICT (username) DO NOTHING;

-- Create some sample agent templates
INSERT INTO agent_templates (name, description, base_config, category, is_public, created_by) VALUES
('Marketing Campaign Agent', 'Template for creating marketing campaign analysis agents', 
 '{"modules": [{"moduleId": "recommendation-module", "enabled": true}, {"moduleId": "prompt-module", "enabled": true}], "guardrails": {"maxTokens": 4000, "contentFiltering": true}}',
 'marketing', true, 1),
('Documentation Agent', 'Template for creating technical documentation agents',
 '{"modules": [{"moduleId": "prompt-module", "enabled": true}, {"moduleId": "mcp-connector", "enabled": true}], "guardrails": {"requireHumanApproval": true, "maxTokens": 3000}}',
 'documentation', true, 1),
('Data Analysis Agent', 'Template for creating data analysis and reporting agents',
 '{"modules": [{"moduleId": "database-connector", "enabled": true}, {"moduleId": "recommendation-module", "enabled": true}], "guardrails": {"readOnlyMode": true, "maxTokens": 5000}}',
 'analytics', true, 1)
ON CONFLICT (name) DO NOTHING;

\echo 'Sample data seeding completed successfully!';