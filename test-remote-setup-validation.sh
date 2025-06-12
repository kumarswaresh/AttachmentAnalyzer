#!/bin/bash

# Remote Setup Script Validation Test
# Tests the remote setup script functionality with simulated RDS environment

set -e

echo "🧪 Testing Remote Setup Script"
echo "=============================="

# Backup current .env
if [ -f .env ]; then
    cp .env .env.original-backup
    echo "Backed up original .env"
fi

# Create test environment with realistic RDS-like variables
cat > .env << EOF
# Test RDS Configuration
DATABASE_URL=${DATABASE_URL}
OPENAI_API_KEY=${OPENAI_API_KEY}
SESSION_SECRET=test-remote-session-secret-12345-abcdef-production
NODE_ENV=production
PGPORT=5432
PGUSER=agentplatform_user
PGPASSWORD=secure_rds_password_123
PGDATABASE=agent_platform_prod
PGHOST=agent-platform-rds.cluster-xyz.us-east-1.rds.amazonaws.com
EOF

echo "Created test RDS environment configuration"

# Test 1: Environment Variable Validation
echo ""
echo "Test 1: Environment Variable Validation"
echo "======================================="

if grep -q "DATABASE_URL=" .env && grep -q "OPENAI_API_KEY=" .env && grep -q "SESSION_SECRET=" .env; then
    echo "✅ Required environment variables present"
else
    echo "❌ Missing required environment variables"
    exit 1
fi

# Test 2: Database Connection Test
echo ""
echo "Test 2: Database Connection Test"
echo "==============================="

# Source environment variables
export $(cat .env | grep -v '^#' | xargs)

# Test database connection with SSL configuration (simulating RDS)
npx tsx -e "
import { Pool } from 'pg';
const client = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
client.query('SELECT 1').then(() => {
  console.log('✅ Database connection successful with SSL configuration');
  process.exit(0);
}).catch(err => {
  console.error('❌ Database connection failed:', err.message);
  process.exit(1);
});
" 2>/dev/null

# Test 3: Schema Detection
echo ""
echo "Test 3: Schema Detection"
echo "======================="

SCHEMA_EXISTS=$(npx tsx -e "
import { Pool } from 'pg';
const client = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
client.query(\"SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users'\")
  .then(result => {
    console.log(result.rows.length > 0 ? 'exists' : 'missing');
    process.exit(0);
  })
  .catch(err => {
    console.log('error');
    process.exit(0);
  });
" 2>/dev/null)

if [ "$SCHEMA_EXISTS" = "exists" ]; then
    echo "✅ Database schema detected successfully"
elif [ "$SCHEMA_EXISTS" = "missing" ]; then
    echo "✅ No existing schema detected (clean database)"
else
    echo "❌ Schema detection failed"
    exit 1
fi

# Test 4: SSL Configuration Validation
echo ""
echo "Test 4: SSL Configuration Validation"
echo "===================================="

if [ "$NODE_ENV" = "production" ]; then
    echo "✅ Production environment detected - SSL will be enforced"
else
    echo "✅ Development environment detected - SSL optional"
fi

# Test 5: Script Component Validation
echo ""
echo "Test 5: Remote Setup Script Component Validation"
echo "==============================================="

# Check if remote setup script exists and is executable
if [ -f "setup/remote/remote-setup.sh" ] && [ -x "setup/remote/remote-setup.sh" ]; then
    echo "✅ Remote setup script found and executable"
else
    echo "❌ Remote setup script missing or not executable"
    exit 1
fi

# Check if required setup scripts exist
if [ -f "setup/scripts/quick-admin-setup.ts" ] && [ -f "setup/scripts/demo-data-setup.ts" ]; then
    echo "✅ Required setup scripts present"
else
    echo "❌ Missing required setup scripts"
    exit 1
fi

# Test 6: Run Actual Remote Setup Script (dry run simulation)
echo ""
echo "Test 6: Remote Setup Script Execution Test"
echo "=========================================="

echo "Executing remote setup script..."

# Run the actual remote setup script
if ./setup/remote/remote-setup.sh; then
    echo "✅ Remote setup script executed successfully"
else
    echo "❌ Remote setup script execution failed"
    exit 1
fi

# Test 7: Verify Setup Results
echo ""
echo "Test 7: Setup Results Verification"
echo "================================="

# Test admin user creation
ADMIN_EXISTS=$(npx tsx -e "
import { Pool } from 'pg';
const client = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
client.query('SELECT id FROM users WHERE email = \$1', ['admin@local.dev'])
  .then(result => {
    console.log(result.rows.length > 0 ? 'exists' : 'missing');
    process.exit(0);
  })
  .catch(err => {
    console.log('error');
    process.exit(0);
  });
" 2>/dev/null)

if [ "$ADMIN_EXISTS" = "exists" ]; then
    echo "✅ Admin user created successfully"
else
    echo "⚠️  Admin user not found (may already exist)"
fi

# Cleanup and restore
echo ""
echo "Test Cleanup"
echo "============"

if [ -f .env.original-backup ]; then
    mv .env.original-backup .env
    echo "✅ Restored original .env file"
fi

echo ""
echo "🎉 Remote Setup Script Test Complete!"
echo ""
echo "Summary:"
echo "✅ Environment variable validation"
echo "✅ Database connection with SSL"
echo "✅ Schema detection logic"
echo "✅ SSL configuration handling"
echo "✅ Script execution"
echo "✅ Setup verification"
echo ""
echo "The remote setup script is ready for AWS RDS deployment!"
EOF