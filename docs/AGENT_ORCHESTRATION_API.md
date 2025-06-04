# AI Agent Orchestration API Documentation

## Overview
Multi-agent orchestration system with dynamic module integration, real-time monitoring, and cross-agent communication capabilities.

## Agent Management Endpoints

### Get All Agents
```http
GET /api/agents
```

**Query Parameters:**
- `category` (optional): Filter by agent category (technology, healthcare, finance, education, marketing)
- `status` (optional): Filter by status (active, inactive, deploying, error)
- `organizationId` (optional): Filter by organization

**Response:**
```json
[
  {
    "id": "agent_123",
    "name": "Marketing Intelligence Agent",
    "category": "marketing",
    "description": "AI agent specialized in marketing analytics and campaign optimization",
    "status": "active",
    "version": "1.2.0",
    "createdAt": "2025-06-01T10:00:00.000Z",
    "lastDeployment": "2025-06-04T08:30:00.000Z",
    "organizationId": 1,
    "configuration": {
      "model": "gpt-4o",
      "temperature": 0.7,
      "maxTokens": 2048
    },
    "metrics": {
      "totalRequests": 1250,
      "successRate": 98.4,
      "averageResponseTime": 1.2,
      "errorCount": 20
    }
  }
]
```

### Get Agent by ID
```http
GET /api/agents/:id
```

**Response:**
```json
{
  "id": "agent_123",
  "name": "Marketing Intelligence Agent",
  "category": "marketing",
  "description": "AI agent specialized in marketing analytics",
  "status": "active",
  "configuration": {
    "role": "Marketing Intelligence Specialist",
    "goal": "Optimize marketing campaigns and analyze customer behavior",
    "guardrails": {
      "requireHumanApproval": false,
      "contentFiltering": true,
      "budgetLimit": 5000
    },
    "modules": [
      {
        "name": "analytics_module",
        "version": "2.1.0",
        "enabled": true
      },
      {
        "name": "campaign_optimizer",
        "version": "1.5.0",
        "enabled": true
      }
    ]
  },
  "deployments": [
    {
      "id": "deploy_456",
      "environment": "production",
      "status": "running",
      "deployedAt": "2025-06-04T08:30:00.000Z"
    }
  ]
}
```

### Create Agent
```http
POST /api/agents
```

**Request Body:**
```json
{
  "name": "Customer Service Agent",
  "category": "technology",
  "description": "AI agent for automated customer support",
  "template": "customer_service_template",
  "configuration": {
    "role": "Customer Service Representative",
    "goal": "Provide helpful and accurate customer support",
    "model": "gpt-4o",
    "temperature": 0.3,
    "guardrails": {
      "requireHumanApproval": true,
      "contentFiltering": true,
      "escalationThreshold": 0.8
    }
  }
}
```

### Update Agent
```http
PUT /api/agents/:id
```

**Request Body:**
```json
{
  "name": "Updated Agent Name",
  "description": "Updated description",
  "configuration": {
    "temperature": 0.5,
    "maxTokens": 4096
  }
}
```

### Delete Agent
```http
DELETE /api/agents/:id
```

## Agent Templates

### Get Agent Templates
```http
GET /api/agent-templates
```

**Query Parameters:**
- `category` (optional): Filter by category

**Response:**
```json
[
  {
    "id": "marketing_email_template",
    "name": "Email Marketing Agent",
    "category": "marketing",
    "description": "Automated email campaign management and optimization",
    "configuration": {
      "role": "Email Marketing Specialist",
      "goal": "Create and optimize email marketing campaigns",
      "modules": ["email_composer", "analytics_tracker", "a_b_tester"],
      "guardrails": {
        "requireHumanApproval": true,
        "contentFiltering": true
      }
    }
  }
]
```

### Get Template by Category
```http
GET /api/agent-templates/category/:category
```

**Available Categories:**
- `technology`: IT automation, development, and technical support agents
- `healthcare`: Medical research, patient care, and healthcare analytics
- `finance`: Financial analysis, risk assessment, and trading agents
- `education`: Learning management, tutoring, and educational content
- `marketing`: Campaign management, analytics, and customer engagement

## Agent Deployment

### Deploy Agent
```http
POST /api/agents/:id/deploy
```

**Request Body:**
```json
{
  "environment": "production",
  "configuration": {
    "replicas": 3,
    "resources": {
      "cpu": "1000m",
      "memory": "2Gi"
    },
    "scaling": {
      "minReplicas": 1,
      "maxReplicas": 10,
      "targetCPUUtilization": 70
    }
  }
}
```

**Response:**
```json
{
  "deploymentId": "deploy_789",
  "status": "deploying",
  "environment": "production",
  "estimatedCompletionTime": "2025-06-04T12:35:00.000Z"
}
```

### Get Deployment Status
```http
GET /api/deployments/:deploymentId
```

