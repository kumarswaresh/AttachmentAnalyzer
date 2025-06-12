#!/bin/bash

set -e

APP_NAME="agent-platform"
APP_DIR="/home/ubuntu/AttachmentAnalyzer"
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo 'localhost')

echo "🚀 Complete Agent Platform Deployment with Nginx"
echo "================================================"
echo "App: $APP_NAME"
echo "Directory: $APP_DIR"
echo "Server IP: $SERVER_IP"
echo ""

# Ensure we're in the right directory
cd "$APP_DIR"

# 1. Build the application
echo "Building application..."
npm run build || {
    echo "Build failed, trying components separately..."
    npx vite build --config vite.config.frontend.ts
    npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
}

# 2. Verify build output
if [ -d "dist/public" ] && [ -f "dist/index.js" ]; then
    echo "✅ Build successful"
else
    echo "❌ Build verification failed"
    exit 1
fi

# 3. Setup PM2 configuration
cat > ecosystem.production.cjs << EOF
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: 'dist/index.js',
    cwd: '$APP_DIR',
    instances: 2,
    exec_mode: 'cluster',
    env_file: '.env.production',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    autorestart: true,
    max_restarts: 5,
    min_uptime: '10s',
    max_memory_restart: '500M',
    watch: false,
    merge_logs: true
  }]
};
EOF

# 4. Create logs directory
mkdir -p logs

# 5. Start PM2
echo "Starting PM2..."
pm2 delete "$APP_NAME" 2>/dev/null || true
pm2 start ecosystem.production.cjs

# 6. Wait for PM2 to stabilize
sleep 10
PM2_STATUS=$(pm2 jlist | jq -r '.[0].pm2_env.status' 2>/dev/null || echo "unknown")

if [ "$PM2_STATUS" != "online" ]; then
    echo "❌ PM2 failed to start"
    pm2 logs "$APP_NAME" --lines 20
    exit 1
fi

echo "✅ PM2 is running"

# 7. Test backend directly
echo "Testing backend..."
if curl -f -s http://localhost:5000/health >/dev/null 2>&1; then
    echo "✅ Backend responding on port 5000"
elif curl -f -s http://localhost:5000/api/v1/health >/dev/null 2>&1; then
    echo "✅ Backend API responding on port 5000"
else
    echo "⚠️  Backend not responding - continuing with Nginx setup"
fi

# 8. Setup Nginx
echo "Setting up Nginx..."

# Install Nginx if needed
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    sudo apt update
    sudo apt install -y nginx
fi

# Stop Nginx for configuration
sudo systemctl stop nginx 2>/dev/null || true

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/$APP_NAME > /dev/null << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $SERVER_IP _;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Main location - proxy to Node.js app
    location / {
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

    # API routes with longer timeouts
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
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
}
EOF

# Remove default site and enable ours
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/

# Test and start Nginx
echo "Testing Nginx configuration..."
if sudo nginx -t; then
    echo "✅ Nginx configuration valid"
    sudo systemctl start nginx
    sudo systemctl enable nginx
    sleep 3
    
    # Test the full stack
    if curl -f -s http://localhost/health >/dev/null 2>&1; then
        echo "✅ Full stack working: PM2 + Nginx"
        echo ""
        echo "🎉 DEPLOYMENT SUCCESSFUL!"
        echo "========================================"
        echo "Your application is now accessible at:"
        echo "  http://$SERVER_IP"
        echo ""
        echo "API endpoints:"
        echo "  http://$SERVER_IP/api/v1/health"
        echo "  http://$SERVER_IP/api/v1/agents"
        echo ""
        echo "Direct backend (for testing):"
        echo "  http://$SERVER_IP:5000"
        echo ""
        pm2 save
        echo "PM2 configuration saved"
        
    else
        echo "⚠️  Nginx proxy test failed"
        echo "Checking backend status..."
        curl -I http://localhost:5000/health 2>/dev/null || echo "Backend not responding"
        
        echo ""
        echo "Nginx is running but proxy may need adjustment"
        echo "Check logs: sudo tail -f /var/log/nginx/error.log"
    fi
else
    echo "❌ Nginx configuration test failed"
    exit 1
fi

echo ""
echo "Setup complete. Check PM2 status: pm2 list"
echo "Check Nginx status: sudo systemctl status nginx"