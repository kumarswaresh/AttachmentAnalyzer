#!/bin/bash

set -e

APP_NAME="agent-platform"
DOMAIN="${1:-$(curl -s ifconfig.me 2>/dev/null || echo 'localhost')}"
APP_PORT="5000"

echo "Setting up Nginx reverse proxy for $APP_NAME..."
echo "Domain/IP: $DOMAIN"
echo "Backend Port: $APP_PORT"

# Install Nginx if not present
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    sudo apt update
    sudo apt install -y nginx
fi

# Stop Nginx to configure
sudo systemctl stop nginx 2>/dev/null || true

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/$APP_NAME > /dev/null << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Main location - proxy to Node.js app
    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
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

    # API routes with longer timeouts
    location /api/ {
        proxy_pass http://127.0.0.1:$APP_PORT;
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

    # Static files optimization
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Cache static files
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_set_header Host \$host;
        access_log off;
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

# Remove default site if it exists
sudo rm -f /etc/nginx/sites-enabled/default

# Enable the site
sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/

# Test Nginx configuration
echo "Testing Nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "Nginx configuration is valid"
    
    # Start and enable Nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
    
    # Check status
    echo "Nginx Status:"
    sudo systemctl status nginx --no-pager -l
    
    echo ""
    echo "✅ Nginx setup complete!"
    echo ""
    echo "Your application should now be accessible at:"
    echo "  http://$DOMAIN"
    echo ""
    echo "Backend health check:"
    echo "  http://$DOMAIN/health"
    echo ""
    echo "API endpoints:"
    echo "  http://$DOMAIN/api/v1/health"
    echo ""
    
    # Test the proxy
    echo "Testing proxy connection..."
    if curl -f -s http://localhost/health >/dev/null 2>&1; then
        echo "✅ Proxy is working correctly"
    else
        echo "⚠️  Proxy test failed - check if your application is running on port $APP_PORT"
        echo "Run: pm2 list"
        echo "Run: curl http://localhost:$APP_PORT/health"
    fi
    
else
    echo "❌ Nginx configuration test failed"
    exit 1
fi