#!/bin/bash

# EC2-compatible role seeding script using direct SQL
# This avoids Node.js SSL/WebSocket connection issues

echo "Setting up role-based access control for EC2..."

# Extract database connection details from DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL environment variable not set"
    exit 1
fi

# Parse DATABASE_URL for psql connection
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*\/\/[^:]*:\([^@]*\)@.*/\1/p')

export PGPASSWORD="$DB_PASS"

echo "Connecting to database at $DB_HOST:$DB_PORT/$DB_NAME as $DB_USER"

# Clear existing roles and insert new ones
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Clear existing roles
DELETE FROM roles;

-- Insert predefined roles
INSERT INTO roles (name, description, is_system_role, permissions, resource_limits) VALUES
('Super Admin', 'Full system access with all administrative privileges', true, 
 '["admin:*", "user:*", "agent:*", "deployment:*", "api:*", "credential:*"]'::jsonb,
 '{"maxAgents": 999999, "maxDeployments": 999999, "maxApiKeys": 999999, "maxCredentials": 999999, "dailyApiCalls": 999999, "monthlyCost": 999999}'::jsonb),

('Organization Admin', 'Administrative access within organization scope', true,
 '["user:create", "user:read", "user:update", "agent:*", "deployment:*", "api:*"]'::jsonb,
 '{"maxAgents": 100, "maxDeployments": 50, "maxApiKeys": 25, "maxCredentials": 50, "dailyApiCalls": 100000, "monthlyCost": 1000}'::jsonb),

('Agent Developer', 'Can create, modify, and deploy agents', true,
 '["agent:*", "deployment:create", "deployment:read", "deployment:update", "api:create", "api:read"]'::jsonb,
 '{"maxAgents": 25, "maxDeployments": 15, "maxApiKeys": 10, "maxCredentials": 20, "dailyApiCalls": 50000, "monthlyCost": 500}'::jsonb),

('API User', 'API access with rate limiting', true,
 '["api:read", "agent:read", "deployment:read"]'::jsonb,
 '{"maxAgents": 0, "maxDeployments": 0, "maxApiKeys": 5, "maxCredentials": 10, "dailyApiCalls": 10000, "monthlyCost": 100}'::jsonb),

('Standard User', 'Basic platform access', true,
 '["agent:read", "deployment:read"]'::jsonb,
 '{"maxAgents": 5, "maxDeployments": 3, "maxApiKeys": 2, "maxCredentials": 5, "dailyApiCalls": 5000, "monthlyCost": 50}'::jsonb),

('Viewer', 'Read-only access to assigned resources', true,
 '["agent:read", "deployment:read"]'::jsonb,
 '{"maxAgents": 0, "maxDeployments": 0, "maxApiKeys": 1, "maxCredentials": 2, "dailyApiCalls": 1000, "monthlyCost": 10}'::jsonb);

-- Verify roles were created
SELECT COUNT(*) as role_count, string_agg(name, ', ') as role_names FROM roles;
EOF

if [ $? -eq 0 ]; then
    echo "✅ Roles seeded successfully"
else
    echo "❌ Role seeding failed"
    exit 1
fi

unset PGPASSWORD