# AI Agent Platform

A sophisticated AI agent platform for creating, managing, and integrating intelligent agents across multiple technological ecosystems with advanced modular architecture and specialized C# development capabilities.

## 🏗️ Project Structure

```
agent-platform/
├── README.md                     # Project documentation
├── package.json                  # Dependencies and scripts
├── drizzle.config.ts            # Database configuration
├── tailwind.config.ts           # Styling configuration
├── postcss.config.js            # CSS processing
├── tsconfig.json                # TypeScript configuration
├── vite.config.ts               # Build configuration
├── client/                      # React frontend application
├── server/                      # Express backend application
├── shared/                      # Shared types and schemas
├── config/                      # Configuration files
│   ├── components.json          # shadcn/ui configuration
│   └── modelWeights.json        # AI model weights
├── setup/                       # Organized setup scripts
│   ├── local/                   # Local development setup
│   ├── remote/                  # Cloud/remote setup
│   ├── scripts/                 # Database and demo scripts
│   ├── docker/                  # Docker configuration
│   ├── docs/                    # Setup documentation
│   ├── legacy/                  # Archived setup files
│   └── unused/                  # Unused components
├── docs/                        # API documentation
├── migrations/                  # Database migrations
└── attached_assets/             # User-provided assets
```

## 🚀 Quick Start

### Local Development

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd agent-platform
   npm install
   ```

2. **Environment Setup:**
   
   Copy the sample environment file:
   ```bash
   cp .env.sample .env
   ```
   
   Edit `.env` with your credentials (minimum required):
   ```bash
   DATABASE_URL=postgresql://username:password@localhost:5432/agent_platform
   NODE_ENV=development
   OPENAI_API_KEY=your_openai_api_key
   PORT=5000
   ```

3. **Database Setup:**
   
   **Option A: Local PostgreSQL (Recommended)**
   ```bash
   # Run complete local setup (macOS)
   ./setup/local/local-setup.sh
   ```
   
   **Option B: Remote Database**
   ```bash
   # Setup for cloud databases
   ./setup/remote/remote-setup.sh
   ```
   
   **Option C: Manual Setup**
   ```bash
   # Push database schema
   npm run db:push
   
   # Seed initial data
   npm run seed
   ```

4. **Start Development Server:**
   ```bash
   npm run dev
   ```
   Application runs on http://localhost:5000

## 🛠️ Available Scripts & Commands

### Database Management
```bash
# Push schema to database
npm run db:push

# Generate migrations
npm run db:generate

# Drop all tables (destructive)
npm run db:drop

# Reset database completely
npm run db:reset

# Seed database with demo data
npm run seed

# Fresh seed (clean + reseed)
npm run seed:fresh
```

### Essential Setup Commands
```bash
# Complete local PostgreSQL setup (macOS)
./setup/local/local-setup.sh

# Remote/cloud database setup
./setup/remote/remote-setup.sh

# Create admin users (if needed)
npx tsx server/create-admin-users.ts
```

### Development Commands
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Lint code
npm run lint

# Format code
npm run format
```

### Testing & Validation
```bash
# Test authentication and basic functionality
curl http://localhost:5000/api/health

# Verify database connection
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
```

### Login Credentials (After Setup)

| Email | Password | Role |
|-------|----------|------|
| `admin@local.dev` | `admin123` | Super Admin |
| `superadmin@agentplatform.com` | `admin123` | Super Admin |
| `demo@agentplatform.com` | `demo123` | Admin |

## 📁 File Organization & Recent Changes

### Organized Setup Structure
The project has been reorganized for better maintainability:

