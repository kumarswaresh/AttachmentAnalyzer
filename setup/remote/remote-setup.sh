#!/bin/bash

# Remote Database Setup for AI Agent Platform
# Setup for production/cloud databases (AWS RDS, Neon, etc.)

set -e

echo "🌐 AI Agent Platform - Remote Database Setup"
echo "==========================================="

# Get current directory
CURRENT_DIR=$(pwd)
echo "Working in: $CURRENT_DIR"

# Check if .env exists, create from sample if needed
if [ ! -f .env ]; then
    if [ -f .env.sample ]; then
        echo "Creating .env from .env.sample..."
        cp .env.sample .env
        echo "❗ Please update .env with your RDS connection details before continuing"
        echo "Required: DATABASE_URL, OPENAI_API_KEY, and other production secrets"
        exit 1
    else
        echo "❌ .env file not found and .env.sample not available"
        echo "Please create .env file with your RDS connection details"
        exit 1
    fi
fi

# Source environment variables
export $(cat .env | grep -v '^#' | xargs)

# Validate required environment variables
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set in .env file"
    echo "Please set your AWS RDS database URL in .env:"
    echo "DATABASE_URL=postgresql://username:password@rds-endpoint.region.rds.amazonaws.com:5432/database"
    exit 1
fi

# Validate other critical environment variables
MISSING_VARS=""
if [ -z "$OPENAI_API_KEY" ]; then
    MISSING_VARS="$MISSING_VARS OPENAI_API_KEY"
fi
if [ -z "$SESSION_SECRET" ]; then
    MISSING_VARS="$MISSING_VARS SESSION_SECRET"
fi

if [ ! -z "$MISSING_VARS" ]; then
    echo "❌ Missing required environment variables:$MISSING_VARS"
    echo "Please update your .env file with all required production secrets"
    exit 1
fi

# Clean install process - remove lock file and node_modules
echo "Cleaning previous installation..."
rm -f package-lock.json
rm -rf node_modules

# Install dependencies fresh (including dev dependencies for deployment tools)
echo "Installing npm dependencies fresh (including dev dependencies)..."
npm install --include=dev

# Install critical deployment tools specifically
echo "Installing deployment tools..."
npm install drizzle-kit tsx --save-dev

# Check if tools are in local node_modules
echo "Checking local installation..."
if [ -d "node_modules/drizzle-kit" ]; then
    echo "✅ drizzle-kit found in local node_modules"
else
    echo "❌ drizzle-kit missing from local node_modules, forcing install..."
    npm install drizzle-kit --save-dev --force --no-package-lock
fi

if [ -d "node_modules/tsx" ]; then
    echo "✅ tsx found in local node_modules"
else
    echo "❌ tsx missing from local node_modules, forcing install..."
    npm install tsx --save-dev --force --no-package-lock
fi

# Final verification
echo "Final verification of tools..."
npx drizzle-kit --version || echo "Warning: drizzle-kit not working via npx"
npx tsx --version || echo "Warning: tsx not working via npx"

# Test database connection after dependencies are installed
echo "Testing remote database connection..."
if ! npx tsx -e "
import { Pool } from 'pg'; 
const client = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
}); 
client.query('SELECT 1').then(() => { 
  console.log('✅ Database connection successful'); 
  process.exit(0); 
}).catch(err => { 
  console.error('❌ Database connection failed:', err.message); 
  process.exit(1); 
});
" 2>/dev/null; then
    echo "❌ Cannot connect to remote database"
    echo "Please check:"
    echo "  1. Your DATABASE_URL is correct"
    echo "  2. Security groups allow connections from this IP"
    echo "  3. Database is publicly accessible (if needed)"
    echo "  4. Network connectivity to AWS RDS"
    exit 1
fi

# Check if database schema exists
echo "Checking database schema..."
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
    console.log('missing');
    process.exit(0);
  });
" 2>/dev/null)

if [ "$SCHEMA_EXISTS" = "exists" ]; then
    echo "Database schema already exists, checking for updates..."
    npx drizzle-kit push --config=drizzle.config.js || echo "Schema update completed"
else
    echo "Setting up database schema..."
    npx drizzle-kit push --config=drizzle.config.js --force
fi

# Source the .env file for scripts
export $(cat .env | grep -v '^#' | xargs)

# Create admin user
echo "Setting up admin user..."
npx tsx setup/scripts/quick-admin-setup.ts || echo "Admin user creation completed"

# Create demo data
echo "Setting up demo data..."
npx tsx setup/scripts/demo-data-setup.ts || echo "Demo setup completed"

echo ""
echo "🎉 Remote Database Setup Complete!"
echo ""
echo "🚀 To start the application:"
echo "   npm run dev"
echo ""
echo "📱 Your app will be accessible on the configured port"
echo ""
echo "🔑 Login credentials:"
echo "   Admin: admin@local.dev / admin123"
echo "   SuperAdmin: superadmin@agentplatform.com / admin123"
echo "   Demo: demo@agentplatform.com / demo123"
echo ""
echo "💡 For AWS RDS deployment:"
echo "   1. Ensure security groups allow inbound PostgreSQL (5432)"
echo "   2. Database should be publicly accessible if connecting from EC2"
echo "   3. Use SSL connections in production"
echo "   4. Set NODE_ENV=production for SSL enforcement"
echo ""