**Response:**
```json
{
  "id": "deploy_789",
  "agentId": "agent_123",
  "status": "running",
  "environment": "production",
  "deployedAt": "2025-06-04T12:30:00.000Z",
  "configuration": {
    "replicas": 3,
    "currentReplicas": 3
  },
  "health": {
    "status": "healthy",
    "uptime": "4h 30m",
    "lastHealthCheck": "2025-06-04T17:00:00.000Z"
  }
}
```

### Stop Deployment
```http
POST /api/deployments/:deploymentId/stop
```

### Scale Deployment
```http
POST /api/deployments/:deploymentId/scale
```

**Request Body:**
```json
{
  "replicas": 5
}
```

## Agent Communication

### Send Message to Agent
```http
POST /api/agents/:id/message
```

**Request Body:**
```json
{
  "message": "Analyze the latest marketing campaign performance",
  "context": {
    "campaignId": "campaign_456",
    "timeframe": "last_7_days"
  },
  "priority": "high"
}
```

**Response:**
```json
{
  "messageId": "msg_789",
  "status": "processing",
  "estimatedResponseTime": "30s"
}
```

### Get Agent Response
```http
GET /api/agents/:id/messages/:messageId
```

**Response:**
```json
{
  "messageId": "msg_789",
  "status": "completed",
  "response": {
    "content": "Campaign analysis complete. Click-through rate increased by 15% compared to previous week.",
    "data": {
      "metrics": {
        "ctr": 0.15,
        "conversions": 234,
        "revenue": 15670.50
      }
    }
  },
  "processingTime": "2.4s",
  "timestamp": "2025-06-04T17:05:00.000Z"
}
```

## Agent Monitoring

### Get Agent Metrics
```http
GET /api/agents/:id/metrics
```

**Query Parameters:**
- `timeframe`: "1h", "24h", "7d", "30d"
- `metrics`: Comma-separated list of metrics to include

**Response:**
```json
{
  "agentId": "agent_123",
  "timeframe": "24h",
  "metrics": {
    "requests": {
      "total": 1250,
      "successful": 1230,
      "failed": 20,
      "successRate": 98.4
    },
    "performance": {
      "averageResponseTime": 1.2,
      "p95ResponseTime": 3.1,
      "throughput": 52.0
    },
    "resources": {
      "cpuUsage": 45.2,
      "memoryUsage": 68.7,
      "diskUsage": 12.3
    }
  }
}
```

### Get Agent Health
```http
GET /api/agents/:id/health
```

**Response:**
```json
{
  "agentId": "agent_123",
  "status": "healthy",
  "uptime": "4h 30m",
  "lastHealthCheck": "2025-06-04T17:00:00.000Z",
  "healthChecks": [
    {
      "name": "api_endpoint",
      "status": "healthy",
      "latency": 45
    },
    {
      "name": "database_connection",
      "status": "healthy",
      "latency": 12
    }
  ]
}
```

## Agent Workflows

### Create Workflow
```http
POST /api/workflows
```

**Request Body:**
```json
{
  "name": "Marketing Campaign Workflow",
  "description": "Automated marketing campaign creation and optimization",
  "agents": ["agent_123", "agent_456"],
  "flowDefinition": [
    {
      "id": "step_1",
      "type": "agent_task",
      "agentId": "agent_123",
      "task": "analyze_market_trends",
      "config": {
        "timeframe": "30_days"
      }
    },
    {
      "id": "step_2",
      "type": "agent_task",
      "agentId": "agent_456",
      "task": "create_campaign",
      "dependsOn": ["step_1"],
      "config": {
        "budget": 10000
      }
    }
  ]
}
```

### Execute Workflow
```http
POST /api/workflows/:id/execute
```

**Request Body:**
```json
{
  "parameters": {
    "target_audience": "tech_professionals",
    "budget": 15000
  }
}
```

### Get Workflow Status
```http
GET /api/workflows/:id/executions/:executionId
```

**Response:**
```json
{
  "executionId": "exec_789",
  "workflowId": "workflow_123",
  "status": "running",
  "startedAt": "2025-06-04T17:00:00.000Z",
  "steps": [
    {
      "id": "step_1",
      "status": "completed",
      "result": {
        "trends": ["AI adoption", "remote work", "sustainability"]
      }
    },
    {
      "id": "step_2",
      "status": "running",
      "progress": 60
    }
  ]
}
```

## Error Responses

### 400 Bad Request - Invalid Configuration
```json
{
  "error": "Validation Error",
  "message": "Invalid agent configuration",
  "details": {
    "field": "temperature",
    "value": 2.5,
    "constraint": "Must be between 0 and 2"
  }
}
```

### 409 Conflict - Agent Name Exists
```json
{
  "error": "Resource Conflict",
  "message": "Agent with name 'Marketing Agent' already exists"
}
```

### 503 Service Unavailable - Deployment Failed
```json
{
  "error": "Service Unavailable",
  "message": "Agent deployment failed due to resource constraints",
  "retryAfter": 300
}
```