#!/bin/bash

# Quick fix for production server - builds and configures Nginx properly
set -e

echo "=== Quick Production Fix ==="

# Build the frontend if not already built
if [ ! -d "dist/public" ] || [ ! -f "dist/public/index.html" ]; then
    echo "Building frontend..."
    npm run build
fi

# Get current directory
CURRENT_DIR=$(pwd)
echo "Serving from: $CURRENT_DIR/dist/public"

# Create proper Nginx configuration
sudo tee /etc/nginx/sites-available/agent-platform > /dev/null << EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root $CURRENT_DIR/dist/public;
    index index.html;

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
    }

    # Frontend routes - serve static files
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Remove default site and enable ours
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/agent-platform /etc/nginx/sites-enabled/

# Test and restart Nginx
sudo nginx -t && sudo systemctl restart nginx

echo "Fixed! Now serving built files from dist/public"
echo "Test with: curl http://localhost"