```
setup/
├── local/                       # Local development setup
│   └── local-setup.sh          # Complete macOS PostgreSQL setup
├── remote/                      # Cloud database setup
│   └── remote-setup.sh         # Remote database configuration
├── scripts/                     # Database and utility scripts
│   ├── quick-admin-setup.ts    # Quick admin user creation
│   ├── demo-data-setup.ts      # Demo data population
│   ├── seed-local.js           # Database seeding
│   ├── diagnose-db.js          # Database diagnostics
│   ├── tests/                  # Test scripts
│   └── demos/                  # Demo and example scripts
├── docker/                      # Docker configuration
│   ├── Dockerfile              # Production Docker image
│   ├── Dockerfile.dev          # Development Docker image
│   ├── docker-compose.yml      # Production compose
│   ├── docker-compose.dev.yml  # Development compose
│   ├── docker-start.sh         # Docker startup script
│   └── nginx.conf              # Nginx configuration
├── docs/                        # Setup documentation
├── legacy/                      # Archived files
└── unused/                      # Unused components (mockui, templates)
```

### Clean Root Directory
The root directory now contains only essential files:
- Configuration files (package.json, tsconfig.json, etc.)
- Main application folders (client/, server/, shared/)
- Documentation (README.md)

### Removed Files
- `generated-csharp-task-api.cs` - Generated files moved to appropriate locations
- `generated-icon.png` - Temporary assets removed
- `marketing-agent-test-results-*.json` - Test results archived
- `package.local.json` - Local configuration merged
- `local-setup.sh` - Moved to `setup/legacy/`

## 🔧 Troubleshooting

### Common Setup Issues

**Database Connection Errors:**
```bash
# Check database status
node setup/scripts/diagnose-db.js

# Verify environment variables
echo $DATABASE_URL
```

**Permission Errors on macOS:**
```bash
# Make setup scripts executable
chmod +x setup/local/local-setup.sh
chmod +x setup/remote/remote-setup.sh
```

**Docker Issues:**
```bash
# Use Docker files from organized location
docker build -f setup/docker/Dockerfile .
docker-compose -f setup/docker/docker-compose.yml up
```

**Schema Issues:**
```bash
# Reset and regenerate schema
npm run db:drop
npm run db:push
npm run seed:fresh
```

### Environment Variables Reference

#### Required Configuration
- **`DATABASE_URL`**: PostgreSQL connection string for the platform database
- **`NODE_ENV`**: Environment mode (development/production)
- **`OPENAI_API_KEY`**: Required for AI agent functionality and chat features

#### Server Configuration
- **`PORT`**: Application server port (default: 5000)
- **`HOST`**: Server host binding (default: 0.0.0.0 for Docker, localhost for local dev)
- **`POSTGRES_PASSWORD`**: Database password for Docker deployments

#### AI Model Providers (Optional)
- **`ANTHROPIC_API_KEY`**: Enables Claude models for advanced reasoning tasks
- **`XAI_API_KEY`**: Enables Grok models for specialized AI capabilities
- **`PERPLEXITY_API_KEY`**: Enables real-time web search and current information

#### AWS Services (Optional - for production features)
- **`AWS_REGION`**: AWS region for services (default: us-east-1)
- **`AWS_ACCESS_KEY_ID`** / **`AWS_SECRET_ACCESS_KEY`**: AWS credentials
- **`S3_BUCKET`**: S3 bucket for file storage and agent data
- **`CLOUDWATCH_LOG_GROUP`**: CloudWatch for centralized logging and monitoring

#### Authentication & Security (Optional - for user management)
- **`JWT_SECRET`**: Secret key for signing JSON Web Tokens used in API authentication
- **`SESSION_SECRET`**: Secret key for encrypting user sessions and cookies
- **`API_RATE_LIMIT`**: Rate limiting for API endpoints (requests per minute)

#### External Integrations (Optional)
- **`SLACK_BOT_TOKEN`** / **`SLACK_CHANNEL_ID`**: Slack integration for notifications
- **`SENDGRID_API_KEY`**: Email service for notifications and user communications
- **`STRIPE_SECRET_KEY`** / **`VITE_STRIPE_PUBLIC_KEY`**: Payment processing
- **`NOTION_INTEGRATION_SECRET`** / **`NOTION_PAGE_URL`**: Notion workspace integration
- **`VITE_FIREBASE_*`**: Firebase authentication and real-time features
- **`VITE_GA_MEASUREMENT_ID`**: Google Analytics for usage tracking

