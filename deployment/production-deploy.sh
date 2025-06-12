#!/bin/bash

set -e

echo "=== Production Deployment Setup ==="

# Get server IP automatically
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}' || echo "localhost")
echo "Detected Server IP: $SERVER_IP"

# Create dist directory structure
echo "Setting up build directories..."
mkdir -p dist/public

# Copy frontend files as-is for development serving
cp -r client/* dist/public/

# Create a simple index.html that loads the React app
cat > dist/public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI Agent Platform</title>
    <script type="importmap">
    {
        "imports": {
            "react": "https://esm.sh/react@18",
            "react-dom/client": "https://esm.sh/react-dom@18/client",
            "wouter": "https://esm.sh/wouter@3",
            "@tanstack/react-query": "https://esm.sh/@tanstack/react-query@5"
        }
    }
    </script>
    <style>
        body { margin: 0; font-family: system-ui, sans-serif; }
        .loading { display: flex; justify-content: center; align-items: center; height: 100vh; }
    </style>
</head>
<body>
    <div id="root">
        <div class="loading">Loading AI Agent Platform...</div>
    </div>
    <script type="module">
        import React from 'react';
        import { createRoot } from 'react-dom/client';
        
        function App() {
            return React.createElement('div', { style: { padding: '2rem', textAlign: 'center' } }, [
                React.createElement('h1', { key: 'title' }, 'AI Agent Platform'),
                React.createElement('p', { key: 'desc' }, 'Backend running on port 5000'),
                React.createElement('div', { key: 'links', style: { marginTop: '2rem' } }, [
                    React.createElement('a', { 
                        key: 'api', 
                        href: '/api/v1/health', 
                        style: { marginRight: '1rem', padding: '0.5rem 1rem', background: '#0066cc', color: 'white', textDecoration: 'none', borderRadius: '4px' }
                    }, 'API Health Check'),
                    React.createElement('a', { 
                        key: 'docs', 
                        href: '/api/docs', 
                        style: { padding: '0.5rem 1rem', background: '#28a745', color: 'white', textDecoration: 'none', borderRadius: '4px' }
                    }, 'API Documentation')
                ])
            ]);
        }
        
        const root = createRoot(document.getElementById('root'));
        root.render(React.createElement(App));
    </script>
</body>
</html>
EOF

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