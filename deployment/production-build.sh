#!/bin/bash

# Production Build Script with Proper Output Handling
# Addresses Vite build output structure and warnings

set -e

echo "Starting production build process..."

# Set build environment
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=4096"

# Clean previous builds
echo "Cleaning previous builds..."
rm -rf dist/ client/dist/ 2>/dev/null || true

# Install production dependencies
echo "Installing dependencies..."
npm ci --production=false

# Build with warning suppression and proper output handling
echo "Building application..."

# Create custom build command that handles output correctly
npm run build 2>&1 | while IFS= read -r line; do
    # Filter out chunk size warnings but keep other important messages
    if [[ ! "$line" =~ "chunks are larger than 500 kB" ]] && \
       [[ ! "$line" =~ "manualChunks to improve chunking" ]] && \
       [[ ! "$line" =~ "chunkSizeWarningLimit" ]]; then
        echo "$line"
    fi
done

# Determine actual build output location and standardize
if [ -d "dist/public" ]; then
    echo "Found Vite build output in dist/public/"
    BUILD_SOURCE="dist/public"
elif [ -d "client/dist" ]; then
    echo "Found build output in client/dist/"
    BUILD_SOURCE="client/dist"
else
    echo "ERROR: No build output found"
    echo "Checking for any dist directories..."
    find . -name "dist" -type d 2>/dev/null || true
    exit 1
fi

# Create standardized build directory structure
FINAL_BUILD_DIR="client/dist"
mkdir -p "$FINAL_BUILD_DIR"

# Copy files to standardized location if needed
if [ "$BUILD_SOURCE" != "$FINAL_BUILD_DIR" ]; then
    echo "Standardizing build output to $FINAL_BUILD_DIR"
    cp -r "$BUILD_SOURCE"/* "$FINAL_BUILD_DIR"/
fi

# Verify build completion
if [ ! -f "$FINAL_BUILD_DIR/index.html" ]; then
    echo "ERROR: Build incomplete - index.html not found"
    exit 1
fi

# Show build summary
echo ""
echo "Build completed successfully!"
echo "Frontend files: $FINAL_BUILD_DIR"
echo "Backend bundle: dist/index.js"
echo ""
echo "Build contents:"
ls -la "$FINAL_BUILD_DIR"
echo ""

# Calculate build size
if command -v du >/dev/null 2>&1; then
    BUILD_SIZE=$(du -sh "$FINAL_BUILD_DIR" | cut -f1)
    echo "Total build size: $BUILD_SIZE"
fi

echo "Build process completed successfully!"