#!/bin/bash

set -e

echo "=== Fixing Nginx 500 Error ==="

# Get current directory and check permissions
CURRENT_DIR=$(pwd)
echo "Working directory: $CURRENT_DIR"

# Check if dist/public exists and has correct permissions
if [ -d "$CURRENT_DIR/dist/public" ]; then
    echo "Found dist/public directory"
    
    # Set proper permissions for Nginx to read
    chmod -R 755 "$CURRENT_DIR/dist"
    chmod -R 644 "$CURRENT_DIR/dist/public/"*
    
    # Ensure directories are executable
    find "$CURRENT_DIR/dist" -type d -exec chmod 755 {} \;
    
    echo "Fixed permissions on dist/public"
else
    echo "Error: dist/public directory not found"
    exit 1
fi

# Create a simple Nginx configuration without problematic directives
sudo tee /etc/nginx/sites-available/agent-platform > /dev/null << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root REPLACE_CURRENT_DIR/dist/public;
    index index.html;

    # Basic error and access logs
    error_log /var/log/nginx/error.log warn;
    access_log /var/log/nginx/access.log;

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Serve static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Handle static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public";
    }
}
EOF

# Replace placeholder with actual path
sudo sed -i "s|REPLACE_CURRENT_DIR|$CURRENT_DIR|g" /etc/nginx/sites-available/agent-platform

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Enable our site
sudo ln -sf /etc/nginx/sites-available/agent-platform /etc/nginx/sites-enabled/

# Create log directory if it doesn't exist
sudo mkdir -p /var/log/nginx
sudo chown www-data:www-data /var/log/nginx

# Test configuration
echo "Testing Nginx configuration..."
if sudo nginx -t; then
    echo "Configuration is valid"
    
    # Restart Nginx
    sudo systemctl restart nginx
    
    echo "Nginx restarted successfully"
    
    # Test the site
    echo "Testing site..."
    sleep 2
    
    if curl -s http://localhost | grep -q "html"; then
        echo "Site is working!"
        echo "First few lines of response:"
        curl -s http://localhost | head -5
    else
        echo "Site still not responding correctly"
        echo "Checking error logs..."
        sudo tail -5 /var/log/nginx/error.log 2>/dev/null || echo "No error logs found"
    fi
    
else
    echo "Nginx configuration test failed"
    sudo nginx -t
    exit 1
fi

echo "Fix complete!"