#### Development & Debugging
- **`LOG_LEVEL`**: Logging verbosity (error, warn, info, debug)
- **`ENABLE_METRICS`**: Enable performance metrics collection (true/false)

**Note:** Most features work without optional integrations. The platform gracefully handles missing API keys and disables related features.

---

## 🔐 Current Status - Authentication System Complete

### ✅ Recently Completed (Latest Update)

The AI Agent Platform now features a complete, production-ready authentication system:

#### Working Features
- **Complete Authentication Flow**: Registration, login, logout with session management
- **Secure User Management**: bcrypt password hashing, JWT session tokens
- **Role-Based Access Control**: SuperAdmin, Admin, User roles with proper permissions
- **Protected Routes**: Frontend and API endpoints secured with authentication
- **Session Management**: Automatic token handling and cleanup

#### Verified Login Credentials
| Role | Email | Password | Access |
|------|-------|----------|---------|
| SuperAdmin | `admin@local.dev` | `admin123` | Full platform admin |
| SuperAdmin | `superadmin@agentplatform.com` | `admin123` | System management |
| Admin | `demo@agentplatform.com` | `demo123` | Organization management |

#### Technical Implementation
- **Server**: Runs on port 5000 with proper authentication middleware
- **Database**: PostgreSQL with user accounts and session tracking
- **Security**: Password hashing, token validation, SQL injection protection
- **Frontend**: React with protected routes and authentication state management

#### Quick Test
```bash
# Test the authentication system
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usernameOrEmail": "admin@local.dev", "password": "admin123"}'
```

The platform is now ready for development with a fully functional authentication system. All core features are working and properly secured.

3. **Set up the database:**
   ```bash
   npm run db:push
   ```

4. **Seed initial data:**
   
   Choose the appropriate method based on your setup:
   
   **First-time setup (new database):**
   ```bash
   npm run seed
   ```
   
   **If you've already run seeds before (recommended for existing users):**
   ```bash
   # Clean existing demo data and create fresh seed
   npm run seed:fresh
   
   # Or manually reset and reseed
   npm run db:reset
   npm run seed
   ```
   
   **Alternative seeding methods:**
   
   **Option A: Using SQL file (PostgreSQL v16)**
   ```bash
   psql -d your_database_name -f server/seed/seed.sql
   ```
   
   **Option B: Using Node.js script**
   ```bash
   DATABASE_URL="postgresql://username:password@localhost:5432/your_database_name" node seed-local.js
   ```
   
   **Option C: In Replit environment**
   ```bash
   NODE_ENV=development tsx server/seed/simpleSeed.ts
   ```

5. **Start development servers:**
   ```bash
   npm run dev
   ```

   This starts both the API server and frontend on port 5000 (configurable via PORT environment variable).

### Authentication System

The platform features a complete authentication system with session-based login and role-based access control.

#### Default Login Credentials

After seeding, use these credentials to access the platform:

- **SuperAdmin Account**: 
  - Email: `admin@local.dev`
  - Password: `admin123`
  - Access: Full platform administration and system management

- **SuperAdmin Account (Alternative)**:
  - Email: `superadmin@agentplatform.com`
  - Password: `admin123`
  - Access: Full platform administration and system management

- **Admin Account**:
  - Email: `demo@agentplatform.com`
  - Password: `demo123`
  - Access: Organization and user management

#### Authentication Features

- **Secure Registration**: Complete user registration with email validation
- **Session Management**: JWT-based session tokens with automatic expiration
- **Password Security**: bcrypt hashing with salt rounds for password protection
- **Role-Based Access**: Multi-tier access control (SuperAdmin, Admin, User)
- **Protected Routes**: Frontend route protection based on authentication status
- **API Authentication**: Bearer token authentication for API endpoints
- **Logout Functionality**: Complete session cleanup and token invalidation

