#!/bin/bash

set -e

APP_NAME="agent-platform"
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo 'localhost')

echo "Setting up Nginx for Agent Platform"
echo "====================================="
echo "Server IP: $SERVER_IP"

# Install Nginx if not present
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    sudo apt update
    sudo apt install -y nginx
fi

# Stop Nginx for configuration
sudo systemctl stop nginx 2>/dev/null || true

# Create Nginx configuration
echo "Creating Nginx configuration..."
sudo tee /etc/nginx/sites-available/$APP_NAME > /dev/null << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /home/ubuntu/AttachmentAnalyzer/dist/public;
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

    # Try files first, then proxy to backend if not found
    location / {
        try_files $uri $uri/ @backend;
    }

    # API routes - proxy to backend
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_redirect off;
        
        # Extended timeouts for API calls
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        access_log off;
    }

    # Backend fallback for SPA routing
    location @backend {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_redirect off;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files optimization
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri @backend;
    }

    # Block common attack vectors
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    location ~ ~$ {
        deny all;
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
    
    # Check status
    echo "Nginx Status:"
    sudo systemctl status nginx --no-pager -l
    
    echo ""
    echo "Nginx setup complete!"
    echo ""
    echo "Configuration Summary:"
    echo "- Static files served from: /home/ubuntu/AttachmentAnalyzer/dist/public"
    echo "- API routes proxied to: http://127.0.0.1:5000"
    echo "- Application accessible at: http://$SERVER_IP"
    echo ""
    
    # Test static file serving
    if [ -f "/home/ubuntu/AttachmentAnalyzer/dist/public/index.html" ]; then
        echo "Static files found - Nginx can serve frontend directly"
    else
        echo "Note: Build frontend first with 'npm run build'"
    fi
    
    # Test backend proxy (if backend is running)
    echo "Testing backend connectivity..."
    if curl -f -s http://localhost:5000/health >/dev/null 2>&1; then
        echo "Backend is responding - full stack ready"
    else
        echo "Backend not responding on port 5000"
        echo "Start your application separately (without PM2)"
    fi
    
else
    echo "Nginx configuration test failed"
    exit 1
fi
EOF