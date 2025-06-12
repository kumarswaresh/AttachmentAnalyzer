#!/bin/bash

# AI Agent Platform Deployment Script for AWS EC2
# This script deploys the application to a production AWS environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/opt/ai-agent"
APP_USER="aiagent"
REPO_URL="https://github.com/your-username/ai-agent-platform.git"  # Update with your repo
BRANCH="main"
NODE_ENV="production"
AWS_REGION="us-east-1"

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

# Function to check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_error "This script should not be run as root"
        exit 1
    fi
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18 or higher is required"
        exit 1
    fi
    
    # Check if PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        print_error "PM2 is not installed"
        exit 1
    fi
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to fetch environment variables from AWS Parameter Store
fetch_env_vars() {
    print_status "Fetching environment variables from AWS Parameter Store..."
    
    # Create .env file
    cat > "$APP_DIR/.env" << EOF
NODE_ENV=production
AWS_REGION=$AWS_REGION
PORT=5000
EOF

    # Fetch parameters from AWS Parameter Store
    PARAMETERS=(
        "DATABASE_URL"
        "OPENAI_API_KEY"
        "ANTHROPIC_API_KEY"
        "SESSION_SECRET"
    )
    
    for param in "${PARAMETERS[@]}"; do
        print_status "Fetching $param..."
        VALUE=$(aws ssm get-parameter --name "/ai-agent/production/$param" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "")
        if [ -n "$VALUE" ]; then
            echo "$param=$VALUE" >> "$APP_DIR/.env"
            print_success "Retrieved $param"
        else
            print_warning "Could not retrieve $param from Parameter Store"
        fi
    done
    
    # Set proper permissions
    chmod 600 "$APP_DIR/.env"
}

# Function to clone or update the repository
update_code() {
    print_status "Updating application code..."
    
    if [ -d "$APP_DIR/.git" ]; then
        print_status "Updating existing repository..."
        cd "$APP_DIR"
        git fetch origin
        git reset --hard origin/$BRANCH
        git clean -fd
    else
        print_status "Cloning repository..."
        rm -rf "$APP_DIR"
        git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
        cd "$APP_DIR"
    fi
    
    print_success "Code updated successfully"
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    cd "$APP_DIR"
    
    # Clean install
    rm -rf node_modules package-lock.json
    npm ci --production
    
    print_success "Dependencies installed"
}

# Function to run database migrations
run_migrations() {
    print_status "Running database migrations..."
    cd "$APP_DIR"
    
    # Source environment variables
    export $(cat .env | grep -v '^#' | xargs)
    
    # Run migrations using Drizzle
    npm run db:push
    
    print_success "Database migrations completed"
}

# Function to build the application
build_application() {
    print_status "Building application..."
    cd "$APP_DIR"
    
    # Build frontend and backend
    npm run build
    
    print_success "Application built successfully"
}

# Function to configure PM2
configure_pm2() {
    print_status "Configuring PM2..."
    
    cat > "$APP_DIR/ecosystem.config.js" << 'EOF'
module.exports = {
  apps: [{
    name: 'ai-agent-platform',
    script: 'server/index.ts',
    interpreter: 'node',
    interpreter_args: '--loader tsx',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/var/log/ai-agent/error.log',
    out_file: '/var/log/ai-agent/out.log',
    log_file: '/var/log/ai-agent/combined.log',
    time: true,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    watch: false,
    ignore_watch: ['node_modules', 'logs', '.git'],
    source_map_support: true,
    instance_var: 'INSTANCE_ID',
    kill_timeout: 5000
  }]
};
EOF
    
    print_success "PM2 configuration created"
}