#### Authentication Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `GET /api/auth/status` - Check authentication status
- `POST /api/auth/logout` - User logout and session cleanup

### AWS Deployment

1. **Provision AWS resources:**
   - RDS PostgreSQL instance with pgvector extension
   - S3 bucket for agent data storage
   - CloudWatch log group for monitoring
   - Bedrock model access permissions

2. **Deploy the application:**
   ```bash
   npm run build
   npm run deploy
   ```

## 🏗️ Architecture

### Core Components

- **Agent Engine**: Modular agent runtime with pluggable modules
- **LLM Router**: Multi-provider LLM integration (Bedrock, custom models)
- **Vector Store**: pgvector-powered semantic caching
- **Module System**: Reusable capability modules
- **Oversight Layer**: Real-time monitoring and governance
- **MCP Connector**: External system integration

### Tech Stack

**Backend:**
- Node.js 20 with TypeScript
- Express.js REST API
- Drizzle ORM with PostgreSQL + pgvector
- AWS SDK v3 (Bedrock, S3, CloudWatch)
- WebSocket for real-time updates

**Frontend:**
- React 18 with TypeScript
- Tailwind CSS + shadcn/ui components
- TanStack Query for state management
- Wouter for routing

## 📋 Agent Management

### Creating a New Agent

1. **Navigate to Agent Builder** (`/agent-builder`)
2. **Configure basic information:**
   - Name and unique identifier
   - Goal and role definition
   - Guardrails and safety policies

3. **Select modules:**
   - Core modules (Prompt, Logging) - required
   - Capability modules (Recommendation, Database, Code Generation, etc.)
   - Integration modules (MCP, JIRA, Confluence connectors)

4. **Choose LLM model:**
   - Auto-suggestions based on use case
   - Manual selection with cost/performance tradeoffs
   - Custom model support

### Agent Communication & Chaining

The platform supports advanced agent-to-agent communication and workflow chaining:

#### Direct Agent Communication
- Send messages between agents with different priority levels
- Support for various message types: task, result, error, context, handoff
- Real-time message queuing and processing
- Configurable communication protocols (direct, queued, broadcast, conditional)

#### Agent Chains
Create complex multi-step workflows by chaining agents together:

1. **Define Chain Steps:**
   - Configure each agent's role in the workflow
   - Set input/output mappings between steps
   - Add conditional logic for branching workflows
   - Configure timeouts and retry policies

2. **Execute Chains:**
   - Start chain execution with initial input data
   - Monitor progress through each step
   - Handle errors and retry failed steps
   - View detailed execution logs and analytics

3. **Chain Validation:**
   - Validate chain configuration before execution
   - Check for circular dependencies
   - Verify agent availability and permissions

#### Communication Analytics
- Track message volumes and success rates
- Monitor chain execution performance
- Identify bottlenecks and optimization opportunities
- Real-time dashboard with execution metrics

### Agent Modules

#### Core Modules
- **Prompt Module**: Advanced prompt engineering with templates
- **Logging Module**: Structured logging to database and CloudWatch

#### Analysis Modules  
- **Recommendation Module**: ML-powered suggestion engine
- **Data Analysis Module**: Statistical analysis and insights

#### Integration Modules
- **Database Connector**: Secure SQL query execution
- **MCP Connector**: Model Context Protocol for external APIs
- **JIRA Connector**: Issue tracking integration
- **Confluence Connector**: Documentation management

#### Generation Modules
- **Code Generator**: Multi-language code generation with testing
- **Document Generator**: Template-based document creation
- **Template Filler**: Dynamic content insertion

### Module Development

Create a new module by implementing the `BaseModule` interface:

```typescript
interface BaseModule {
  invoke(input: any): Promise<any>;
  getSchema(): any;
}
```

