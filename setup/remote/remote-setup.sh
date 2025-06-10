#!/bin/bash

# Remote Database Setup for AI Agent Platform
# Setup for production/cloud databases (Neon, AWS RDS, etc.)

set -e

echo "🌐 AI Agent Platform - Remote Database Setup"
echo "==========================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create from .env.sample first."
    exit 1
fi

# Source environment variables
export $(cat .env | grep -v '^#' | xargs)

# Validate required environment variables
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set in .env file"
    echo "Please set your remote database URL in .env:"
    echo "DATABASE_URL=postgresql://username:password@host:port/database"
    exit 1
fi

echo "Testing remote database connection..."
if ! npx tsx -e "import { Pool } from 'pg'; const client = new Pool({connectionString: process.env.DATABASE_URL}); client.query('SELECT 1').then(() => { console.log('✅ Database connection successful'); process.exit(0); }).catch(err => { console.error('❌ Database connection failed:', err.message); process.exit(1); });" ; then
    echo "❌ Cannot connect to remote database"
    echo "Please check your DATABASE_URL and network connectivity"
    exit 1
fi

# Install dependencies
echo "Installing npm dependencies..."
npm install

# Set up database schema
echo "Setting up remote database schema..."
npx drizzle-kit push --force

# Create admin user
echo "Setting up admin user..."
npx tsx setup/scripts/quick-admin-setup.ts

# Create demo data
echo "Setting up demo data..."
npx tsx setup/scripts/demo-data-setup.ts

echo ""
echo "🎉 Remote Database Setup Complete!"
echo ""
echo "🚀 To start the application:"
echo "   npm run dev"
echo ""
echo "📱 Your app will be accessible on the configured port"
echo ""
echo "🔑 Login credentials:"
echo "   Admin: admin / admin123"
echo "   Demo User: demo-user / demo123"
echo "   Test User: test-user / demo123"
echo ""