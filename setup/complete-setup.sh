#!/bin/bash

# Complete AI Agent Platform Setup Script
# Works for both local Ubuntu and remote EC2 deployment

set -e

echo "🚀 AI Agent Platform Complete Setup"

# Detect environment
if [ -f "/etc/os-release" ]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
else
    echo "Cannot detect OS"
    exit 1
fi

echo "Detected OS: $OS $VER"

# Check if we're on EC2
EC2_INSTANCE=""
if curl -s --max-time 3 http://169.254.169.254/latest/meta-data/instance-id >/dev/null 2>&1; then
    EC2_INSTANCE=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
    echo "Running on EC2 instance: $EC2_INSTANCE"
fi

# Install Node.js 20.x if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt update
    sudo apt install -y nodejs
fi

NODE_VERSION=$(node --version)
echo "Node.js version: $NODE_VERSION"

# Install PostgreSQL 16 if not present and using local database
if ! command -v psql &> /dev/null && [[ "$DATABASE_URL" == *"localhost"* ]]; then
    echo "Installing PostgreSQL 16 for local development..."
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
    PG_VERSION=$(sudo -u postgres psql -c "SELECT version();" | grep PostgreSQL)
    echo "PostgreSQL installed: $PG_VERSION"
elif command -v psql &> /dev/null; then
    PG_VERSION=$(psql --version)
    echo "PostgreSQL already installed: $PG_VERSION"
fi

# Install project dependencies
echo "Installing project dependencies..."
npm install

# Check if .env exists, create from sample if not
if [ ! -f ".env" ]; then
    echo "Creating .env file from sample..."
    cp .env.sample .env
    
    # Set default local database if no DATABASE_URL is configured
    if ! grep -q "^DATABASE_URL=" .env || grep -q "^DATABASE_URL=$" .env; then
        echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_agent_platform" >> .env
    fi
fi

# Source environment variables
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Check DATABASE_URL configuration
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not configured in .env file"
    echo "Please configure your database connection string"
    exit 1
fi

echo "✅ DATABASE_URL configured"

# Test database connection
echo "Testing database connection..."
if command -v psql &> /dev/null; then
    # Extract connection details from DATABASE_URL for psql test
    DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
    DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
    
    echo "Testing connection to $DB_HOST:$DB_PORT/$DB_NAME as $DB_USER"
    
    # Test basic connectivity
    if timeout 10 bash -c "</dev/tcp/$DB_HOST/$DB_PORT" 2>/dev/null; then
        echo "✅ Database server is reachable"
    else
        echo "❌ Cannot reach database server at $DB_HOST:$DB_PORT"
        echo "Please check your DATABASE_URL configuration"
        exit 1
    fi
else
    echo "psql not installed, skipping direct database test"
fi

# Setup database schema using JavaScript config (EC2 compatible)
echo "Setting up database schema..."
if npx drizzle-kit push --config=drizzle.config.js; then
    echo "✅ Database schema updated successfully"
else
    echo "⚠️  Database schema update failed, continuing anyway..."
fi

# Create admin user
echo "Creating admin user..."
if npx tsx setup/scripts/simple-admin-setup.ts; then
    echo "✅ Admin user setup completed"
else
    echo "⚠️  Admin user creation failed, you can create one manually"
fi

# Setup demo data
echo "Setting up demo data..."
if npx tsx setup/scripts/setup-demo-users.ts; then
    echo "✅ Demo data created"
else
    echo "⚠️  Demo data setup failed, continuing anyway..."
fi

# Install PM2 globally for process management
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2 process manager..."
    sudo npm install -g pm2
fi

# Create PM2 ecosystem file
echo "Creating PM2 configuration..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'ai-agent-platform',
    script: 'npm',
    args: 'start',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF

# Set up nginx if requested
if [ "$1" = "--with-nginx" ] || [ "$1" = "--production" ]; then
    if ! command -v nginx &> /dev/null; then
        echo "Installing Nginx..."
        sudo apt install -y nginx
    fi
    
    echo "Configuring Nginx..."
    sudo tee /etc/nginx/sites-available/ai-agent-platform > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
    
    sudo ln -sf /etc/nginx/sites-available/ai-agent-platform /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t && sudo systemctl restart nginx
    echo "✅ Nginx configured"
fi

# Set up systemd service for production
if [ "$1" = "--production" ]; then
    echo "Creating systemd service..."
    sudo tee /etc/systemd/system/ai-agent-platform.service > /dev/null << EOF
[Unit]
Description=AI Agent Platform
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
    
    sudo systemctl daemon-reload
    sudo systemctl enable ai-agent-platform.service
    echo "✅ Systemd service created"
fi

echo ""
echo "=================================="
echo "✅ Setup completed successfully!"
echo "=================================="
echo ""

if [ "$1" = "--production" ]; then
    echo "🚀 Production deployment ready:"
    echo "  Start service: sudo systemctl start ai-agent-platform"
    echo "  View logs: sudo journalctl -u ai-agent-platform -f"
    echo "  Access app: http://your-server-ip"
else
    echo "🔧 Development setup ready:"
    echo "  Start development: npm run dev"
    echo "  Start with PM2: pm2 start ecosystem.config.js"
    echo "  Access app: http://localhost:3000"
fi

echo ""
echo "📋 Admin login credentials:"
echo "  Email: admin@local.dev"
echo "  Password: admin123"
echo ""

if [ -n "$EC2_INSTANCE" ]; then
    echo "☁️  EC2 deployment detected"
    echo "  Instance ID: $EC2_INSTANCE"
    echo "  Remember to configure security groups for port 80/443"
fi

echo "⚠️  Next steps:"
echo "  1. Update .env with your API keys (OPENAI_API_KEY, etc.)"
echo "  2. Configure your domain/DNS if using production mode"
echo "  3. Set up SSL certificates for production use"