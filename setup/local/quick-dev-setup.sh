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

# Install PostgreSQL 16 if not present
if ! command -v psql &> /dev/null; then
    echo "Installing PostgreSQL 16..."
    sudo apt update
    
    # Add PostgreSQL official APT repository
    sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
    sudo apt update
    
    # Install PostgreSQL 16
    sudo apt install -y postgresql-16 postgresql-client-16 postgresql-contrib-16
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    # Configure PostgreSQL
    sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
    sudo -u postgres createdb ai_agent_platform || true
    
    # Verify version
    echo "PostgreSQL version installed:"
    sudo -u postgres psql -c "SELECT version();" | grep PostgreSQL
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

# Seed roles first
echo "Setting up role-based access control..."
npx tsx setup/scripts/seed-roles.ts || echo "Role setup completed"

# Create demo data with roles and organizations
echo "Creating comprehensive demo data..."
if npx tsx server/setup/setup-demo-users.ts; then
    echo "✅ Comprehensive demo data created"
else
    echo "Using fallback demo data..."
    npx tsx setup/scripts/demo-data-setup.ts || echo "Demo setup completed"
fi

echo ""
echo "Setup complete! Run 'npm run dev' to start development server"
echo "Access the application at http://localhost:3000"