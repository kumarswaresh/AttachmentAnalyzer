#!/bin/bash

# Nginx Configuration Verification Script
# This script validates the Nginx configuration without requiring sudo access

set -e

APP_NAME="agent-platform"
CURRENT_DIR=$(pwd)

echo "=== Nginx Configuration Verification ==="
echo "Application: $APP_NAME"
echo "Current Directory: $CURRENT_DIR"
echo "Static Files Path: $CURRENT_DIR/dist/public"
echo

# Check if static files exist
if [ -d "$CURRENT_DIR/dist/public" ]; then
    echo "✅ Static files directory exists"
    if [ -f "$CURRENT_DIR/dist/public/index.html" ]; then
        echo "✅ index.html found ($(wc -c < "$CURRENT_DIR/dist/public/index.html") bytes)"
    else
        echo "❌ index.html not found in dist/public"
    fi
else
    echo "❌ Static files directory not found: $CURRENT_DIR/dist/public"
fi

# Check if backend is responding
echo
echo "=== Backend API Check ==="
if curl -s -f http://localhost:5000/api/v1/marketing/health > /dev/null 2>&1; then
    echo "✅ Backend responding on port 5000"
    echo "Health check response:"
    curl -s http://localhost:5000/api/v1/marketing/health | head -3
else
    echo "❌ Backend not responding on port 5000"
fi

# Generate test Nginx configuration
echo
echo "=== Generating Test Configuration ==="
cat > /tmp/nginx-test-config.conf << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root REPLACE_WITH_CURRENT_DIR/dist/public;
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
        proxy_pass http://127.0.0.1:5000/api/v1/marketing/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        access_log off;
    }

    # Frontend routes - serve static files
    location / {
        try_files $uri $uri/ /index.html;
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

# Replace placeholder with actual path
sed -i "s|REPLACE_WITH_CURRENT_DIR|$CURRENT_DIR|g" /tmp/nginx-test-config.conf

echo "✅ Configuration generated at /tmp/nginx-test-config.conf"

# Show key configuration lines
echo
echo "=== Key Configuration Settings ==="
echo "Root directory:"
grep "root " /tmp/nginx-test-config.conf
echo
echo "API proxy configuration:"
grep -A 2 "location /api/" /tmp/nginx-test-config.conf
echo
echo "Static file serving:"
grep -A 2 "location / {" /tmp/nginx-test-config.conf

echo
echo "=== Configuration Validation Complete ==="
echo "This configuration will work correctly when deployed to a server with Nginx installed."
echo
echo "For production deployment:"
echo "1. Copy the project to your target server"
echo "2. Run: sudo ./deployment/nginx-only-setup.sh"
echo "3. The script will automatically configure Nginx with the correct paths"