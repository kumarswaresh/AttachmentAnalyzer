# Run the App - Complete Setup Guide

This guide provides step-by-step instructions for running the AI Agent Platform in different scenarios.

## 🚀 Quick Start (Fresh Setup)

> **Having permission issues?** Jump to [PostgreSQL Permission Fix](#permission-denied-for-schema-public) section below.

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database running
- OpenAI API key

### 1. Clone and Install
```bash
git clone <repository-url>
cd ai-agent-platform
npm install
```

### 2. Environment Setup
Copy and configure environment variables:
```bash
cp .env.sample .env
```

Edit `.env` with your settings:
```bash
# Required
DATABASE_URL="postgresql://username:password@localhost:5432/agent_platform"
OPENAI_API_KEY="your-openai-api-key-here"
NODE_ENV="development"
PORT=5000

# Optional (for enhanced features)
ANTHROPIC_API_KEY="your-anthropic-key"
XAI_API_KEY="your-xai-key"
SESSION_SECRET="your-secure-session-secret"
```

### 3. Database Setup (Fresh)
```bash
# Push schema to database
npx drizzle-kit push

# Seed initial data
npx tsx server/seed-roles.ts
npx tsx server/setup-demo-users.ts
npx tsx server/create-csharp-agent.ts
```

### 4. Start the Application
```bash
npm run dev
```

Access at: `http://localhost:5000`

**Default Login:**
- Username: `admin`
- Password: `admin123`

---

## 🔄 Existing Project with Code Changes

### When You Pull Code with Database Changes

If database schema has changed since your last pull:

#### Option 1: Safe Update (Preserves Data)
```bash
# Pull latest code
git pull origin main

# Install any new dependencies
npm install

# Apply schema changes
npx drizzle-kit push

# Start the app
npm run dev
```

#### Option 2: Fresh Reset (Clean Slate)
```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install

# Reset database and reseed
npx tsx server/reset-database.ts
npx tsx server/fresh-seed.ts

# Start the app
npm run dev
```

#### Option 3: Manual Schema Migration
```bash
# Check what changed
npx drizzle-kit check

# Generate migration
npx drizzle-kit generate

# Apply migration
npx drizzle-kit migrate

# Start the app
npm run dev
```

---

## 🗄️ Database Scenarios

### Scenario 1: First Time Setup
```bash
npx drizzle-kit push
npx tsx server/seed-roles.ts
npx tsx server/setup-demo-users.ts
npx tsx server/create-csharp-agent.ts
```

### Scenario 2: You've Already Run Seeds Before
```bash
# Clean reset
npx tsx server/reset-database.ts
npx tsx server/fresh-seed.ts
```

### Scenario 3: Schema Changes in New Code
```bash
# Apply schema changes
npx drizzle-kit push

# If you get errors, reset and reseed
npx tsx server/reset-database.ts
npx tsx server/fresh-seed.ts
```

### Scenario 4: Corrupted/Inconsistent Data
```bash
# Nuclear option - completely reset
npx tsx server/reset-database.ts
npx tsx server/fresh-seed.ts
```

---

## 🔧 Development Commands

### Database Management
```bash
# View database visually
npx drizzle-kit studio

# Push schema changes
npx drizzle-kit push

# Generate migrations
npx drizzle-kit generate

# Check schema differences
npx drizzle-kit check
```

### Seeding Options
```bash
# Full fresh seed (reset + seed all)
npx tsx server/fresh-seed.ts

# Individual seeding
npx tsx server/seed-roles.ts         # System roles
npx tsx server/setup-demo-users.ts   # Demo users
npx tsx server/create-csharp-agent.ts # C# agent

# Reset database only
npx tsx server/reset-database.ts
```

### Testing
```bash
# Test agent communication
node test-agent-communication.js

# Test C# agent specifically
npx tsx server/demo-csharp-api.ts
```

---

## ⚠️ Common Issues & Solutions

### Database Connection Failed
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Test connection
psql -d $DATABASE_URL -c "SELECT version();"

# Fix: Verify DATABASE_URL format
# postgresql://username:password@host:port/database
```

### Permission Denied for Schema Public
**Error:** `permission denied for schema public`

This occurs when your database user lacks sufficient privileges. Solutions:

#### Option 1: Grant Permissions (Recommended)
```bash
# Connect as superuser (postgres)
psql -U postgres -d your_database_name

# Grant permissions to your user
GRANT ALL PRIVILEGES ON SCHEMA public TO your_username;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_username;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_username;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO your_username;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO your_username;

# Exit
\q
```

#### Option 2: Use Superuser for Development
```bash
# Update your DATABASE_URL to use postgres user
DATABASE_URL="postgresql://postgres:password@localhost:5432/agent_platform"
```

#### Option 3: Create New Database with Correct Owner
```bash
# Connect as postgres superuser
psql -U postgres

# Create database with your user as owner
CREATE DATABASE agent_platform OWNER your_username;

# Exit and update DATABASE_URL
\q
```

#### Option 4: Fix Existing Database Ownership
```bash
# Connect as postgres
psql -U postgres

# Change database owner
ALTER DATABASE agent_platform OWNER TO your_username;

# Exit
\q
```

#### Quick Fix for macOS (Homebrew PostgreSQL)
```bash
# If using Homebrew PostgreSQL on macOS
# Your username is likely the database superuser

# One-command fix for your exact error:
createdb agent_platform
export DATABASE_URL="postgresql://$(whoami):@localhost:5432/agent_platform"

# Then run the schema push
npm run db:push
```

#### Immediate Solution for "permission denied for schema public"
```bash
# Run this diagnostic script first to identify the issue
node diagnose-db.js

# Most common fix - grant permissions as postgres user:
psql -U postgres -c "GRANT ALL PRIVILEGES ON SCHEMA public TO $(whoami);"

# Alternative - create new database with correct ownership:
dropdb agent_platform 2>/dev/null || true
createdb agent_platform
```

#### Diagnostic Commands
```bash
# Check your database user and permissions
psql -d your_database_name -c "SELECT current_user, session_user;"
psql -d your_database_name -c "SELECT * FROM information_schema.role_table_grants WHERE grantee = current_user;"

# Check database ownership
psql -d your_database_name -c "SELECT datname, datdba, usename FROM pg_database d JOIN pg_user u ON d.datdba = u.usesysid WHERE datname = 'your_database_name';"
```

### Schema Mismatch Errors
```bash
# Error: "relation does not exist" or "column does not exist"
# Solution: Push latest schema
npx drizzle-kit push

# If still errors, reset and reseed
npx tsx server/reset-database.ts
npx tsx server/fresh-seed.ts
```

### Foreign Key Constraint Errors
```bash
# Error: "violates foreign key constraint"
# Solution: Use fresh seed (handles dependencies)
npx tsx server/fresh-seed.ts
```

### Missing Dependencies
```bash
# After pulling new code
npm install

# If node_modules corrupted
rm -rf node_modules package-lock.json
npm install
```

### Port Already in Use
```bash
# Check what's using port 5000
lsof -ti:5000

# Kill the process
lsof -ti:5000 | xargs kill

# Or change port in .env
PORT=3000
```

### API Keys Not Working
```bash
# Verify OpenAI key
echo $OPENAI_API_KEY

# Test API connectivity
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models
```

---

## 🎯 Post-Setup Verification

### 1. Check App is Running
- Navigate to `http://localhost:5000`
- Login with admin credentials
- Verify dashboard loads

### 2. Test C# Agent
- Go to Agent Builder
- Find "C# Enterprise Developer" agent
- Test with prompt: "Create a simple C# class"

### 3. Verify Database
```bash
# Open database studio
npx drizzle-kit studio

# Check tables exist:
# - users, roles, organizations
# - agents, agent_templates
# - credentials, agent_chains
```

### 4. Check API Endpoints
```bash
# Test API health
curl http://localhost:5000/api/auth/status

# View API documentation
# Visit: http://localhost:5000/api/docs
```

---

## 🔄 Team Workflow

### When Team Member Makes Database Changes

**If you're pulling changes that include database schema updates:**

1. **Communicate** - Team member should announce schema changes
2. **Pull Code** - `git pull origin main`
3. **Check Changes** - `npx drizzle-kit check`
4. **Apply Changes** - `npx drizzle-kit push`
5. **Test** - Verify app still works
6. **Reset if Needed** - If issues: `npx tsx server/fresh-seed.ts`

### Safe Development Practices

```bash
# Before making changes
git pull origin main
npm install
npx drizzle-kit push

# After making changes
npx drizzle-kit check
git add .
git commit -m "feat: your changes"
git push
```

---

## 📊 Environment-Specific Instructions

### Development Environment
```bash
NODE_ENV=development
# Uses local database
# Hot reload enabled
# Debug logging active
```

### Production Environment
```bash
NODE_ENV=production
# Uses production database
# Optimized builds
# Error logging only
```

### Docker Environment
```bash
# Start with Docker
docker-compose up

# With fresh database
docker-compose down -v
docker-compose up
```

---

## 🆘 Emergency Recovery

### If Everything is Broken
```bash
# Nuclear reset - start completely fresh
rm -rf node_modules package-lock.json
npm install
npx tsx server/reset-database.ts
npx tsx server/fresh-seed.ts
npm run dev
```

### If Database is Corrupted
```bash
# Drop and recreate database
# (Replace 'agent_platform' with your database name)
dropdb agent_platform
createdb agent_platform
npx drizzle-kit push
npx tsx server/fresh-seed.ts
```

### If Seeding Fails
```bash
# Clear and retry
npx tsx server/reset-database.ts
# Wait for completion, then:
npx tsx server/fresh-seed.ts
```

---

## 📞 Getting Help

### Check Logs
- Server logs appear in terminal where you ran `npm run dev`
- Browser console for frontend issues (F12)
- Database logs in PostgreSQL logs

### Debug Steps
1. Check environment variables: `printenv | grep -E "(DATABASE|OPENAI|NODE_ENV)"`
2. Verify database connection: `npx drizzle-kit studio`
3. Test API: `curl http://localhost:5000/api/auth/status`
4. Check for TypeScript errors: `npx tsc --noEmit`

### Common Commands Summary
```bash
# Fresh start
npx tsx server/fresh-seed.ts && npm run dev

# Pull and update
git pull && npm install && npx drizzle-kit push && npm run dev

# Emergency reset
npx tsx server/reset-database.ts && npx tsx server/fresh-seed.ts
```

---

**Remember:** Always backup your database before making major changes in production environments!