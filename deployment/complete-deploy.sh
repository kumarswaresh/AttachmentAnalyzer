#!/bin/bash

# Complete Production Deployment Script
# Final solution handling all build output scenarios

set -e

echo "🚀 Complete production deployment starting..."

# Configuration
APP_NAME="agent-platform"
APP_DIR="/home/ubuntu/AttachmentAnalyzer"
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
DOMAIN="${DOMAIN:-localhost}"
PORT="${PORT:-5000}"

# Set production environment
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=4096"

echo "📦 Installing dependencies..."
cd "$APP_DIR"
npm ci --only=production

echo "🏗️  Building application..."
# Run build and handle output properly
npm run build 2>&1 | grep -v "chunks are larger than 500 kB" | grep -v "manualChunks" | grep -v "chunkSizeWarningLimit" || true

# Comprehensive build output detection and standardization
BUILD_SOURCE=""
FINAL_BUILD_DIR="$APP_DIR/client/dist"

echo "🔍 Detecting build output location..."

# Check all possible build locations
if [ -d "dist/public" ] && [ -f "dist/public/index.html" ]; then
    BUILD_SOURCE="dist/public"
    echo "✅ Found Vite build in dist/public/"
elif [ -d "client/dist" ] && [ -f "client/dist/index.html" ]; then
    BUILD_SOURCE="client/dist"
    echo "✅ Found build in client/dist/"
elif [ -d "dist" ] && [ -f "dist/index.html" ]; then
    BUILD_SOURCE="dist"
    echo "✅ Found build in dist/"
else
    echo "❌ No valid build output found"
    echo "Available directories:"
    find . -maxdepth 2 -name "dist" -type d 2>/dev/null || true
    find . -maxdepth 2 -name "*.html" -type f 2>/dev/null | head -5 || true
    exit 1
fi

# Create standardized build directory and copy files
mkdir -p "$FINAL_BUILD_DIR"

