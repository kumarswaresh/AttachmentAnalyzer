#!/bin/bash

# Complete Build and Deploy Script
# Builds frontend, configures PM2, and sets up Nginx

set -e

echo "Starting complete build and deployment..."

# Set environment variables
export NODE_ENV=production
export DOMAIN="${DOMAIN:-localhost}"
export PORT="${PORT:-5000}"

# Build frontend
echo "Building React frontend..."
npm run build

# Verify build exists
if [ ! -d "client/dist" ]; then
    echo "Frontend build failed - dist directory not found"
    exit 1
fi

echo "Frontend built successfully"

# Run the production deployment script
echo "Running production deployment..."
bash deployment/production-deploy.sh

echo "Build and deployment completed successfully!"

# Show next steps
echo ""
echo "Next Steps:"
echo "1. Configure your domain DNS to point to this server"
echo "2. Set up SSL: bash deployment/ssl-setup.sh yourdomain.com"
echo "3. Update firewall: sudo ufw allow 80 && sudo ufw allow 443"
echo "4. Monitor logs: pm2 logs agent-platform"