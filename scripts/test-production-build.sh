#!/bin/bash

# Test production build for Docker deployment
set -e

echo "Testing production build process..."

# Clean previous build
rm -rf dist client/dist

# Build backend only (skip frontend for now)
echo "Building backend..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Test the built backend
echo "Testing backend build..."
if [ -f "dist/index.js" ]; then
    echo "✅ Backend build successful"
    echo "File size: $(du -h dist/index.js | cut -f1)"
else
    echo "❌ Backend build failed"
    exit 1
fi

# Test production environment
echo "Testing production configuration..."
NODE_ENV=production PORT=5001 timeout 10s node dist/index.js &
PID=$!

sleep 5

# Test health endpoint
if curl -f http://localhost:5001/api/health > /dev/null 2>&1; then
    echo "✅ Production backend responding correctly"
else
    echo "❌ Production backend not responding"
fi

# Cleanup
kill $PID 2>/dev/null || true

echo "Production build test completed"