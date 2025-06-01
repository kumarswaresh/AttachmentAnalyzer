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

1. **Navigate to Agent Builder** (`/builder`)
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
