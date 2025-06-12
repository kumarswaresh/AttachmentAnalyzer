#!/bin/bash

# AI Agent Platform - Ubuntu 22.04 Local Setup Script
# This script sets up the complete development environment on Ubuntu 22.04

set -e

echo "🚀 Starting AI Agent Platform setup for Ubuntu 22.04..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root. Please run as a regular user."
   exit 1
fi

# Update system packages
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install essential development tools
print_status "Installing essential development tools..."
sudo apt install -y \
    curl \
    wget \
    git \
    build-essential \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    unzip \
    vim \
    htop \
    tree

# Install Node.js 20.x
print_status "Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js installation
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
print_success "Node.js installed: $NODE_VERSION"
print_success "npm installed: $NPM_VERSION"

# Install PostgreSQL 14
print_status "Installing PostgreSQL 14..."
sudo apt install -y postgresql postgresql-contrib postgresql-client

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Configure PostgreSQL for development
print_status "Configuring PostgreSQL..."
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
sudo -u postgres createdb ai_agent_platform || true

print_success "PostgreSQL installed and configured"

# Install Redis (for session storage and caching)
print_status "Installing Redis..."
sudo apt install -y redis-server

# Start and enable Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

print_success "Redis installed and configured"

# Install PM2 globally for process management
print_status "Installing PM2 process manager..."
sudo npm install -g pm2

# Set up PM2 to start on boot
pm2 startup
print_warning "Run the command above to enable PM2 startup"

# Clone the project (if not already present)
PROJECT_DIR="$HOME/ai-agent-platform"
if [ ! -d "$PROJECT_DIR" ]; then
    print_status "Cloning AI Agent Platform repository..."
    git clone https://github.com/your-repo/ai-agent-platform.git "$PROJECT_DIR"
    cd "$PROJECT_DIR"
else
    print_status "Project directory already exists: $PROJECT_DIR"
    cd "$PROJECT_DIR"
fi

# Install project dependencies
print_status "Installing project dependencies..."
npm install

# Create environment file from sample
if [ ! -f ".env" ]; then
    print_status "Creating environment configuration..."
    cp .env.sample .env
    
    # Set local database URL
    sed -i 's|DATABASE_URL=.*|DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_agent_platform|' .env
    
    print_warning "Please update .env file with your API keys:"
    print_warning "  - OPENAI_API_KEY"
    print_warning "  - AWS credentials (if using AWS services)"
    print_warning "  - Other service API keys as needed"
fi

# Set up database schema
print_status "Setting up database schema..."
npm run db:push

# Create demo data
print_status "Creating demo users and data..."
npm run setup:demo || print_warning "Demo setup failed - continuing anyway"

# Install development tools
print_status "Installing development tools..."
sudo npm install -g typescript tsx nodemon

# Set up git hooks (if .git exists)
if [ -d ".git" ]; then
    print_status "Setting up git hooks..."
    npx husky install || print_warning "Husky setup failed - continuing anyway"
fi

# Create systemd service for production deployment
print_status "Creating systemd service..."
sudo tee /etc/systemd/system/ai-agent-platform.service > /dev/null <<EOF
[Unit]
Description=AI Agent Platform
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable service
sudo systemctl daemon-reload
sudo systemctl enable ai-agent-platform.service

print_success "Systemd service created and enabled"

# Create nginx configuration for reverse proxy
print_status "Installing and configuring Nginx..."
sudo apt install -y nginx

sudo tee /etc/nginx/sites-available/ai-agent-platform > /dev/null <<EOF
server {
    listen 80;
    server_name localhost;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # WebSocket support for real-time features
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/ai-agent-platform /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# Start and enable nginx
sudo systemctl start nginx
sudo systemctl enable nginx

print_success "Nginx configured and started"

# Set up log rotation
print_status "Setting up log rotation..."
sudo tee /etc/logrotate.d/ai-agent-platform > /dev/null <<EOF
$PROJECT_DIR/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
    postrotate
        sudo systemctl reload ai-agent-platform.service > /dev/null 2>&1 || true
    endscript
}
EOF

# Create logs directory
mkdir -p "$PROJECT_DIR/logs"

# Set up firewall (allow HTTP, HTTPS, SSH)
print_status "Configuring firewall..."
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw --force enable

print_success "Firewall configured"

# Final checks and summary
print_status "Running final system checks..."

# Check services
SERVICES=("postgresql" "redis-server" "nginx")
for service in "${SERVICES[@]}"; do
    if sudo systemctl is-active --quiet "$service"; then
        print_success "$service is running"
    else
        print_error "$service is not running"
    fi
done

# Check Node.js and npm
if command -v node &> /dev/null && command -v npm &> /dev/null; then
    print_success "Node.js and npm are properly installed"
else
    print_error "Node.js or npm installation failed"
fi

# Check database connection
if pg_isready -h localhost -p 5432 &> /dev/null; then
    print_success "PostgreSQL is accepting connections"
else
    print_error "PostgreSQL connection failed"
fi

echo ""
echo "=================================="
print_success "Setup completed successfully!"
echo "=================================="
echo ""
echo "🔧 Manual steps required:"
echo "1. Update .env file with your API keys"
echo "2. Run 'npm run dev' to start development server"
echo "3. Access the application at http://localhost:3000"
echo ""
echo "🚀 Production deployment:"
echo "1. Update .env for production settings"
echo "2. Run 'sudo systemctl start ai-agent-platform.service'"
echo "3. Access the application at http://your-domain"
echo ""
echo "📁 Project location: $PROJECT_DIR"
echo "📊 View logs: journalctl -u ai-agent-platform.service -f"
echo "🔄 Restart service: sudo systemctl restart ai-agent-platform.service"
echo ""
print_warning "Remember to:"
print_warning "- Configure your API keys in .env"
print_warning "- Set up SSL certificates for production"
print_warning "- Configure your domain/DNS settings"
print_warning "- Review security settings before going live"