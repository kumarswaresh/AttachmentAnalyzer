#!/bin/bash

set -e

# Use current directory instead of hardcoded path
cd "$(dirname "$0")/.."

echo "Building frontend..."

# Clean previous builds
rm -rf dist/public

# Build frontend with correct configuration
npx vite build --config vite.config.frontend.ts

# Verify build output
if [ -d "dist/public" ] && [ -f "dist/public/index.html" ]; then
    echo "Frontend build successful"
    ls -la dist/public/
else
    echo "Frontend build failed"
    exit 1
fi