Example module implementation:

```typescript
export class CustomModule implements BaseModule {
  async invoke(input: any): Promise<any> {
    // Your module logic here
    return { result: "processed", data: input };
  }

  getSchema(): any {
    return {
      input: { type: "object", properties: { text: { type: "string" } } },
      output: { type: "object", properties: { result: { type: "string" } } }
    };
  }
}
```

## 🔌 MCP Integration

The Model Context Protocol (MCP) allows agents to access external data sources and services.

### Setting Up MCP Connectors

1. **Navigate to MCP Catalog** (`/mcp-catalog`)
2. **Install available connectors:**
   - Filesystem connector for file operations
   - Database connector for SQL queries
   - API connector for REST services
   - Custom connectors for specialized integrations

3. **Configure connector settings:**
   - Connection parameters (URLs, credentials)
   - Access permissions and security policies
   - Data transformation rules

### Creating Custom MCP Connectors

```typescript
interface MCPConnector {
  name: string;
  version: string;
  capabilities: string[];
  connect(config: any): Promise<void>;
  execute(operation: string, params: any): Promise<any>;
}
```

## 🔑 API Management

### API Key Management

The platform provides comprehensive API key management:

1. **Navigate to API Management** (`/api-management`)
2. **Generate API keys:**
   - Choose provider (platform, OpenAI, custom)
   - Set permissions and scopes
   - Configure rate limits and quotas
   - Set expiration dates

3. **Monitor usage:**
   - Track API calls and quotas
   - View usage analytics
   - Monitor performance metrics
   - Manage key lifecycle

### REST API Endpoints

All agent functionality is exposed via REST API with Swagger documentation available at `/api-docs`.

#### Core Agent Operations

```bash
# List all agents
GET /api/agents

# Create a new agent
POST /api/agents
Content-Type: application/json
{
  "name": "My Agent",
  "role": "Assistant",
  "goal": "Help users with tasks",
  "guardrails": {
    "requireHumanApproval": false,
    "contentFiltering": true,
    "readOnlyMode": false
  },
  "modules": {
    "enabled": ["prompt", "logging"],
    "configuration": {}
  },
  "model": "gpt-4"
}

# Get agent details
GET /api/agents/{id}

# Update agent
PATCH /api/agents/{id}

# Delete agent
DELETE /api/agents/{id}

# Execute agent
POST /api/agents/{id}/execute
{
  "input": "Your task here",
  "context": {}
}
```

#### Agent Communication

```bash
# Send message between agents
POST /api/agent-messages
{
  "fromAgentId": "agent1",
  "toAgentId": "agent2",
  "messageType": "task",
  "content": {
    "task": "Process this data",
    "priority": "high"
  },
  "priority": "high"
}

# Get agent messages
GET /api/agents/{id}/messages?messageType=task&status=pending

# Get communication analytics
GET /api/agent-communication/analytics
```

#### Agent Chains

```bash
# Create agent chain
POST /api/agent-chains
{
  "name": "Processing Pipeline",
  "description": "Multi-step data processing",
  "steps": [
    {
      "id": "step1",
      "name": "Data Validation",
      "agentId": "validator-agent",
      "inputMapping": { "data": "$.input.rawData" },
      "outputMapping": { "validData": "$.output.data" }
    },
    {
      "id": "step2",
      "name": "Data Processing",
      "agentId": "processor-agent",
      "condition": "$.step1.status === 'completed'",
      "inputMapping": { "data": "$.step1.output.validData" }
    }
  ]
}

# Execute chain
POST /api/agent-chains/{id}/execute
{
  "input": { "rawData": "..." },
  "variables": { "timeout": 300000 }
}

# Get chain execution status
GET /api/chain-executions/{executionId}

# Validate chain configuration
POST /api/agent-chains/{id}/validate
```

#### Template Management

