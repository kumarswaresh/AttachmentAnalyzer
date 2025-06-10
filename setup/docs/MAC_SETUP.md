# macOS Local Setup Guide

This guide will help you set up the AI Agent Platform on your Mac.

## Quick Setup

1. **Install PostgreSQL** (if not already installed):
   ```bash
   brew install postgresql@15
   brew services start postgresql@15
   ```

2. **Create database**:
   ```bash
   createdb agent_platform
   ```

3. **Copy environment file**:
   ```bash
   cp .env.sample .env
   ```

4. **Edit .env file** with your settings:
   ```bash
   nano .env
   ```
   
   Update these minimum required values:
   ```env
   DATABASE_URL=postgresql://$(whoami)@localhost:5432/agent_platform
   OPENAI_API_KEY=your-openai-api-key-here
   NODE_ENV=development
   ```

5. **Run complete setup**:
   ```bash
   npx tsx complete-fresh-setup.ts
   ```

## Manual Step-by-Step Setup

If the automated setup fails, run these commands one by one:

```bash
# 1. Install dependencies
npm install

# 2. Set up database schema
npx drizzle-kit push

# 3. Seed initial data
npx tsx server/seed-roles.ts
npx tsx server/setup-demo-users.ts

# 4. Start the application
npm run dev
```

## Troubleshooting

### Database Connection Issues

If you get "DATABASE_URL must be set" error:
1. Make sure `.env` file exists in project root
2. Check DATABASE_URL format: `postgresql://username@localhost:5432/database_name`
3. Verify PostgreSQL is running: `brew services list | grep postgresql`

### PostgreSQL Not Installed

Install PostgreSQL using Homebrew:
```bash
# Install Homebrew if needed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install PostgreSQL
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb agent_platform
```

### Permission Denied Errors

If you get permission errors:
```bash
# Fix PostgreSQL permissions
sudo chown -R $(whoami) /opt/homebrew/var/postgresql@15/

# Restart PostgreSQL
brew services restart postgresql@15
```

### OpenAI API Key Required

Get your API key from https://platform.openai.com/api-keys and add it to `.env`:
```env
OPENAI_API_KEY=sk-your-actual-api-key-here
```

## Default Login Credentials

Once setup is complete, access the app at http://localhost:5000:

- **Admin**: admin / admin123
- **Developer**: dev / dev123  
- **User**: user / user123

## Next Steps

After successful setup:
1. Test login with admin credentials
2. Explore the Agent Management interface
3. Create your first AI agent
4. Review the API documentation at `/api/docs`