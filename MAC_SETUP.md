# Mac Local Development Setup

This guide explains how to run the Agent Platform on your Mac with PostgreSQL v16.

## Replit Dependencies Removed

The following Replit-specific dependencies have been identified and need to be handled for local development:

### Files to Replace/Modify

1. **Use `package.local.json` instead of `package.json`**
   ```bash
   cp package.local.json package.json
   ```

2. **Use `vite.config.local.ts` instead of `vite.config.ts`**
   ```bash
   cp vite.config.local.ts vite.config.ts
   ```

3. **Remove Replit banner script from `client/index.html`** (already done)

### Dependencies Removed for Mac Compatibility

- `@replit/vite-plugin-cartographer` - Replit-specific development tool
- `@replit/vite-plugin-runtime-error-modal` - Replit error overlay
- Replit dev banner script - External script for Replit environment

## Prerequisites

1. **Node.js 18+** 
   ```bash
   node --version  # Should be 18.0.0 or higher
   ```

2. **PostgreSQL 16**
   ```bash
   psql --version  # Should show PostgreSQL 16.x
   ```

3. **Create Database**
   ```bash
   createdb agent_platform
   ```

## Setup Steps

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd agent-platform
   
   # Use the Mac-compatible package.json
   cp package.local.json package.json
   cp vite.config.local.ts vite.config.ts
   
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   # Create .env file
   touch .env
   ```
   
   Add the following to `.env`:
   ```bash
   DATABASE_URL=postgresql://username:password@localhost:5432/agent_platform
   OPENAI_API_KEY=your_openai_api_key
   NODE_ENV=development
   
   # Optional (for full functionality)
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   S3_BUCKET=agent-data
   CLOUDWATCH_LOG_GROUP=/agent-platform/execution-logs
   ```

3. **Set up the database schema:**
   ```bash
   npm run db:push
   ```

4. **Seed initial data:**
   
   Choose one of these methods:
   
   **Option A: SQL file (recommended)**
   ```bash
   psql -d agent_platform -f server/seed/seed.sql
   ```
   
   **Option B: Node.js script**
   ```bash
   DATABASE_URL="postgresql://username:password@localhost:5432/agent_platform" npm run seed
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

   The application will be available at:
   - Frontend: http://localhost:5000
   - Backend API: http://localhost:5000/api
   - API Documentation: http://localhost:5000/api-docs

## Key Differences from Replit Version

1. **No Replit plugins** - Removed development tools specific to Replit environment
2. **Local file paths** - Uses standard Node.js path resolution instead of Replit-specific paths
3. **Standard hosting** - Configured for localhost instead of Replit domains
4. **Simplified configuration** - Removed environment checks for REPL_ID

## Troubleshooting

### Common Issues

1. **Port already in use:**
   ```bash
   lsof -ti:5000 | xargs kill -9
   ```

2. **Database connection errors:**
   - Verify PostgreSQL is running: `pg_isready`
   - Check database exists: `psql -l | grep agent_platform`
   - Verify credentials in DATABASE_URL

3. **Module not found errors:**
   ```bash
   npm install
   # If issues persist, try:
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **TypeScript errors:**
   ```bash
   npm run check
   ```

### Performance Optimization

For better performance on Mac, you can:

1. **Enable faster file watching:**
   ```bash
   # Add to .env
   CHOKIDAR_USEPOLLING=false
   ```

2. **Increase Node.js memory limit:**
   ```bash
   export NODE_OPTIONS="--max-old-space-size=4096"
   ```

## Development Workflow

The platform includes all the same features as the Replit version:

- Agent Builder with modular architecture
- Real-time agent communication and chaining
- MCP protocol integration
- API management with granular permissions
- Monitoring dashboard
- Comprehensive REST API

All functionality works identically to the Replit environment, just running locally on your Mac.

## Production Deployment

When ready for production, the platform can be deployed to any Node.js hosting service:

- Heroku
- Vercel
- AWS EC2/ECS
- DigitalOcean
- Your own VPS

Just ensure the production environment has access to a PostgreSQL database and any required API keys.