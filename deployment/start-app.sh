#!/bin/bash

set -e

APP_DIR="/home/ubuntu/AttachmentAnalyzer"
cd "$APP_DIR"

echo "Starting Agent Platform Application"
echo "=================================="

# Build the application if not already built
if [ ! -d "dist/public" ] || [ ! -f "dist/index.js" ]; then
    echo "Building application..."
    npm run build || {
        echo "Build failed, trying components separately..."
        npx vite build --config vite.config.frontend.ts
        npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
    }
fi

# Verify build output
if [ -d "dist/public" ] && [ -f "dist/index.js" ]; then
    echo "Build verified successfully"
else
    echo "Build verification failed"
    exit 1
fi

# Check if port 5000 is already in use
if lsof -i :5000 >/dev/null 2>&1; then
    echo "Port 5000 is already in use. Stopping existing process..."
    pkill -f "node.*dist/index.js" || true
    sleep 2
fi

# Start the application
echo "Starting application on port 5000..."
echo "Press Ctrl+C to stop"
echo ""

# Set production environment
export NODE_ENV=production

# Start the compiled application
node dist/index.js