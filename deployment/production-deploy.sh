#!/bin/bash

# Production Deployment Script
# Builds UI, configures PM2, and sets up Nginx

set -e

echo "🚀 Starting production deployment..."

# Configuration
APP_NAME="agent-platform"
APP_DIR="/home/ubuntu/AttachmentAnalyzer"
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
BUILD_DIR="$APP_DIR/client/dist"
DOMAIN="${DOMAIN:-localhost}"
PORT="${PORT:-5000}"

# Check if running as root for nginx setup
if [[ $EUID -eq 0 ]]; then
   echo "⚠️  This script should not be run as root for safety. Run with sudo only when prompted."
   exit 1
fi

echo "📦 Installing dependencies..."
cd "$APP_DIR"
npm install --production

echo "🏗️  Building frontend..."
# Build the React frontend
npm run build

# Verify build exists
if [ ! -d "$BUILD_DIR" ]; then
    echo "❌ Frontend build failed - dist directory not found"
    exit 1
fi

echo "✅ Frontend built successfully at $BUILD_DIR"

echo "🔧 Configuring PM2..."

# Create PM2 ecosystem config if not exists
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
      env_production: {
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
      node_args: '--max-old-space-size=1024'
    }
  ]
};
EOF

# Create logs directory
mkdir -p logs

# Stop existing PM2 processes
pm2 stop $APP_NAME 2>/dev/null || true
pm2 delete $APP_NAME 2>/dev/null || true

# Start the application with PM2
echo "🚀 Starting application with PM2..."
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup systemd -u ubuntu --hp /home/ubuntu

echo "🌐 Configuring Nginx..."

# Create Nginx configuration
sudo tee "$NGINX_SITES_AVAILABLE/$APP_NAME" > /dev/null << EOF
# Agent Platform Nginx Configuration
server {
    listen 80;
    server_name $DOMAIN;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
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
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:$PORT;
        access_log off;
    }
    
    # Block access to sensitive files
    location ~ /\. {
        deny all;
    }
    
    location ~ \.(env|config)$ {
        deny all;
    }
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

echo "🔍 Checking services..."

# Check PM2 status
echo "PM2 Status:"
pm2 status

# Check Nginx status
echo "Nginx Status:"
sudo systemctl status nginx --no-pager -l

# Check if application is responding
sleep 5
if curl -f http://localhost:$PORT/health &>/dev/null; then
    echo "✅ Backend is responding on port $PORT"
else
    echo "⚠️  Backend health check failed"
fi

if curl -f http://localhost/ &>/dev/null; then
    echo "✅ Frontend is being served by Nginx"
else
    echo "⚠️  Frontend not accessible through Nginx"
fi

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Access Information:"
echo "   Frontend: http://$DOMAIN"
echo "   Backend API: http://$DOMAIN/api"
echo "   Health Check: http://$DOMAIN/health"
echo ""
echo "🔧 Management Commands:"
echo "   View logs: pm2 logs $APP_NAME"
echo "   Restart app: pm2 restart $APP_NAME"
echo "   Stop app: pm2 stop $APP_NAME"
echo "   Nginx reload: sudo systemctl reload nginx"
echo "   Nginx logs: sudo tail -f /var/log/nginx/access.log"
echo ""
echo "⚠️  Next Steps:"
echo "   1. Configure your domain DNS to point to this server"
echo "   2. Set up SSL certificate (use certbot for Let's Encrypt)"
echo "   3. Update firewall rules to allow HTTP/HTTPS traffic"
echo "   4. Monitor application logs and performance"