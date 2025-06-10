#!/bin/bash

# Local macOS Setup Script for AI Agent Platform
set -e

echo "🚀 AI Agent Platform - Local macOS Setup"
echo "========================================"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists node; then
    echo "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm not found. Please install npm"
    exit 1
fi

echo "✅ Node.js and npm found"

# Check/Install PostgreSQL
echo "📋 Checking PostgreSQL..."

if ! command_exists psql; then
    echo "⚠️  PostgreSQL not found. Installing via Homebrew..."
    
    if ! command_exists brew; then
        echo "❌ Homebrew not found. Please install Homebrew first:"
        echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        exit 1
    fi
    
    brew install postgresql@15
    brew services start postgresql@15
    echo "✅ PostgreSQL installed and started"
else
    echo "✅ PostgreSQL found"
    
    # Start PostgreSQL if not running
    if ! pgrep -x "postgres" > /dev/null; then
        if command_exists brew; then
            brew services start postgresql@15
            echo "✅ PostgreSQL started"
        fi
    fi
fi

# Get current user for database URL
CURRENT_USER=$(whoami)
DB_NAME="agent_platform"

# Create database if it doesn't exist
echo "📋 Setting up database..."
if ! psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    createdb $DB_NAME
    echo "✅ Database '$DB_NAME' created"
else
    echo "✅ Database '$DB_NAME' already exists"
fi

# Create .env file if it doesn't exist
echo "📋 Setting up environment configuration..."
if [ ! -f .env ]; then
    cp .env.sample .env
    
    # Update DATABASE_URL in .env
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|DATABASE_URL=.*|DATABASE_URL=postgresql://${CURRENT_USER}@localhost:5432/${DB_NAME}|" .env
    else
        # Linux
        sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://${CURRENT_USER}@localhost:5432/${DB_NAME}|" .env
    fi
    
    echo "✅ Environment file created with database configuration"
    echo "⚠️  Please edit .env and add your OPENAI_API_KEY"
    echo "   Get your key from: https://platform.openai.com/api-keys"
else
    echo "✅ Environment file already exists"
fi

# Install dependencies
echo "📋 Installing dependencies..."
npm install
echo "✅ Dependencies installed"

# Check for OPENAI_API_KEY
source .env
if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" = "sk-your-openai-api-key-here" ]; then
    echo "⚠️  OPENAI_API_KEY not configured in .env"
    echo "   Please edit .env and add your OpenAI API key to continue"
    echo ""
    echo "To continue setup after adding the API key, run:"
    echo "   npx tsx complete-fresh-setup.ts"
    exit 0
fi

# Run database setup
echo "📋 Setting up database schema and data..."
npx drizzle-kit push --force
npx tsx server/seed-roles.ts
npx tsx server/setup-demo-users.ts

echo ""
echo "🎉 Setup complete!"
echo ""
echo "🚀 To start the application:"
echo "   npm run dev"
echo ""
echo "📱 Access the app at: http://localhost:5000"
echo ""
echo "🔑 Default login credentials:"
echo "   Admin: admin / admin123"
echo "   Developer: dev / dev123"
echo "   User: user / user123"
echo ""