# PM2 Deployment Troubleshooting Guide

## Current Issue: PM2 Processes Errored

Your PM2 processes are starting but immediately erroring out. Here's how to diagnose and fix this:

## Step 1: Run Diagnostic Script

```bash
cd /home/ubuntu/AttachmentAnalyzer
bash deployment/fix-and-deploy.sh
```

This script will:
- Check environment configuration
- Test database connectivity
- Verify application startup
- Create simplified PM2 configuration
- Show detailed error logs

## Step 2: Check Common Issues

### Environment Variables
Ensure `.env.production` exists with correct values:

```bash
# Check if file exists
ls -la .env.production

# Verify contents (without showing secrets)
cat .env.production | grep -E "^[A-Z_]+" | sed 's/=.*/=***/'
```

Required variables:
- `DATABASE_URL=postgresql://username:password@host:port/database`
- `OPENAI_API_KEY=sk-...`
- `NODE_ENV=production`
- `PORT=5000`

### Database Connection
Test PostgreSQL connectivity:

```bash
# Using psql (if available)
psql $DATABASE_URL -c "SELECT 1;"

# Or using the diagnostic script above
```

### Dependencies
Verify all packages are installed:

```bash
npm list --depth=0
```

## Step 3: Manual Application Test

Test the application directly:

```bash
cd /home/ubuntu/AttachmentAnalyzer
NODE_ENV=production npx tsx server/index.ts
```

Watch for error messages like:
- Database connection errors
- Missing environment variables
- Module import failures

## Step 4: View PM2 Logs

Check detailed error logs:

```bash
# View all logs
pm2 logs agent-platform

# View only errors
pm2 logs agent-platform --err

# View specific log files
cat logs/pm2-error.log
cat logs/pm2-out.log
```

## Step 5: Common Solutions

### Fix 1: Environment Variables
```bash
# Copy template and edit
cp .env.production.example .env.production
nano .env.production
```

### Fix 2: Database Issues
```bash
# Test connection format
echo "postgresql://user:pass@host:5432/dbname"

# Common RDS format
echo "postgresql://username:password@your-rds-endpoint.region.rds.amazonaws.com:5432/database"
```

### Fix 3: Restart with Clean State
```bash
# Clean restart
pm2 delete agent-platform
pm2 start ecosystem.simple.cjs
pm2 save
```

### Fix 4: Node Module Issues
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## Step 6: Alternative Simple Start

If PM2 continues to fail, start with basic Node.js:

```bash
# Direct execution
NODE_ENV=production PORT=5000 npx tsx server/index.ts

# Background with nohup
nohup NODE_ENV=production PORT=5000 npx tsx server/index.ts > app.log 2>&1 &
```

## Step 7: Health Check

Once running, verify the application:

```bash
# Test health endpoint
curl http://localhost:5000/health

# Test API endpoint
curl http://localhost:5000/api/v1/health

# Check process
ps aux | grep tsx
```

## Quick Command Reference

```bash
# PM2 management
pm2 list                    # Show all processes
pm2 logs agent-platform     # Show logs
pm2 restart agent-platform  # Restart app
pm2 delete agent-platform   # Remove app
pm2 monit                   # Real-time monitoring

# Application logs
tail -f logs/pm2-error.log  # Follow error log
tail -f logs/pm2-out.log    # Follow output log

# Environment check
env | grep -E "(DATABASE_URL|OPENAI_API_KEY|NODE_ENV)"
```

## Success Indicators

You'll know it's working when:
- PM2 status shows "online" not "errored"
- Health endpoints respond with 200 OK
- Application logs show "serving on port 5000"
- No error messages in PM2 logs

Run the diagnostic script first, then follow the specific guidance based on what errors it reveals.