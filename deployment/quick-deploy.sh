#!/bin/bash

set -e

echo "=== Quick Deployment Setup ==="

# Get server IP
SERVER_IP=$(curl -s ifconfig.me || echo "localhost")
echo "Server IP: $SERVER_IP"

# Build backend
echo "Building backend..."
npx tsc --outDir dist server/index.ts

# Create minimal frontend build
echo "Creating minimal frontend..."
mkdir -p dist/public
cp client/index.html dist/public/
cp -r client/src dist/public/

# Create simple Nginx config
echo "Setting up Nginx..."
sudo tee /etc/nginx/sites-available/agent-platform > /dev/null <<EOF
server {
    listen 80;
    server_name $SERVER_IP _;
    
    # Frontend static files
    location / {
        root /home/ubuntu/agent-platform/dist/public;
        try_files \$uri \$uri/ /index.html;
        index index.html;
    }
    
    # API proxy
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
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/agent-platform /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

echo "=== Deployment Complete ==="
echo "Backend: http://$SERVER_IP:5000"
echo "Frontend: http://$SERVER_IP"
echo ""
echo "To start the application:"
echo "  node dist/index.js"