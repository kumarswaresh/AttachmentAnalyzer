# Complete Database Export and Import Guide

## Export Details
- **File**: `complete-database-export.sql`
- **Size**: 89 KB
- **Type**: Full database dump with structure and data
- **Includes**: All tables, indexes, constraints, and data

## Import Commands to Overwrite Target Database

### Method 1: Complete Database Replacement
```bash
# Drop and recreate target database (requires superuser access)
psql "postgresql://username:password@host:port/postgres" -c "DROP DATABASE IF EXISTS target_database;"
psql "postgresql://username:password@host:port/postgres" -c "CREATE DATABASE target_database;"

# Import complete database
psql "postgresql://username:password@host:port/target_database" < complete-database-export.sql
```

### Method 2: Clean Import (Recommended)
```bash
# The export includes --clean and --create flags, so it will:
# 1. Drop existing objects
# 2. Recreate database structure
# 3. Import all data

psql "postgresql://username:password@host:port/target_database" < complete-database-export.sql
```

### Method 3: Force Overwrite with Connection Termination
```bash
# Terminate all connections to target database
psql "postgresql://username:password@host:port/postgres" -c "
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'target_database' AND pid <> pg_backend_pid();"

# Drop and recreate
psql "postgresql://username:password@host:port/postgres" -c "DROP DATABASE IF EXISTS target_database;"
psql "postgresql://username:password@host:port/postgres" -c "CREATE DATABASE target_database;"

# Import
psql "postgresql://username:password@host:port/target_database" < complete-database-export.sql
```

## What's Included in Export

### Database Structure
- All tables with proper schema
- Indexes and constraints
- Foreign key relationships
- Sequences and auto-increment settings

### Application Data
- **Users**: Admin accounts and demo users
- **Organizations**: 18 organizations with proper relationships
- **Agents**: 4 agents including Marketing Campaign Specialist
- **Agent Credentials**: OpenAI API configurations
- **Roles & Permissions**: Complete RBAC setup
- **API Keys**: Administrative access keys
- **Sessions**: Active user sessions

### Key Features Exported
- Marketing agent with OpenAI GPT-4 integration
- Hotel recommendations API (no hardcoded data)
- Multi-tenant organization structure
- Complete authentication system
- Admin dashboard functionality

## Verification After Import

```bash
# Connect to imported database
psql "postgresql://username:password@host:port/target_database"

# Verify key tables
\dt

# Check agent count
SELECT COUNT(*) FROM agents WHERE status = 'active';

# Check organizations
SELECT COUNT(*) FROM organizations;

# Check users
SELECT COUNT(*) FROM users;

# Verify marketing agent
SELECT name, model, status FROM agents WHERE role = 'content-creator';
```

## Environment Variables for Target Server

After importing, ensure these are configured:

```bash
export DATABASE_URL="postgresql://username:password@host:port/target_database"
export OPENAI_API_KEY="sk-proj-your-key-here"
export SESSION_SECRET="your-session-secret"
export NODE_ENV="production"
```

## Post-Import Testing

```bash
# Test marketing agent API
curl -X POST http://target-server.com/api/v1/marketing/hotel-recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "London, England",
    "travelType": "business",
    "starRating": 4.5,
    "propertyCount": 2
  }'

# Test admin login
curl -X POST http://target-server.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

## File Transfer Commands

```bash
# Transfer export file to target server
scp complete-database-export.sql user@target-server:/path/to/import/

# Or use rsync for large files
rsync -avz complete-database-export.sql user@target-server:/path/to/import/
```

## Security Notes

- Backup target database before import
- Verify database credentials and permissions
- Test on staging environment first
- Update API keys and secrets after import
- Change default passwords immediately

## Troubleshooting

**If import fails:**
1. Check PostgreSQL version compatibility
2. Verify database user has CREATE/DROP permissions
3. Ensure sufficient disk space
4. Check for active connections to target database
5. Review PostgreSQL logs for specific errors

**Common issues:**
- Permission denied: Use superuser account
- Database exists: Use --clean flag or manual drop
- Connection limit: Terminate active sessions first
- Encoding issues: Ensure UTF-8 compatibility