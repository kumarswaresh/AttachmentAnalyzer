#!/bin/bash

set -e

CURRENT_DIR=$(pwd)
echo "Testing Nginx setup with correct paths"
echo "====================================="
echo "Working directory: $CURRENT_DIR"
echo "Static files path: $CURRENT_DIR/dist/public"

# Check if dist/public exists
if [ -d "$CURRENT_DIR/dist/public" ]; then
    echo "✅ Static files directory exists"
    
    # List contents
    echo "Contents of dist/public:"
    ls -la "$CURRENT_DIR/dist/public/"
    
    # Check for index.html
    if [ -f "$CURRENT_DIR/dist/public/index.html" ]; then
        echo "✅ index.html found"
        echo "File size: $(stat -c%s "$CURRENT_DIR/dist/public/index.html") bytes"
    else
        echo "❌ index.html not found"
    fi
else
    echo "❌ dist/public directory not found"
    echo "Creating directory structure..."
    mkdir -p "$CURRENT_DIR/dist/public"
fi

# Test Nginx configuration template
echo ""
echo "Testing Nginx configuration template..."

cat > /tmp/nginx-test.conf << EOF
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

    # Try files first, then proxy to backend if not found
    location / {
        try_files \$uri \$uri/ @backend;
    }

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
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        access_log off;
    }

    # Backend fallback for SPA routing
    location @backend {
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
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files optimization
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri @backend;
    }

    # Block common attack vectors
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    location ~ ~\$ {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

echo "✅ Generated Nginx configuration template"
echo "Configuration root path: $CURRENT_DIR/dist/public"

# Test backend connectivity
echo ""
echo "Testing backend connectivity..."
if curl -f -s http://localhost:5000/api/v1/health >/dev/null 2>&1; then
    echo "✅ Backend is responding on port 5000"
    
    # Test API endpoints
    echo "Testing API endpoints:"
    
    if curl -f -s http://localhost:5000/api/v1/marketing/health >/dev/null 2>&1; then
        echo "✅ Marketing API responding"
    else
        echo "⚠️  Marketing API not responding"
    fi
    
    if curl -f -s http://localhost:5000/api/docs >/dev/null 2>&1; then
        echo "✅ API documentation accessible"
    else
        echo "⚠️  API documentation not accessible"
    fi
else
    echo "❌ Backend not responding on port 5000"
    echo "Make sure the application is running with 'npm run dev'"
fi

echo ""
echo "=== Nginx Setup Summary ==="
echo "✅ Nginx configuration template ready"
echo "✅ Static files path: $CURRENT_DIR/dist/public"
echo "✅ Backend proxy: http://127.0.0.1:5000"
echo "✅ Configuration file: /tmp/nginx-test.conf"
echo ""
echo "To deploy on a server with Nginx:"
echo "1. Run: sudo cp /tmp/nginx-test.conf /etc/nginx/sites-available/agent-platform"
echo "2. Run: sudo ln -sf /etc/nginx/sites-available/agent-platform /etc/nginx/sites-enabled/"
echo "3. Run: sudo nginx -t && sudo systemctl reload nginx"