```bash
# List agent templates
GET /api/agent-templates

# Create template
POST /api/agent-templates
{
  "name": "Customer Service Template",
  "category": "support",
  "defaultGoal": "Assist customers with inquiries",
  "defaultRole": "Customer Service Representative",
  "defaultGuardrails": {
    "requireHumanApproval": true,
    "contentFiltering": true
  }
}
```

#### Custom Models

```bash
# List custom models
GET /api/custom-models

# Register custom model
POST /api/custom-models
{
  "name": "Custom GPT Model",
  "provider": "openai",
  "modelId": "gpt-4-custom",
  "endpoint": "https://api.openai.com/v1/chat/completions",
  "capabilities": {
    "textGeneration": true,
    "imageAnalysis": false,
    "streaming": true
  }
}
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:agents
npm run test:communication
npm run test:api

# Run integration tests
npm run test:integration
```

### Test Agent Communication

Use the provided test script to verify communication and chaining functionality:

```bash
# Test agent communication and chaining
node test-agent-communication.js
```

This script will:
1. Create test agents with different roles
2. Send messages between agents
3. Create and execute agent chains
4. Monitor execution progress
5. Validate chain configurations
6. Generate analytics reports

### API Testing with Swagger

Visit `/api-docs` for interactive API documentation and testing interface.

## 📊 Monitoring

### Real-time Dashboard

Access the monitoring dashboard at `/monitoring` to view:

- Agent performance metrics
- API usage statistics
- Error rates and debugging info
- Resource utilization
- Communication flow analytics

### Logging

All agent activities are logged to:
- Database for structured queries
- CloudWatch for centralized monitoring
- Local files for development debugging

### Analytics

Track key metrics:
- Agent execution success rates
- Average response times
- Resource consumption
- Communication patterns
- Chain execution efficiency

## 🚀 Deployment

### Production Deployment

1. **Build the application:**
```bash
npm run build
```

2. **Set production environment variables:**
```bash
NODE_ENV=production
DATABASE_URL=postgresql://prod-user:password@prod-host:5432/agent_platform
OPENAI_API_KEY=sk-prod-...
```

3. **Deploy to your platform:**
```bash
# Example for Docker
docker build -t agent-platform .
docker run -p 5000:5000 agent-platform

# Example for serverless
npm run deploy:serverless
```

### Environment Configuration

Required environment variables:

```bash
# Database
DATABASE_URL=postgresql://...

# AI Models
OPENAI_API_KEY=sk-...

# Optional: Custom providers
ANTHROPIC_API_KEY=...
CUSTOM_MODEL_ENDPOINT=...

# Security
JWT_SECRET=your-secret-key
API_RATE_LIMIT=1000

# Monitoring
LOG_LEVEL=info
ENABLE_METRICS=true
```

## 🔧 Development

### Project Structure

```
agent-platform/
├── client/               # React frontend
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom React hooks
│   │   └── lib/          # Utilities and API client
├── server/               # Express backend
│   ├── routes.ts         # API route definitions
│   ├── storage.ts        # Database operations
│   ├── services/         # Business logic services
│   └── modules/          # Agent modules
├── shared/               # Shared types and schemas
└── tests/                # Test suites
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests for new functionality
5. Update documentation
6. Submit a pull request

### API Documentation

Complete API documentation is available via Swagger UI at `/api-docs` when running the development server.

## 🧪 Testing the C# Agent

After setup, test your specialized C# Enterprise Developer agent:

### 1. Access the Platform
Navigate to `http://localhost:5000` and login with admin credentials.

### 2. Test C# Code Generation
1. Go to **Agent Builder** (`/agent-builder`)
2. Find the "C# Enterprise Developer" agent
3. Test code generation with prompts like:
   ```
   Create a C# Web API for user management with CRUD operations, 
   Entity Framework, and proper validation
   ```

