#!/bin/bash

# Quick Production Deployment Script
# Streamlined for fast deployment with proper build handling

set -e

echo "🚀 Quick production deployment starting..."

# Configuration
APP_NAME="agent-platform"
APP_DIR="/home/ubuntu/AttachmentAnalyzer"
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
DOMAIN="${DOMAIN:-localhost}"
PORT="${PORT:-5000}"

# Set production environment
export NODE_ENV=production

echo "📦 Installing production dependencies..."
cd "$APP_DIR"
npm install --production

echo "🏗️  Building application..."
# Quick build without dependency reinstall
npm run build

# Handle build output location flexibility
BUILD_DIR=""
if [ -d "dist/public" ] && [ -f "dist/public/index.html" ]; then
    BUILD_DIR="dist/public"
    echo "✅ Found build in dist/public"
elif [ -d "client/dist" ] && [ -f "client/dist/index.html" ]; then
    BUILD_DIR="client/dist"
    echo "✅ Found build in client/dist"
else
    # Create client/dist and copy from any found location
    mkdir -p client/dist
    if [ -d "dist/public" ]; then
        cp -r dist/public/* client/dist/
        BUILD_DIR="client/dist"
        echo "✅ Copied build to client/dist from dist/public"
    elif [ -f "dist/index.html" ]; then
        cp -r dist/* client/dist/
        BUILD_DIR="client/dist"
        echo "✅ Copied build to client/dist from dist"
    else
        echo "❌ No build output found"
        exit 1
    fi
fi

echo "🔧 Configuring PM2..."

# Create PM2 ecosystem config
cat > ecosystem.config.cjs << EOF
module.exports = {
  apps: [
    {
      name: '$APP_NAME',
      script: 'server/index.ts',
      interpreter: 'tsx',
      cwd: '$APP_DIR',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: $PORT,
        HOST: '0.0.0.0'
      },
      log_file: '$APP_DIR/logs/combined.log',
      out_file: '$APP_DIR/logs/out.log',
      error_file: '$APP_DIR/logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      max_restarts: 5,
      min_uptime: '10s'
    }
  ]
};
EOF

# Create logs directory
mkdir -p logs

# Stop existing PM2 processes
pm2 stop $APP_NAME 2>/dev/null || true
pm2 delete $APP_NAME 2>/dev/null || true

echo "🚀 Starting application with PM2..."
pm2 start ecosystem.config.cjs --env production
pm2 save

echo "🌐 Configuring Nginx..."

# Create Nginx configuration
sudo tee "$NGINX_SITES_AVAILABLE/$APP_NAME" > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
    
    # Serve static frontend files
    location / {
        root $APP_DIR/$BUILD_DIR;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public";
        }
    }
    
    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Health check
    location /health {
        proxy_pass http://127.0.0.1:$PORT;
        access_log off;
    }
}
EOF

# Enable the site
sudo ln -sf "$NGINX_SITES_AVAILABLE/$APP_NAME" "$NGINX_SITES_ENABLED/"
sudo rm -f "$NGINX_SITES_ENABLED/default"

# Test and reload nginx
if sudo nginx -t; then
    echo "✅ Nginx configuration valid"
    sudo systemctl reload nginx
else
    echo "❌ Nginx configuration error"
    exit 1
fi

echo "🔍 Running health checks..."

# Wait for application to start
sleep 5

# Check services
echo "PM2 Status:"
pm2 status

# Test endpoints
if curl -f http://localhost:$PORT/health &>/dev/null; then
    echo "✅ Backend responding on port $PORT"
else
    echo "⚠️ Backend health check failed"
    echo "Last 5 log lines:"
    pm2 logs $APP_NAME --lines 5 --nostream
fi

if curl -f http://localhost/ &>/dev/null; then
    echo "✅ Frontend accessible via Nginx"
else
    echo "⚠️ Frontend check failed"
    echo "Build directory: $BUILD_DIR"
    echo "Build contents:"
    ls -la "$APP_DIR/$BUILD_DIR" | head -5
fi

echo ""
echo "🎉 Quick deployment completed!"
echo ""
echo "📋 Access Information:"
echo "   Frontend: http://$DOMAIN"
echo "   API: http://$DOMAIN/api"
echo "   Build: $BUILD_DIR"
echo ""
echo "🔧 Commands:"
echo "   Logs: pm2 logs $APP_NAME"
echo "   Restart: pm2 restart $APP_NAME"
echo "   SSL: bash deployment/ssl-setup.sh $DOMAIN"