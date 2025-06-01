# Agent Platform

A production-ready, full-stack AI agent management platform with modular architecture, real-time monitoring, and comprehensive oversight capabilities.

## 🚀 Quick Start

### Local Development

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd agent-platform
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Configure the following required variables:
   ```
   
   Required environment variables:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/agent_platform
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   OPENAI_API_KEY=your_openai_api_key
   S3_BUCKET=agent-data
   CLOUDWATCH_LOG_GROUP=/agent-platform/execution-logs
   ```

3. **Set up the database:**
   ```bash
   npm run db:push
   ```

4. **Seed initial data:**
   ```bash
   npm run seed
   ```

5. **Start development servers:**
   ```bash
   npm run dev
   ```

   This starts both the API server (port 8000) and the frontend (port 5000).

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
