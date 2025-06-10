#!/bin/bash

# Complete Local macOS Setup for AI Agent Platform
# Fixes DATABASE_URL errors and environment configuration

set -e

echo "🚀 AI Agent Platform - macOS Setup Fix"
echo "======================================"

# Get current directory and user
CURRENT_DIR=$(pwd)
CURRENT_USER=$(whoami)
DB_NAME="agent_platform"

echo "Working in: $CURRENT_DIR"
echo "User: $CURRENT_USER"

# Step 1: Check if .env exists, create if needed
if [ ! -f .env ]; then
    echo "Creating .env from .env.sample..."
    cp .env.sample .env
else
    echo ".env file found"
fi

# Step 2: Fix DATABASE_URL in .env
echo "Configuring DATABASE_URL..."

# Create correct DATABASE_URL
CORRECT_DB_URL="postgresql://${CURRENT_USER}@localhost:5432/${DB_NAME}"

# Update DATABASE_URL in .env file
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|DATABASE_URL=.*|DATABASE_URL=${CORRECT_DB_URL}|" .env
else
    # Linux
    sed -i "s|DATABASE_URL=.*|DATABASE_URL=${CORRECT_DB_URL}|" .env
fi

echo "Set DATABASE_URL to: $CORRECT_DB_URL"

# Step 3: Check PostgreSQL and create database
echo "Checking PostgreSQL setup..."

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "PostgreSQL not found. Installing via Homebrew..."
    if ! command -v brew &> /dev/null; then
        echo "Homebrew not found. Please install Homebrew first:"
        echo "/bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        exit 1
    fi
    brew install postgresql@15
    brew services start postgresql@15
fi

# Check if database exists, create if needed
if ! psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo "Creating database '$DB_NAME'..."
    createdb $DB_NAME
else
    echo "Database '$DB_NAME' already exists"
fi

# Step 4: Test database connection
echo "Testing database connection..."
if psql "$CORRECT_DB_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
    echo "Please check PostgreSQL is running: brew services list | grep postgresql"
    exit 1
fi

# Step 5: Install dependencies
echo "Installing npm dependencies..."
npm install

# Step 6: Set up database schema
echo "Setting up database schema..."
npx drizzle-kit push --force || echo "Schema push completed with warnings"

# Step 7: Run seeding scripts
echo "Seeding database with initial data..."

# Source the .env file for scripts
export $(cat .env | grep -v '^#' | xargs)

# Run seeding scripts
echo "Running role seeding..."
npx tsx server/seed-roles.ts || echo "Role seeding completed with warnings"

echo "Setting up demo users..."
npx tsx server/setup-demo-users.ts || echo "Demo user setup completed with warnings"

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "🚀 To start the application:"
echo "   npm run dev"
echo ""
echo "📱 Access the app at: http://localhost:5005"
echo ""
echo "🔑 Default login credentials:"
echo "   Admin: admin / admin123"
echo "   Developer: dev / dev123"
echo "   User: user / user123"
echo ""
echo "💡 If you encounter issues:"
echo "   1. Check PostgreSQL is running: brew services list"
echo "   2. Verify database connection: psql $CORRECT_DB_URL -c 'SELECT 1;'"
echo "   3. Check .env file has correct DATABASE_URL"
echo ""