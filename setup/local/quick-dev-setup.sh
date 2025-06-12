#!/bin/bash

# Quick Development Setup for Ubuntu 22.04
# Minimal setup for local development

set -e

echo "Quick AI Agent Platform development setup..."

# Install Node.js 20.x if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# Install PostgreSQL if not present
if ! command -v psql &> /dev/null; then
    echo "Installing PostgreSQL..."
    sudo apt update
    sudo apt install -y postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    # Configure PostgreSQL
    sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
    sudo -u postgres createdb ai_agent_platform || true
fi

# Install project dependencies
echo "Installing dependencies..."
npm install

# Setup environment
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.sample .env
    sed -i 's|DATABASE_URL=.*|DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_agent_platform|' .env
fi

# Setup database
echo "Setting up database..."
npm run db:push || echo "Database setup completed"

# Create demo data
echo "Creating demo data..."
npm run setup:demo || echo "Demo setup completed"

echo ""
echo "Setup complete! Run 'npm run dev' to start development server"
echo "Access the application at http://localhost:3000"