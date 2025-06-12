#!/bin/bash

# Fixed Production Deployment Script
# Handles actual Vite build output structure

set -e

echo "🚀 Starting fixed production deployment..."

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
npm install --production

echo "🏗️  Building application..."
# Run the build command and capture output
npm run build 2>&1 | grep -v "chunks are larger than 500 kB" || true

# Determine actual build output location
if [ -d "dist/public" ]; then
    BUILD_SOURCE="dist/public"
elif [ -d "client/dist" ]; then
    BUILD_SOURCE="client/dist"
elif [ -d "dist" ]; then
    BUILD_SOURCE="dist"
else
    echo "❌ No build output found"
    exit 1
fi

# Create consistent build directory
BUILD_DIR="$APP_DIR/client/dist"
mkdir -p "$BUILD_DIR"

# Copy build files to expected location
if [ "$BUILD_SOURCE" != "$BUILD_DIR" ]; then
    echo "📋 Copying build files from $BUILD_SOURCE to $BUILD_DIR"
    cp -r "$BUILD_SOURCE"/* "$BUILD_DIR"/
fi

# Verify build exists and has content
if [ ! -f "$BUILD_DIR/index.html" ]; then
    echo "❌ Frontend build incomplete - index.html not found"
    exit 1
fi

echo "✅ Frontend built successfully at $BUILD_DIR"

# Show build contents
echo "📊 Build contents:"
ls -la "$BUILD_DIR"

echo "🔧 Configuring PM2..."

# Create PM2 ecosystem config
cat > ecosystem.config.js << EOF
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
        HOST: '0.0.0.0'
      },
      log_file: '$APP_DIR/logs/combined.log',
      out_file: '$APP_DIR/logs/out.log',
      error_file: '$APP_DIR/logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
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

echo "🚀 Starting application with PM2..."
pm2 start ecosystem.config.js --env production
pm2 save

echo "🌐 Configuring Nginx..."

# Create Nginx configuration with correct paths
sudo tee "$NGINX_SITES_AVAILABLE/$APP_NAME" > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Serve static frontend files
    location / {
        root $BUILD_DIR;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
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
    
    # Block sensitive files
    location ~ /\. {
        deny all;
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
sleep 10

# Check services
echo "PM2 Status:"
pm2 status

# Test endpoints
if curl -f http://localhost:$PORT/health &>/dev/null; then
    echo "✅ Backend responding on port $PORT"
else
    echo "⚠️ Backend health check failed"
    pm2 logs $APP_NAME --lines 10
fi

if curl -f http://localhost/ &>/dev/null; then
    echo "✅ Frontend accessible via Nginx"
else
    echo "⚠️ Frontend not accessible"
    echo "Build directory contents:"
    ls -la "$BUILD_DIR"
fi

echo ""
echo "🎉 Deployment completed!"
echo ""
echo "📋 Access Information:"
echo "   Frontend: http://$DOMAIN"
echo "   API: http://$DOMAIN/api"
echo "   Health: http://$DOMAIN/health"
echo ""
echo "🔧 Management:"
echo "   Logs: pm2 logs $APP_NAME"
echo "   Restart: pm2 restart $APP_NAME"
echo "   Monitor: pm2 monit"
echo ""
echo "📁 Build location: $BUILD_DIR"
echo "📊 Build files: $(ls -1 "$BUILD_DIR" | wc -l) files"
echo ""
echo "Next: Set up SSL with 'bash deployment/ssl-setup.sh $DOMAIN'"