# Function to configure Nginx
configure_nginx() {
    print_status "Configuring Nginx..."
    
    sudo tee /etc/nginx/sites-available/ai-agent > /dev/null << 'EOF'
# AI Agent Platform Nginx Configuration

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

# Upstream backend
upstream ai_agent_backend {
    least_conn;
    server 127.0.0.1:5000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name _;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # Hide server information
    server_tokens off;

    # Request size limits
    client_max_body_size 10M;
    client_body_buffer_size 128k;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 4k;

    # Timeout settings
    client_body_timeout 12;
    client_header_timeout 12;
    keepalive_timeout 15;
    send_timeout 10;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # API routes with rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://ai_agent_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        proxy_send_timeout 300s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }

    # Login endpoints with stricter rate limiting
    location ~ ^/api/(login|auth)/ {
        limit_req zone=login burst=5 nodelay;
        
        proxy_pass http://ai_agent_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check endpoint (no rate limiting)
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Static files with aggressive caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary "Accept-Encoding";
        
        # Try static files first, then backend
        try_files $uri @backend;
    }

    # Main application
    location / {
        proxy_pass http://ai_agent_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Fallback to backend for any unmatched static files
    location @backend {
        proxy_pass http://ai_agent_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Block access to sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    location ~ /(package\.json|package-lock\.json|\.env.*|ecosystem\.config\.js)$ {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

    # Test nginx configuration
    sudo nginx -t
    
    print_success "Nginx configuration updated"
}

# Function to start application
start_application() {
    print_status "Starting application..."
    cd "$APP_DIR"
    
    # Stop existing PM2 processes
    pm2 delete all || true
    
    # Start the application
    pm2 start ecosystem.config.js --env production
    
    # Save PM2 configuration
    pm2 save
    pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER" || true
    
    print_success "Application started successfully"
}

# Function to restart services
restart_services() {
    print_status "Restarting services..."
    
    # Restart Nginx
    sudo systemctl restart nginx
    
    # Restart application
    pm2 restart all
    
    print_success "Services restarted"
}

# Function to run health checks
health_check() {
    print_status "Running health checks..."
    
    # Wait for application to start
    sleep 10
    
    # Check if PM2 processes are running
    if pm2 list | grep -q "online"; then
        print_success "PM2 processes are running"
    else
        print_error "PM2 processes are not running"
        exit 1
    fi
    
    # Check if Nginx is running
    if sudo systemctl is-active --quiet nginx; then
        print_success "Nginx is running"
    else
        print_error "Nginx is not running"
        exit 1
    fi
    
    # Check application endpoint
    if curl -f -s http://localhost/health > /dev/null; then
        print_success "Application health check passed"
    else
        print_error "Application health check failed"
        exit 1
    fi
    
    print_success "All health checks passed"
}

# Function to setup SSL (optional)
setup_ssl() {
    if [ -n "$DOMAIN_NAME" ]; then
        print_status "Setting up SSL certificate for $DOMAIN_NAME..."
        
        # Install certbot
        sudo apt-get update
        sudo apt-get install -y certbot python3-certbot-nginx
        
        # Get certificate
        sudo certbot --nginx -d "$DOMAIN_NAME" --non-interactive --agree-tos --email "$ADMIN_EMAIL"
        
        # Setup auto-renewal
        (sudo crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | sudo crontab -
        
        print_success "SSL certificate configured"
    else
        print_warning "No domain name provided, skipping SSL setup"
    fi
}

# Function to setup monitoring
setup_monitoring() {
    print_status "Setting up monitoring..."
    
    # Setup log rotation
    sudo tee /etc/logrotate.d/ai-agent > /dev/null << 'EOF'
/var/log/ai-agent/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 aiagent aiagent
    sharedscripts
    postrotate
        pm2 reload all
    endscript
}
EOF
    
    # Setup PM2 monitoring
    pm2 install pm2-logrotate
    pm2 set pm2-logrotate:max_size 100M
    pm2 set pm2-logrotate:retain 30
    pm2 set pm2-logrotate:compress true
    
    print_success "Monitoring configured"
}

# Function to cleanup
cleanup() {
    print_status "Cleaning up..."
    
    # Remove old log files
    find /var/log/ai-agent -type f -name "*.log" -mtime +30 -delete
    
    # Clean npm cache
    npm cache clean --force
    
    # Clean PM2 logs
    pm2 flush
    
    print_success "Cleanup completed"
}

# Main deployment function
main() {
    print_status "Starting AI Agent Platform deployment..."
    
    check_root
    check_prerequisites
    fetch_env_vars
    update_code
    install_dependencies
    run_migrations
    build_application
    configure_pm2
    configure_nginx
    start_application
    restart_services
    setup_monitoring
    health_check
    setup_ssl
    cleanup
    
    print_success "Deployment completed successfully!"
    print_status "Application is running at:"
    print_status "  Local: http://localhost"
    if [ -n "$DOMAIN_NAME" ]; then
        print_status "  Domain: https://$DOMAIN_NAME"
    fi
    print_status ""
    print_status "Useful commands:"
    print_status "  View logs: pm2 logs"
    print_status "  Restart app: pm2 restart all"
    print_status "  Check status: pm2 status"
    print_status "  Monitor: pm2 monit"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --domain)
            DOMAIN_NAME="$2"
            shift 2
            ;;
        --email)
            ADMIN_EMAIL="$2"
            shift 2
            ;;
        --repo)
            REPO_URL="$2"
            shift 2
            ;;
        --branch)
            BRANCH="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --domain DOMAIN    Domain name for SSL certificate"
            echo "  --email EMAIL      Admin email for SSL certificate"
            echo "  --repo URL         Git repository URL"
            echo "  --branch BRANCH    Git branch to deploy (default: main)"
            echo "  --help             Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main