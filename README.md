# AI Agent Platform

A sophisticated AI agent platform for creating, managing, and integrating intelligent agents across multiple technological ecosystems with advanced modular architecture and specialized C# development capabilities.

## 🚀 Quick Start

### Local Development

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd agent-platform
   npm install
   ```

2. **Set up environment variables:**
   
   Copy the sample environment file and customize it:
   ```bash
   cp .env.sample .env
   ```
   
   Edit the `.env` file with your actual credentials. At minimum, you need:
   ```bash
   DATABASE_URL=postgresql://username:password@localhost:5432/agent_platform
   NODE_ENV=development
   OPENAI_API_KEY=your_openai_api_key
   PORT=5005
   ```

### Environment Variables Reference

#### Required Configuration
- **`DATABASE_URL`**: PostgreSQL connection string for the platform database
- **`NODE_ENV`**: Environment mode (development/production)
- **`OPENAI_API_KEY`**: Required for AI agent functionality and chat features

#### Server Configuration
- **`PORT`**: Application server port (default: 5005)
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

### Default Login Credentials

After seeding, use these credentials to access the platform:

- **Admin Account**: 
  - Username: `admin`
  - Password: `admin123`
  - Access: Full platform administration

- **Developer Account**:
  - Username: `developer` 
  - Password: `dev123`
  - Access: Agent creation and management

- **Regular User**:
  - Username: `user`
  - Password: `user123`
  - Access: Basic agent interaction

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
