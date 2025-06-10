# Agent Platform Demo Guide

This comprehensive guide demonstrates all features and operations of the AI Agent Management Platform, including the enhanced multi-credential system, agent creation workflows, and advanced platform capabilities.

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [Multi-Credential System](#multi-credential-system)
3. [Agent Creation Workflow](#agent-creation-workflow)
4. [Visual Agent App Builder](#visual-agent-app-builder)
5. [MCP Connector Management](#mcp-connector-management)
6. [Agent Communication & Orchestration](#agent-communication--orchestration)
7. [Monitoring & Analytics](#monitoring--analytics)
8. [Hotel Booking Demo](#hotel-booking-demo)
9. [API Management](#api-management)
10. [Troubleshooting](#troubleshooting)

## Platform Overview

The Agent Platform is a comprehensive AI agent management system that supports:

- **Multi-Provider Model Support**: OpenAI, Anthropic, AWS Bedrock, and custom models
- **Enhanced Credential Management**: Multiple API keys per provider with secure storage
- **Visual Workflow Builder**: Drag-and-drop interface for complex agent workflows
- **MCP Protocol Integration**: Extensible connector system for external services
- **Real-time Monitoring**: Performance analytics and execution tracking
- **Agent-to-Agent Communication**: Advanced orchestration and chaining capabilities

## Multi-Credential System

### Overview
The enhanced credential system allows you to manage multiple API keys per provider, assign specific credentials to different agents, and store credentials securely.

### Setting Up Credentials

#### Step 1: Navigate to Credentials Management
1. Open the platform dashboard
2. Click "Credentials Management" in the sidebar
3. View the credentials overview with statistics

#### Step 2: Add OpenAI Credentials
1. Click "Add Credential" button
2. Fill in the form:
   - **Name**: "OpenAI Production Key"
   - **Provider**: Select "OpenAI"
   - **Category**: "AI Models"
   - **API Key Value**: Your OpenAI API key (starts with sk-)
   - **Description**: "Production OpenAI key for GPT models"
   - **Set as default**: Enable if this should be the primary key
   - **Storage Type**: Choose "Internal" or "AWS Parameter Store"

3. Click "Create Credential"

#### Step 3: Add Additional Provider Credentials
Repeat the process for other providers:

**Anthropic Credentials:**
- Name: "Anthropic Claude Pro"
- Provider: "Anthropic"
- API Key: Your Anthropic API key
- Description: "Claude 3 Sonnet access"

**AWS Credentials:**
- Name: "AWS Bedrock Production"
- Provider: "AWS"
- Key Type: "Access Key"
- Description: "Bedrock model access"

#### Step 4: Organize Credentials
- Use tags to categorize credentials (e.g., "production", "development", "testing")
- Set appropriate defaults for each provider
- Configure AWS Parameter Store for enhanced security

### Credential Security Features

- **Encryption**: All credentials are encrypted at rest
- **AWS Parameter Store Integration**: Store sensitive data in AWS for enhanced security
- **Access Control**: Credentials are only accessible during agent execution
- **Audit Trail**: Track credential usage and modifications

## Agent Creation Workflow

### Complete Agent Creation Demo

Let's create a comprehensive marketing agent that demonstrates all platform capabilities.

#### Step 1: Basic Agent Information

1. **Navigate to Agent Builder**
   - Click "Agent Builder" in the sidebar
   - Start the guided wizard

2. **Fill Basic Information (Step 1)**
   ```
   Agent Name: Marketing Content Specialist
   Agent Goal: Create compelling marketing content including blog posts, social media content, and email campaigns using market research and competitor analysis
   Agent Role: Content Marketing Expert
   ```

3. **Configure Guardrails**
   - Enable human approval for final content
   - Enable content filtering
   - Set max tokens: 8000
   - Add allowed domains: company website, social media platforms

#### Step 2: Module Selection

Select the following modules for comprehensive marketing capabilities:

1. **Core Modules (Always Required)**
   - Prompt Module v2.1.0: Core reasoning capabilities
   - Logging Module v1.5.0: Execution tracking

2. **Marketing-Specific Modules**
   - Web Search Module: Market research and trend analysis
   - Content Generation Module: Blog posts and articles
   - Social Media Module: Platform-specific content creation
   - Analytics Module: Performance tracking and insights

3. **Integration Modules**
   - API Integration Module: Connect to marketing tools
   - Database Module: Store and retrieve campaign data
   - File Processing Module: Handle documents and media

#### Step 3: Model Selection with Credential Assignment

1. **Choose Model Based on Use Case**
   - The system will suggest models based on "marketing" use case
   - Recommended: GPT-4 for high-quality content generation
   - Alternative: Claude 3 Sonnet for analytical tasks

2. **Configure Budget and Latency Preferences**
   - Budget: Medium Cost (balanced performance and cost)
   - Latency: Medium (acceptable for content creation)

3. **Select API Credential**
   - When you select a model, the credential selector appears
   - Choose your configured OpenAI credential: "OpenAI Production Key"
   - The system shows credential status and configuration details

4. **Model Configuration**
   ```json
   {
     "model": "gpt-4-turbo",
     "temperature": 0.7,
     "maxTokens": 4000,
     "provider": "openai",
     "credentialId": 1
   }
   ```

#### Step 4: Agent Chaining Configuration

Configure the agent to work with other agents in your system:

1. **Enable Agent Chaining**
   - Toggle "Enable agent chaining"
   - This allows the agent to collaborate with other agents

2. **Parent Agent Configuration**
   - Add "Research Agent" as a parent (if available)
   - Set communication protocol: "Message Passing"
   - Define handoff conditions: "When research data is needed"

3. **Child Agent Configuration**
   - Add "Social Media Specialist" as a child agent
   - Set handoff conditions: "When platform-specific content is needed"

4. **Communication Settings**
   ```json
   {
     "enableChaining": true,
     "communicationProtocol": "message_passing",
     "parentAgents": ["research-agent-id"],
     "childAgents": ["social-media-agent-id"],
     "handoffConditions": [
       "research_needed",
       "platform_specific_content",
       "performance_analysis"
     ]
   }
   ```

#### Step 5: Review and Create

1. **Review Configuration**
   - Verify all settings are correct
   - Check module compatibility
   - Confirm credential assignment
   - Review guardrail settings

2. **Agent Summary Display**
   ```
   Agent: Marketing Content Specialist
   Model: GPT-4 Turbo (OpenAI Production Key)
   Modules: 8 selected
   Chaining: Enabled with 1 parent, 1 child
   Guardrails: Human approval enabled
   Estimated Cost: $0.03 per 1K tokens
   ```

3. **Create Agent**
   - Click "Create Agent"
   - System validates configuration
   - Agent is created and appears in catalog

### Testing the Created Agent

#### Step 1: Navigate to Chat Console
1. Go to "Chat Console" in sidebar
2. Select your newly created "Marketing Content Specialist"
3. Start a conversation

#### Step 2: Test Agent Capabilities
```
Test Prompt: "Create a blog post about sustainable fashion trends for our eco-friendly clothing brand. Include market research insights and social media snippets."

Expected Behavior:
1. Agent analyzes the request
2. Uses web search module for market research
3. Generates comprehensive blog post
4. Creates social media content snippets
5. Requests human approval before finalizing
6. Logs all execution steps
```

#### Step 3: Monitor Execution
1. Open "Monitoring" dashboard
2. View real-time execution logs
3. Check performance metrics
4. Review cost tracking

## Visual Agent App Builder

### Creating Multi-Agent Workflows

The Visual Agent App Builder allows you to create complex workflows with multiple agents working together.

#### Step 1: Access Visual Builder
1. Navigate to "Visual Agent App Builder"
2. Click "Create New App"
3. Name your app: "Content Marketing Pipeline"

#### Step 2: Design Workflow

1. **Add Agent Nodes**
   - Drag "Research Agent" to canvas
   - Add "Content Creator Agent"
   - Add "Social Media Agent"
   - Add "Analytics Agent"

2. **Configure Connections**
   - Connect Research Agent → Content Creator
   - Connect Content Creator → Social Media Agent
   - Connect Social Media Agent → Analytics Agent

3. **Set Trigger Conditions**
   - Start trigger: "New campaign request"
   - Conditional branches based on content type
   - Parallel execution for multi-platform content

#### Step 3: Configure MCP Connectors
1. **Add Data Sources**
   - Google Analytics Connector
   - Social Media Platform APIs
   - CRM System Integration
   - Content Management System

2. **Set Up Transformations**
   - Data formatting between agents
   - Content adaptation for different platforms
   - Performance metric aggregation

#### Step 4: Deploy Workflow
1. Test workflow with sample data
2. Configure monitoring and alerting
3. Deploy to production environment
4. Set up scheduled execution

## MCP Connector Management

### Available Connectors

The platform includes several pre-built MCP connectors:

#### Communication Connectors
- **Slack Integration**: Send notifications and updates
- **Email Service**: Automated email campaigns
- **SMS Gateway**: Text message notifications

#### Data Connectors
- **Google Analytics**: Website traffic and user behavior
- **CRM Systems**: Customer data and interactions
- **Database Connectors**: SQL and NoSQL database access

#### External Services
- **Weather API**: Location-based weather data
- **Maps & Geolocation**: Geographic information
- **Search APIs**: Web search and information retrieval

### Creating Custom Connectors

#### Step 1: Navigate to MCP Catalog
1. Go to "MCP Catalog" in sidebar
2. Click "Create Custom Connector"

#### Step 2: Configure Connector
```json
{
  "name": "mailchimp-integration",
  "displayName": "Mailchimp Email Marketing",
  "type": "api",
  "category": "communication",
  "authConfig": {
    "type": "api_key",
    "fields": {
      "apiKey": "API Key",
      "datacenter": "Data Center"
    }
  },
  "endpoints": [
    {
      "name": "createCampaign",
      "method": "POST",
      "path": "/campaigns",
      "description": "Create new email campaign"
    },
    {
      "name": "addSubscriber",
      "method": "POST", 
      "path": "/lists/{listId}/members",
      "description": "Add subscriber to list"
    }
  ]
}
```

#### Step 3: Test Connector
1. Configure authentication credentials
2. Test sample API calls
3. Validate response handling
4. Enable for agent use

## Agent Communication & Orchestration

### Setting Up Agent Chains

#### Step 1: Define Communication Channels
1. Navigate to "Agent Communication"
2. Create communication channel: "Marketing Pipeline"
3. Add participating agents
4. Set message routing rules

#### Step 2: Configure Coordination Rules
```json
{
  "trigger": {
    "type": "message_received",
    "conditions": {
      "messageType": "content_request",
      "priority": "high"
    }
  },
  "action": {
    "type": "notify_agents",
    "targetAgents": ["research-agent", "content-creator"],
    "parameters": {
      "timeout": 300,
      "retryCount": 3
    }
  }
}
```

#### Step 3: Monitor Agent Communication
1. View real-time message flow
2. Track agent workload and availability
3. Monitor communication latency
4. Debug coordination issues

### Advanced Orchestration Patterns

#### Sequential Processing
```
Research Agent → Content Creator → Editor → Publisher
```

#### Parallel Processing
```
Research Agent → [Content Creator 1, Content Creator 2, Content Creator 3] → Aggregator
```

#### Conditional Routing
```
Input Classifier → {
  Blog Post → Blog Agent,
  Social Media → Social Agent,
  Email → Email Agent
}
```

## Monitoring & Analytics

### Performance Dashboard

#### Key Metrics
- **Agent Execution Times**: Average response time per agent
- **Success Rates**: Completion rate and error frequency
- **Cost Tracking**: Token usage and API costs
- **Resource Utilization**: CPU, memory, and network usage

#### Real-time Monitoring
1. Navigate to "Monitoring" dashboard
2. View live execution logs
3. Monitor system health metrics
4. Set up alerts for anomalies

### Execution Logs

#### Log Categories
- **Info**: Normal execution steps
- **Warning**: Non-critical issues
- **Error**: Execution failures
- **Debug**: Detailed troubleshooting information

#### Log Analysis
```json
{
  "executionId": "exec_12345",
  "agentId": "marketing-agent",
  "timestamp": "2024-01-15T10:30:00Z",
  "duration": 2.5,
  "status": "completed",
  "tokenUsage": {
    "input": 150,
    "output": 800,
    "total": 950
  },
  "cost": 0.0285
}
```

## Hotel Booking Demo

### Demonstration Use Case

The hotel booking demo showcases the platform's ability to handle complex, real-world scenarios with multiple data sources and user interactions.

#### Step 1: Access Hotel Demo
1. Navigate to "Hotel Demo" in sidebar
2. The demo presents a travel booking interface
3. Integrated with real hotel data and booking systems

#### Step 2: Test Booking Flow
1. **Search Hotels**
   ```
   Location: San Francisco, CA
   Check-in: March 15, 2024
   Check-out: March 18, 2024
   Guests: 2 adults
   ```

2. **AI-Powered Recommendations**
   - The system uses AI agents to analyze preferences
   - Provides personalized recommendations
   - Considers budget, location, amenities

3. **Real-time Processing**
   - Queries multiple booking APIs
   - Compares prices across platforms
   - Checks availability in real-time

#### Step 3: Monitor Backend Processing
1. Open monitoring dashboard during search
2. Watch agent execution logs
3. See API calls to hotel providers
4. Track response times and caching

### Architecture Overview
```
User Request → 
  Hotel Search Agent → 
    [Price Comparison Agent, Availability Agent, Review Analysis Agent] → 
      Recommendation Engine → 
        Booking Confirmation Agent
```

## API Management

### REST API Endpoints

The platform exposes comprehensive REST APIs for integration:

#### Agent Management
```http
GET /api/agents
POST /api/agents
PUT /api/agents/{id}
DELETE /api/agents/{id}
```

#### Credential Management
```http
GET /api/credentials
POST /api/credentials
PUT /api/credentials/{id}
DELETE /api/credentials/{id}
GET /api/credentials/provider/{provider}
```

#### Agent Execution
```http
POST /api/agents/{id}/execute
GET /api/agents/{id}/logs
GET /api/agents/{id}/metrics
```

### API Documentation

#### Swagger Integration
1. Navigate to "API Management"
2. View interactive API documentation
3. Test endpoints directly from browser
4. Generate client SDKs

#### Authentication
```http
Authorization: Bearer <your-api-key>
Content-Type: application/json
```

#### Example Agent Execution
```javascript
const response = await fetch('/api/agents/marketing-agent/execute', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-api-key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    input: "Create a social media post about our new product launch",
    context: {
      brand: "TechCorp",
      platform: "twitter",
      tone: "professional"
    }
  })
});

const result = await response.json();
console.log(result.output);
```

## Advanced Features Demo

### Custom Model Integration

#### Step 1: Add Custom Model
1. Navigate to "Custom Models"
2. Click "Add Custom Model"
3. Configure model details:
   ```json
   {
     "name": "custom-marketing-model",
     "provider": "custom",
     "endpoint": "https://your-model-api.com/generate",
     "authentication": "bearer",
     "parameters": {
       "temperature": 0.7,
       "maxTokens": 2000
     }
   }
   ```

### Module Library

#### Creating Custom Modules
1. Navigate to "Module Library"
2. Click "Create Module"
3. Define module capabilities:
   ```json
   {
     "name": "sentiment-analysis",
     "version": "1.0.0",
     "description": "Analyze sentiment of text content",
     "inputs": ["text"],
     "outputs": ["sentiment", "confidence"],
     "dependencies": ["nlp-library"]
   }
   ```

## Troubleshooting

### Common Issues

#### Credential Configuration Errors
**Problem**: "Invalid API key" error
**Solution**: 
1. Verify API key format and validity
2. Check provider-specific requirements
3. Ensure credential is marked as configured
4. Test credential independently

#### Agent Execution Failures
**Problem**: Agent timeouts or errors
**Solution**:
1. Check agent logs for detailed error messages
2. Verify model availability and quotas
3. Review input prompt length and complexity
4. Test with simpler inputs first

#### MCP Connector Issues
**Problem**: External service connectivity
**Solution**:
1. Verify connector configuration
2. Test API endpoints independently
3. Check authentication credentials
4. Review rate limiting and quotas

### Debug Mode

#### Enable Detailed Logging
1. Set logging level to "debug" in agent configuration
2. Monitor real-time logs during execution
3. Review execution timeline and bottlenecks
4. Analyze token usage and costs

#### Performance Optimization
1. Monitor response times and identify slow components
2. Optimize prompts for efficiency
3. Use caching for repeated operations
4. Configure parallel processing where appropriate

### Support Resources

#### Documentation
- API Reference: `/api/docs`
- Module Documentation: In-platform help
- Integration Guides: Step-by-step tutorials

#### Community
- GitHub Issues: Bug reports and feature requests
- Community Forum: Best practices and tips
- Sample Projects: Reference implementations

---

## Next Steps

After completing this demo guide, you should be able to:

1. ✅ Configure multiple credentials for different providers
2. ✅ Create sophisticated agents with proper credential assignment
3. ✅ Build complex multi-agent workflows
4. ✅ Monitor and optimize agent performance
5. ✅ Integrate external services via MCP connectors
6. ✅ Use the platform APIs for custom integrations

### Advanced Learning Path

1. **Week 1**: Master basic agent creation and credential management
2. **Week 2**: Explore visual workflow builder and agent chaining
3. **Week 3**: Develop custom MCP connectors and modules
4. **Week 4**: Build production-ready agent applications

### Production Deployment

When ready for production:
1. Configure AWS Parameter Store for credential security
2. Set up monitoring and alerting
3. Implement proper API authentication
4. Configure backup and disaster recovery
5. Scale infrastructure based on usage patterns

---

*This demo guide covers all major platform features. For specific use cases or advanced configurations, refer to the detailed API documentation and module-specific guides.*