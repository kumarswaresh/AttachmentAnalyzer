# AI Agent Platform Setup

This folder contains all setup scripts and documentation for the AI Agent Platform.

## Folder Structure

```
setup/
├── local/              # Local development setup
│   └── local-setup.sh  # Complete macOS local setup script
├── remote/             # Remote/production database setup
│   └── remote-setup.sh # Cloud database setup script
├── scripts/            # Reusable setup scripts
│   ├── quick-admin-setup.ts      # Creates admin user
│   ├── demo-data-setup.ts        # Creates demo users and org
│   ├── seed-local.js             # Local database seeding
│   ├── diagnose-db.js            # Database diagnostics
│   ├── tests/                    # Test scripts
│   │   ├── test-agent-communication.js
│   │   ├── test-agent-prompts.js
│   │   ├── test-email-marketing-system.js
│   │   └── test-marketing-agent-with-auth.js
│   └── demos/                    # Demo scripts
│       └── demo-email-marketing-complete.js
├── docs/               # Documentation files
│   ├── MAC_SETUP.md             # macOS setup guide
│   ├── DEMO_GUIDE.md            # Demo usage guide
│   ├── DEPLOYMENT_GUIDE.md      # Deployment instructions
│   ├── COMPREHENSIVE_API_DOCUMENTATION.md
│   ├── FEATURE_DOCUMENTATION.md
│   └── ...                     # Other documentation
└── legacy/             # Old setup files (archived)
    ├── complete-fresh-setup.ts
    ├── simple-demo-setup.ts
    └── ...             # Legacy scripts
```

## Quick Start

### Local Development (macOS)
```bash
./setup/local/local-setup.sh
```

### Remote Database Setup
```bash
./setup/remote/remote-setup.sh
```

## Setup Scripts

### local-setup.sh
Complete setup for local macOS development:
- Installs PostgreSQL via Homebrew
- Creates local database
- Sets up schema with Drizzle
- Creates admin and demo users
- Configures environment variables

### remote-setup.sh
Setup for cloud/production databases:
- Works with Neon, AWS RDS, etc.
- Tests remote connection
- Sets up schema
- Creates users and demo data

### Individual Scripts

#### setup/scripts/quick-admin-setup.ts
Creates admin user with credentials: `admin / admin123`

#### setup/scripts/demo-data-setup.ts
Creates demo users and organization:
- `demo-user / demo123`
- `test-user / demo123`
- Demo Organization

## Running Tests and Demos

### Test Scripts
```bash
# Test agent communication
node setup/scripts/tests/test-agent-communication.js

# Test marketing agent with authentication
node setup/scripts/tests/test-marketing-agent-with-auth.js

# Test email marketing system
node setup/scripts/tests/test-email-marketing-system.js

# Test agent prompts
node setup/scripts/tests/test-agent-prompts.js
```

### Demo Scripts
```bash
# Email marketing demo
node setup/scripts/demos/demo-email-marketing-complete.js
```

### Database Utilities
```bash
# Diagnose database issues
node setup/scripts/diagnose-db.js

# Seed local database
node setup/scripts/seed-local.js
```

## Default Credentials

After running any setup script:

| Username  | Password | Role  |
|-----------|----------|-------|
| admin     | admin123 | admin |
| demo-user | demo123  | user  |
| test-user | demo123  | user  |

## Environment Variables

Ensure your `.env` file contains:

```env
# Local development
DATABASE_URL=postgresql://[username]@localhost:5432/agent_platform

# Remote database
DATABASE_URL=postgresql://[user]:[pass]@[host]:[port]/[db]

# API Keys (optional)
OPENAI_API_KEY=your_openai_key
```

## Troubleshooting

### PostgreSQL Issues
1. Check if PostgreSQL is running: `brew services list`
2. Start PostgreSQL: `brew services start postgresql@15`
3. Test connection: `psql $DATABASE_URL -c 'SELECT 1;'`

### Schema Issues
1. Reset database: `npx drizzle-kit push --force`
2. Check table structure: `psql $DATABASE_URL -c '\dt'`

### Permission Issues
1. Make scripts executable: `chmod +x setup/local/local-setup.sh`
2. Check database permissions: Contact your DBA for cloud databases

## Documentation

All documentation has been moved to `setup/docs/`:
- [macOS Setup Guide](docs/MAC_SETUP.md)
- [Demo Guide](docs/DEMO_GUIDE.md)
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- [API Documentation](docs/COMPREHENSIVE_API_DOCUMENTATION.md)
- [Feature Documentation](docs/FEATURE_DOCUMENTATION.md)

## Legacy Files

Old setup scripts are archived in `setup/legacy/` for reference but should not be used for new setups.