if [ "$BUILD_SOURCE" != "$FINAL_BUILD_DIR" ]; then
    echo "📋 Copying build files from $BUILD_SOURCE to $FINAL_BUILD_DIR"
    cp -r "$BUILD_SOURCE"/* "$FINAL_BUILD_DIR"/ 2>/dev/null || {
        echo "❌ Failed to copy build files"
        exit 1
    }
fi

# Verify final build
if [ ! -f "$FINAL_BUILD_DIR/index.html" ]; then
    echo "❌ Build verification failed - index.html not found in $FINAL_BUILD_DIR"
    echo "Contents of $FINAL_BUILD_DIR:"
    ls -la "$FINAL_BUILD_DIR" 2>/dev/null || echo "Directory does not exist"
    exit 1
fi

echo "✅ Build completed successfully at $FINAL_BUILD_DIR"

# Show build summary
BUILD_FILES=$(find "$FINAL_BUILD_DIR" -type f | wc -l)
if command -v du >/dev/null 2>&1; then
    BUILD_SIZE=$(du -sh "$FINAL_BUILD_DIR" | cut -f1)
    echo "📊 Build summary: $BUILD_FILES files, $BUILD_SIZE total"
fi

echo "🔧 Configuring PM2..."

# Create optimized PM2 ecosystem config
cat > ecosystem.config.cjs << EOF
module.exports = {
  apps: [
    {
      name: '$APP_NAME',
      script: 'server/index.ts',
      interpreter: 'npx',
      interpreterArgs: 'tsx',
      cwd: '$APP_DIR',
      instances: 'max',
      exec_mode: 'cluster',
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
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 5000,
      listen_timeout: 10000,
      restart_delay: 1000
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

# Create comprehensive Nginx configuration
sudo tee "$NGINX_SITES_AVAILABLE/$APP_NAME" > /dev/null << EOF
# Rate limiting zones
limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=general:10m rate=50r/s;

server {
    listen 80;
    server_name $DOMAIN;
    
    # Hide server tokens
    server_tokens off;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/json
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Rate limiting for general requests
    limit_req zone=general burst=20 nodelay;
    
    # Serve static frontend files
    location / {
        root $FINAL_BUILD_DIR;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets aggressively
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header Vary "Accept-Encoding";
        }
        
        # No cache for HTML files
        location ~* \.html$ {
            expires -1;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }
    }
    
    # API routes with rate limiting
    location /api/ {
        limit_req zone=api burst=10 nodelay;
        
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 5s;
        proxy_send_timeout 60s;
    }
    
    # Health check endpoint (no rate limiting)
    location = /health {
        proxy_pass http://127.0.0.1:$PORT;
        access_log off;
        proxy_read_timeout 5s;
        proxy_connect_timeout 2s;
    }
    
    # Block access to sensitive files
    location ~ /\.(env|git|htaccess|htpasswd) {
        deny all;
        return 404;
    }
    
    # Block access to backup and log files
    location ~ \.(log|bak|backup|old|tmp)$ {
        deny all;
        return 404;
    }
}
EOF

# Enable the site
sudo ln -sf "$NGINX_SITES_AVAILABLE/$APP_NAME" "$NGINX_SITES_ENABLED/"
sudo rm -f "$NGINX_SITES_ENABLED/default"

# Test and reload nginx
echo "🧪 Testing Nginx configuration..."
if sudo nginx -t; then
    echo "✅ Nginx configuration valid"
    sudo systemctl reload nginx
    echo "✅ Nginx reloaded successfully"
else
    echo "❌ Nginx configuration error"
    exit 1
fi

echo "🔍 Running comprehensive health checks..."

# Wait for application to fully start
echo "⏳ Waiting for application startup..."
sleep 15

# Check PM2 status
echo "📊 PM2 Status:"
pm2 status

# Test backend health
echo "🔍 Testing backend..."
if curl -f -s -m 10 http://localhost:$PORT/health &>/dev/null; then
    echo "✅ Backend responding on port $PORT"
    BACKEND_STATUS="OK"
else
    echo "⚠️ Backend health check failed"
    echo "Recent backend logs:"
    pm2 logs $APP_NAME --lines 10 --nostream 2>/dev/null || echo "No logs available"
    BACKEND_STATUS="FAILED"
fi

# Test frontend
echo "🔍 Testing frontend..."
if curl -f -s -m 10 http://localhost/ &>/dev/null; then
    echo "✅ Frontend accessible via Nginx"
    FRONTEND_STATUS="OK"
else
    echo "⚠️ Frontend accessibility check failed"
    echo "Nginx access log (last 5 lines):"
    sudo tail -5 /var/log/nginx/access.log 2>/dev/null || echo "No access logs"
    echo "Nginx error log (last 5 lines):"
    sudo tail -5 /var/log/nginx/error.log 2>/dev/null || echo "No error logs"
    FRONTEND_STATUS="FAILED"
fi

# Test API endpoint
echo "🔍 Testing API..."
if curl -f -s -m 10 http://localhost/api/health &>/dev/null; then
    echo "✅ API accessible through Nginx"
    API_STATUS="OK"
else
    echo "⚠️ API check failed"
    API_STATUS="FAILED"
fi

echo ""
echo "🎉 Deployment completed!"
echo ""
echo "📋 Deployment Summary:"
echo "   Application: $APP_NAME"
echo "   Build Directory: $FINAL_BUILD_DIR"
echo "   Build Files: $BUILD_FILES files"
echo "   Backend: $BACKEND_STATUS"
echo "   Frontend: $FRONTEND_STATUS"
echo "   API: $API_STATUS"
echo ""
echo "🌐 Access Information:"
echo "   Frontend: http://$DOMAIN"
echo "   API: http://$DOMAIN/api"
echo "   Health: http://$DOMAIN/health"
echo ""
echo "🔧 Management Commands:"
echo "   View logs: pm2 logs $APP_NAME"
echo "   Restart: pm2 restart $APP_NAME"
echo "   Monitor: pm2 monit"
echo "   Status: pm2 status"
echo ""
echo "🔐 Next Steps:"
echo "   1. Set up SSL: bash deployment/ssl-setup.sh $DOMAIN admin@$DOMAIN"
echo "   2. Configure monitoring: pm2 monit"
echo "   3. Test all functionality: curl http://$DOMAIN/api/health"
echo ""

# Final status check
if [ "$BACKEND_STATUS" = "OK" ] && [ "$FRONTEND_STATUS" = "OK" ]; then
    echo "✅ Deployment successful - All systems operational"
    exit 0
else
    echo "⚠️ Deployment completed with warnings - Please check the failed components"
    exit 0
fi