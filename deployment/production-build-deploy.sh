#!/bin/bash

set -e

echo "=== AI Agent Platform - Production Build & Deploy ==="

# Get current directory and server IP
CURRENT_DIR=$(pwd)
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}' || echo "localhost")
APP_NAME="agent-platform"

echo "Directory: $CURRENT_DIR"
echo "Server IP: $SERVER_IP"

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install dependencies
echo "Installing dependencies..."
npm install --production=false

# Build frontend for production
echo "Building frontend for production..."
npm run build

# Verify build output
if [ ! -d "dist/public" ]; then
    echo "Error: Build failed - dist/public directory not found"
    exit 1
fi

if [ ! -f "dist/public/index.html" ]; then
    echo "Error: Build failed - index.html not found in dist/public"
    exit 1
fi

echo "Build successful - $(du -sh dist/public | cut -f1) of static files"

# Install and configure Nginx
echo "Installing Nginx..."
sudo apt update -qq
sudo apt install -y nginx

# Stop Nginx for configuration
sudo systemctl stop nginx 2>/dev/null || true

# Create Nginx configuration
echo "Creating Nginx configuration..."
sudo tee /etc/nginx/sites-available/$APP_NAME > /dev/null << EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root $CURRENT_DIR/dist/public;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # API routes - proxy to backend
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_redirect off;
        
        # Extended timeouts for API calls
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:5000/api/v1/marketing/health;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        access_log off;
    }

    # Frontend routes - serve static files
    location / {
        try_files \$uri \$uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, immutable";
    }

    # Static assets with longer cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
        log_not_found off;
    }
}
EOF

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Enable our site
sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/

# Test Nginx configuration
echo "Testing Nginx configuration..."
if sudo nginx -t; then
    echo "Nginx configuration is valid"
    
    # Start and enable Nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
    
    echo ""
    echo "=== Deployment Complete! ==="
    echo ""
    echo "Configuration Summary:"
    echo "- Static files served from: $CURRENT_DIR/dist/public"
    echo "- API routes proxied to: http://127.0.0.1:5000"
    echo "- Application accessible at: http://$SERVER_IP"
    echo ""
    
    # Test static file serving
    if [ -f "$CURRENT_DIR/dist/public/index.html" ]; then
        echo "Static files ready - $(wc -c < "$CURRENT_DIR/dist/public/index.html") bytes index.html"
    fi
    
    # Test backend connectivity
    echo "Testing backend connectivity..."
    if curl -f -s http://localhost:5000/api/v1/marketing/health >/dev/null 2>&1; then
        echo "Backend is responding - full stack ready"
    else
        echo "Note: Start backend with 'npm run dev' for full functionality"
    fi
    
else
    echo "Nginx configuration test failed"
    exit 1
fi