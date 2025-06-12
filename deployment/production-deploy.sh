#!/bin/bash

set -e

echo "=== Production Deployment Setup ==="

# Get server IP automatically
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}' || echo "localhost")
echo "Detected Server IP: $SERVER_IP"

# Verify build directory structure exists
echo "Verifying build directories..."
if [ ! -d "dist/public" ]; then
    echo "Error: dist/public directory not found. Please run 'npm run build' first."
    exit 1
fi

# Verify index.html exists from build
if [ ! -f "dist/public/index.html" ]; then
    echo "Error: Built index.html not found in dist/public/. Please run 'npm run build' first."
    exit 1
fi

echo "Using existing built static files from dist/public/"

# Install and configure Nginx
echo "Installing and configuring Nginx..."
sudo apt update -qq
sudo apt install -y nginx

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/agent-platform > /dev/null << EOF
server {
    listen 80;
    server_name $SERVER_IP _;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # Frontend static files
    location / {
        root $PWD/dist/public;
        try_files \$uri \$uri/ /index.html;
        index index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API proxy to backend
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
    
    # WebSocket support for development
    location /ws {
        proxy_pass http://localhost:5000;
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
sudo ln -sf /etc/nginx/sites-available/agent-platform /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx

echo "=== Deployment Complete ==="
echo ""
echo "✅ Backend API: http://$SERVER_IP:5000"
echo "✅ Full Application: http://$SERVER_IP"
echo "✅ API Documentation: http://$SERVER_IP/api/docs"
echo "✅ Health Check: http://$SERVER_IP/api/v1/health"
echo ""
echo "Your AI Agent Platform is now accessible at: http://$SERVER_IP"
echo ""
echo "Note: Backend is running on port 5000, Nginx proxies requests on port 80"