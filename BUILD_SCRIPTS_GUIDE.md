# Separate Build Scripts Guide

I've created individual build scripts for your frontend and backend components since package.json modifications aren't allowed.

## Available Build Scripts

### 1. Frontend Only
```bash
node build-frontend.js
```
- Builds React frontend using Vite
- Output: `dist/` directory with static assets
- Includes HTML, CSS, JS bundles

### 2. Backend Only
```bash
node build-backend.js
```
- Builds Express server using esbuild
- Output: `dist/index.js` - single bundled file
- Platform: Node.js ESM format

### 3. Complete Build
```bash
node build-all.js
```
- Builds frontend first, then backend
- Sequential execution with error handling
- Complete production-ready build

## Usage Examples

**Development workflow:**
```bash
# Build just frontend during UI development
node build-frontend.js

# Build just backend during API development
node build-backend.js
```

**Production deployment:**
```bash
# Complete build for production
node build-all.js

# Start production server
NODE_ENV=production node dist/index.js
```

**CI/CD Pipeline:**
```bash
# Install dependencies
npm install

# Run complete build
node build-all.js

# Run production
NODE_ENV=production node dist/index.js
```

## Build Outputs

**Frontend Build:**
- `dist/index.html` - Main HTML file
- `dist/assets/` - CSS, JS, and asset files
- Static files ready for web server

**Backend Build:**
- `dist/index.js` - Bundled Express server
- All dependencies included
- Single file deployment

## Alternative: NPM Scripts

If you can modify package.json manually, add these scripts:

```json
{
  "scripts": {
    "build:frontend": "vite build",
    "build:backend": "esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "build:all": "npm run build:frontend && npm run build:backend"
  }
}
```

The standalone JavaScript files provide the same functionality without requiring package.json changes.