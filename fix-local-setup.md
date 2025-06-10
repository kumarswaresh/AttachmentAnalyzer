# Fix Local macOS Setup - DATABASE_URL Error

## The Problem
You're getting this error: `DATABASE_URL must be set. Did you forget to provision a database?`

This happens because standalone scripts don't automatically load your `.env` file.

## Quick Fix (2 steps)

### Step 1: Check your .env file
```bash
# In your project directory (/Users/anandkumar/Downloads/analyser/AttachmentAnalyzer/)
cat .env
```

If the file doesn't exist or DATABASE_URL looks wrong, create/fix it:

```bash
# Copy the sample
cp .env.sample .env

# Edit with your correct database URL
nano .env
```

Set this line in your `.env`:
```env
DATABASE_URL=postgresql://anandkumar@localhost:5432/agent_platform
```

### Step 2: Create the database if needed
```bash
# Create the database
createdb agent_platform

# Test connection
psql postgresql://anandkumar@localhost:5432/agent_platform -c "SELECT 1;"
```

## Now Run Your Scripts

The seeding scripts should work now:
```bash
npx tsx server/seed-roles.ts
npx tsx server/setup-demo-users.ts
```

## If PostgreSQL isn't installed

Install PostgreSQL using Homebrew:
```bash
# Install Homebrew (if needed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install PostgreSQL
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb agent_platform
```

## Verify Everything Works

1. Check database connection:
   ```bash
   psql $DATABASE_URL -c "SELECT version();"
   ```

2. Run the app:
   ```bash
   npm run dev
   ```

3. Access at: http://localhost:5005 (or whatever port is shown)

## Login Credentials
- **Admin**: admin / admin123
- **Developer**: dev / dev123  
- **User**: user / user123