#!/bin/bash

# Optimized Production Deployment Script
# Handles build warnings and creates production-ready deployment

set -e

echo "🚀 Starting optimized production deployment..."

# Configuration
APP_NAME="agent-platform"
APP_DIR="/home/ubuntu/AttachmentAnalyzer"
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
BUILD_DIR="$APP_DIR/client/dist"
DOMAIN="${DOMAIN:-localhost}"
PORT="${PORT:-5000}"

# Set production environment
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=4096"

echo "📦 Installing production dependencies..."
cd "$APP_DIR"
npm ci --production=false

echo "🏗️  Building frontend with optimization..."
# Use the production build script that handles output correctly
bash deployment/production-build.sh

# Verify build exists (the production-build.sh ensures client/dist structure)
BUILD_DIR="$APP_DIR/client/dist"
if [ ! -f "$BUILD_DIR/index.html" ]; then
    echo "❌ Frontend build failed - index.html not found"
    exit 1
fi

echo "✅ Frontend built successfully at $BUILD_DIR"

# Calculate build size
BUILD_SIZE=$(du -sh "$BUILD_DIR" | cut -f1)
echo "📊 Frontend build size: $BUILD_SIZE"

echo "🔧 Configuring PM2 with optimized settings..."

# Create optimized PM2 ecosystem config (CommonJS format)
cat > ecosystem.config.cjs << EOF
module.exports = {
  apps: [
    {
      name: '$APP_NAME',
      script: 'server/index.ts',
      interpreter: 'tsx',
      cwd: '$APP_DIR',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: $PORT,
        HOST: '0.0.0.0',
        NODE_OPTIONS: '--max-old-space-size=1024'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: $PORT,
        HOST: '0.0.0.0',
        NODE_OPTIONS: '--max-old-space-size=1024'
      },
      log_file: '$APP_DIR/logs/combined.log',
      out_file: '$APP_DIR/logs/out.log',
      error_file: '$APP_DIR/logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'client/dist'],
      max_restarts: 10,
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

# Clear PM2 logs
pm2 flush

echo "🚀 Starting application with PM2..."
pm2 start ecosystem.config.cjs --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup systemd -u ubuntu --hp /home/ubuntu

echo "🌐 Configuring optimized Nginx..."

# Create optimized Nginx configuration
sudo tee "$NGINX_SITES_AVAILABLE/$APP_NAME" > /dev/null << EOF
# Agent Platform Nginx Configuration - Optimized
upstream backend {
    server 127.0.0.1:$PORT max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    listen 80;
    server_name $DOMAIN;
    
    # Basic security
    server_tokens off;
    
    # Gzip compression - optimized
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_proxied any;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json
        application/xml
        image/svg+xml;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval'" always;
    
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=30r/m;
    limit_req_zone \$binary_remote_addr zone=general:10m rate=60r/m;
    
    # Serve static frontend files
    location / {
        root $BUILD_DIR;
        try_files \$uri \$uri/ /index.html;
        
        # Cache control for different file types
        location ~* \.(js|css|map)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }
        
        location ~* \.(png|jpg|jpeg|gif|ico|svg|webp)$ {
            expires 6M;
            add_header Cache-Control "public, immutable";
            access_log off;
        }
        
        location ~* \.(woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }
        
        # HTML files - no cache
        location ~* \.html$ {
            expires -1;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }
    }
    
    # API routes with rate limiting
    location /api/ {
        limit_req zone=api burst=10 nodelay;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffering
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }
    
    # Health check endpoint
    location = /health {
        limit_req zone=general burst=5 nodelay;
        proxy_pass http://backend;
        access_log off;
    }
    
    # Block access to sensitive files
    location ~ /\.(env|git|svn) {
        deny all;
        return 404;
    }
    
    location ~ \.(config|conf|json)$ {
        deny all;
        return 404;
    }
    
    # Custom error pages
    error_page 404 /index.html;
    error_page 500 502 503 504 /index.html;
}
EOF

# Enable the site
sudo ln -sf "$NGINX_SITES_AVAILABLE/$APP_NAME" "$NGINX_SITES_ENABLED/"

# Remove default nginx site if it exists
sudo rm -f "$NGINX_SITES_ENABLED/default"

# Test nginx configuration
if sudo nginx -t; then
    echo "✅ Nginx configuration is valid"
    sudo systemctl reload nginx
else
    echo "❌ Nginx configuration error"
    exit 1
fi

echo "🔍 Performing health checks..."

# Wait for application to start
sleep 10

# Check PM2 status
echo "PM2 Status:"
pm2 status

# Check Nginx status
echo "Nginx Status:"
sudo systemctl status nginx --no-pager -l

# Check application health
if curl -f -s http://localhost:$PORT/health &>/dev/null; then
    echo "✅ Backend is responding on port $PORT"
else
    echo "⚠️  Backend health check failed - checking logs..."
    pm2 logs $APP_NAME --lines 20
fi

# Check frontend serving
if curl -f -s http://localhost/ &>/dev/null; then
    echo "✅ Frontend is being served by Nginx"
else
    echo "⚠️  Frontend not accessible through Nginx"
fi

# Display build and deployment statistics
echo ""
echo "📊 Deployment Statistics:"
echo "   Frontend size: $BUILD_SIZE"
echo "   PM2 instances: $(pm2 list | grep -c $APP_NAME)"
echo "   Nginx workers: $(ps aux | grep -c 'nginx: worker')"
echo ""

echo "🎉 Optimized deployment completed successfully!"
echo ""
echo "📋 Access Information:"
echo "   Frontend: http://$DOMAIN"
echo "   Backend API: http://$DOMAIN/api"
echo "   Health Check: http://$DOMAIN/health"
echo ""
echo "🔧 Management Commands:"
echo "   View logs: pm2 logs $APP_NAME"
echo "   Monitor: pm2 monit"
echo "   Restart: pm2 restart $APP_NAME"
echo "   Reload Nginx: sudo systemctl reload nginx"
echo ""
echo "⚠️  Next Steps:"
echo "   1. Set up SSL: bash deployment/ssl-setup.sh $DOMAIN"
echo "   2. Configure firewall: sudo ufw allow 80 && sudo ufw allow 443"
echo "   3. Monitor logs: pm2 logs $APP_NAME --follow"