### 3. Direct API Testing
Test the C# agent via API:
```bash
# Test C# agent code generation
curl -X POST http://localhost:5000/api/agents/{agent-id}/execute \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=your-session-cookie" \
  -d '{
    "input": "Create a C# repository pattern for Product entity",
    "context": {
      "language": "csharp",
      "complexity": "intermediate"
    }
  }'
```

### 4. Verify Generated Code
The C# agent generates:
- Complete Web APIs with controllers
- Entity Framework models and configurations
- Repository and service patterns
- Unit tests with xUnit
- Dependency injection setup
- Proper error handling
- Swagger documentation

## 🔧 Available Commands

Since package.json modifications are restricted, use these direct commands:

### Database Management
```bash
# Push schema changes
npx drizzle-kit push

# Open database studio
npx drizzle-kit studio

# Reset database (WARNING: Destructive)
npx tsx server/reset-database.ts

# Fresh seed (reset + seed)
npx tsx server/fresh-seed.ts
```

### Seeding
```bash
# Initial seed
npx tsx server/seed-roles.ts
npx tsx server/setup-demo-users.ts
npx tsx server/create-csharp-agent.ts

# Individual components
npx tsx server/seed-roles.ts        # Roles only
npx tsx server/setup-demo-users.ts  # Users only
```

### Testing
```bash
# Test agent communication
node test-agent-communication.js

# Test C# agent specifically
npx tsx server/demo-csharp-api.ts
```

## 🚨 Troubleshooting

### Common Issues

**1. Database Connection Failed**
```bash
# Check PostgreSQL status
pg_isready -h localhost -p 5432

# Verify DATABASE_URL format
echo $DATABASE_URL
# Should be: postgresql://username:password@host:port/database
```

**2. Missing OpenAI API Key**
```bash
# Verify environment variable
echo $OPENAI_API_KEY

# Test API connectivity
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models
```

**3. Port Already in Use**
```bash
# Check what's using port 5000
lsof -ti:5000

# Kill process if needed
lsof -ti:5000 | xargs kill

# Or change port in .env
PORT=3000
```

**4. Seed Data Issues**
```bash
# If seeds fail, reset and try again
npx tsx server/reset-database.ts
npx tsx server/fresh-seed.ts

# Check for schema issues
npx drizzle-kit push
```

**5. Missing Dependencies**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# If TypeScript errors
npx tsc --noEmit
```

**6. Authentication Issues**
- Clear browser cookies and localStorage
- Restart the development server
- Check session configuration in browser developer tools

**7. C# Agent Not Working**
```bash
# Verify agent creation
npx tsx server/create-csharp-agent.ts

# Check agent exists in database
npx drizzle-kit studio
# Look for agents table
```

### Development Tips

- Use browser developer tools to debug frontend issues
- Check server logs in terminal for detailed error messages
- Database studio (`npx drizzle-kit studio`) provides visual database management
- API documentation at `/api-docs` shows all available endpoints
- Test individual components before running full workflows

### Performance Optimization

- Ensure PostgreSQL has adequate memory allocation
- Consider connection pooling for production deployments
- Monitor API response times in development
- Use database indexes for frequently queried fields

### Security Considerations

- Never commit API keys to version control
- Use environment variables for all sensitive configuration
- Regularly rotate API keys and session secrets
- Enable HTTPS in production environments
- Implement rate limiting for API endpoints

## 📚 Additional Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 🎯 Next Steps

After successful setup:

1. **Explore Agent Templates** - Create agents for different use cases
2. **Test Agent Communication** - Set up multi-agent workflows
3. **Configure Additional AI Providers** - Add Claude, Grok, or custom models
4. **Set up Production Environment** - Deploy to your preferred platform
5. **Customize UI** - Modify frontend components for your brand
6. **Add Custom Modules** - Extend agent capabilities
7. **Integrate External Services** - Connect to your existing tools

## 📞 Support

For issues and questions:
- Check this documentation first
- Review troubleshooting section above
- Examine server logs for error details
- Test individual components in isolation
- Verify environment configuration
