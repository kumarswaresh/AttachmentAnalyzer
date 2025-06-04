import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import type { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Agent Platform API',
      version: '1.0.0',
      description: 'Comprehensive API documentation for the AI Agent Management Platform',
    },
    servers: [
      {
        url: '/api',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'Token',
          description: 'Enter the session token received from login/register (without "Bearer " prefix)',
        },
        sessionAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'Authorization',
          description: 'Enter "Bearer " followed by your session token',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            username: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string', enum: ['user', 'admin'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Agent: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            goal: { type: 'string' },
            role: { type: 'string' },
            guardrails: { type: 'object' },
            modules: { type: 'object' },
            model: { type: 'string' },
            status: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        AgentMessage: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            fromAgentId: { type: 'string' },
            toAgentId: { type: 'string' },
            messageType: { type: 'string', enum: ['task', 'result', 'error', 'context', 'handoff'] },
            content: { type: 'object' },
            status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] },
            priority: { type: 'number', minimum: 1, maximum: 5 },
            timestamp: { type: 'string', format: 'date-time' },
            processedAt: { type: 'string', format: 'date-time' },
          },
        },
        AgentChain: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  agentId: { type: 'string' },
                  condition: { type: 'string' },
                  inputMapping: { type: 'object' },
                  outputMapping: { type: 'object' },
                  timeout: { type: 'number' },
                  retryCount: { type: 'number' },
                },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
            isActive: { type: 'boolean' },
          },
        },
        ChainExecution: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            chainId: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed', 'cancelled'] },
            currentStep: { type: 'number' },
            input: { type: 'object' },
            output: { type: 'object' },
            startedAt: { type: 'string', format: 'date-time' },
            endedAt: { type: 'string', format: 'date-time' },
          },
        },
        ChatMessage: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            sessionId: { type: 'string' },
            role: { type: 'string', enum: ['user', 'assistant', 'system'] },
            content: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            metadata: { type: 'object' },
          },
        },
        ApiKey: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            provider: { type: 'string' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        CustomModel: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            provider: { type: 'string' },
            modelId: { type: 'string' },
            endpoint: { type: 'string' },
            maxTokens: { type: 'integer' },
            contextLength: { type: 'integer' },
            capabilities: { type: 'array', items: { type: 'string' } },
          },
        },
        MarketingRecommendation: {
          type: 'object',
          properties: {
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  category: { type: 'string' },
                  destination: { type: 'string' },
                  trending: { type: 'boolean' },
                  popularity: { type: 'integer' },
                  reason: { type: 'string' },
                },
              },
            },
            trends: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  destination: { type: 'string' },
                  popularity: { type: 'integer' },
                  season: { type: 'string' },
                  trend: { type: 'string' },
                },
              },
            },
            insights: { type: 'string' },
            totalHotels: { type: 'integer' },
          },
        },
        DefaultPromptTest: {
          type: 'object',
          properties: {
            agentId: { type: 'string' },
            promptType: { type: 'string', enum: ['default', 'custom'] },
            prompt: { type: 'string' },
            expectedOutput: { type: 'string' },
            actualOutput: { type: 'string' },
            success: { type: 'boolean' },
            executionTime: { type: 'integer' },
          },
        },
        Credential: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            provider: { type: 'string' },
            category: { type: 'string' },
            keyType: { type: 'string' },
            description: { type: 'string' },
            isRequired: { type: 'boolean' },
            isConfigured: { type: 'boolean' },
            useAwsParameterStore: { type: 'boolean' },
            awsParameterPath: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Deployment: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            type: { type: 'string', enum: ['agent', 'agent_app'] },
            agentId: { type: 'string' },
            agentAppId: { type: 'string' },
            accessKey: { type: 'string' },
            version: { type: 'string' },
            environment: { type: 'string', enum: ['development', 'staging', 'production'] },
            deploymentType: { type: 'string', enum: ['standalone', 'embedded', 'api_only'] },
            configuration: { type: 'object' },
            credentialRequirements: { type: 'array', items: { type: 'object' } },
            endpoints: { type: 'object' },
            allowedOrigins: { type: 'array', items: { type: 'string' } },
            rateLimit: { type: 'object' },
            status: { type: 'string', enum: ['active', 'inactive', 'suspended'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        AgentApp: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            icon: { type: 'string' },
            workflow: { type: 'object' },
            configuration: { type: 'object' },
            guardrails: { type: 'array', items: { type: 'object' } },
            isActive: { type: 'boolean' },
            createdBy: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        DemoAgent: {
          type: 'object',
          properties: {
            agentId: { type: 'string' },
            name: { type: 'string' },
            goal: { type: 'string' },
            role: { type: 'string' },
            status: { type: 'string' },
            testResults: { type: 'array', items: { type: 'object' } },
            recommendations: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
    security: [
      {
        sessionAuth: [],
      },
    ],
  },
  apis: ['./server/routes.ts', './server/swagger.ts'],
};

const specs = swaggerJSDoc(options);

export function setupSwagger(app: Express) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Agent Platform API Documentation',
  }));
}

/**
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: User authentication and session management
 *   - name: Agents
 *     description: AI agent management and operations
 *   - name: Chat
 *     description: Chat sessions and messaging with agents
 *   - name: Marketing Agent
 *     description: Specialized marketing agent for hotel recommendations
 *   - name: API Management
 *     description: API key and external service management
 *   - name: Custom Models
 *     description: Custom AI model configuration and management
 *   - name: Module Library
 *     description: Agent modules and extensions
 *   - name: MCP Protocol
 *     description: Model Context Protocol integration and testing
 *   - name: Agent Communication
 *     description: Agent-to-agent messaging and chaining
 *   - name: Agent Testing
 *     description: Agent prompt testing and validation
 *   - name: Backup & Restore
 *     description: Platform backup and restore operations with duplicate handling
 *   - name: Monitoring
 *     description: System monitoring and analytics
 *   - name: Deployments
 *     description: Independent agent and agent app deployment with centralized credentials
 *   - name: Deployed Services
 *     description: Execution of deployed agents and agent apps
 *   - name: Credentials
 *     description: Multi-credential management with encryption and AWS Parameter Store
 *   - name: Demo Workflow
 *     description: Interactive demo creation and testing workflow
 *   - name: Agent Apps
 *     description: Multi-agent workflow management and execution
 *   - name: Enhanced Features
 *     description: Advanced platform features and integrations
 */

/**
 * @swagger
 * /agent-messages:
 *   get:
 *     summary: Get all agent messages
 *     tags: [Agent Communication]
 *     responses:
 *       200:
 *         description: List of agent messages
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AgentMessage'
 *   post:
 *     summary: Send message between agents
 *     tags: [Agent Communication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fromAgentId:
 *                 type: string
 *               toAgentId:
 *                 type: string
 *               messageType:
 *                 type: string
 *                 enum: [task, result, error, context, handoff]
 *               content:
 *                 type: object
 *               priority:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *     responses:
 *       201:
 *         description: Message sent successfully
 *
 * /agent-chains:
 *   get:
 *     summary: Get all agent chains
 *     tags: [Agent Communication]
 *     responses:
 *       200:
 *         description: List of agent chains
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AgentChain'
 *   post:
 *     summary: Create new agent chain
 *     tags: [Agent Communication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AgentChain'
 *     responses:
 *       201:
 *         description: Chain created successfully
 *
 * /agent-chains/{chainId}/execute:
 *   post:
 *     summary: Execute agent chain
 *     tags: [Agent Communication]
 *     parameters:
 *       - in: path
 *         name: chainId
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               input:
 *                 type: object
 *     responses:
 *       200:
 *         description: Chain execution started
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChainExecution'
 *
 * /auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 sessionToken:
 *                   type: string
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: User login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [usernameOrEmail, password]
 *             properties:
 *               usernameOrEmail:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 sessionToken:
 *                   type: string
 *                   description: Use this token in the Authorization header as "Bearer <token>"
 */

/**
 * @swagger
 * /auth/status:
 *   get:
 *     tags: [Authentication]
 *     summary: Check authentication status
 *     parameters:
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *         description: Optional session token for testing
 *     responses:
 *       200:
 *         description: Authentication status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authenticated:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /agents:
 *   get:
 *     tags: [Agents]
 *     summary: Get all agents
 *     responses:
 *       200:
 *         description: List of agents
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Agent'
 *   post:
 *     tags: [Agents]
 *     summary: Create a new agent
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, goal, role, model]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Marketing Assistant"
 *               goal:
 *                 type: string
 *                 example: "Provide personalized hotel recommendations"
 *               role:
 *                 type: string
 *                 example: "marketing_specialist"
 *               model:
 *                 type: string
 *                 example: "gpt-4o"
 *               guardrails:
 *                 type: object
 *               modules:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Agent created successfully
 */

/**
 * @swagger
 * /agents/{id}:
 *   get:
 *     tags: [Agents]
 *     summary: Get agent by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Agent details
 *   put:
 *     tags: [Agents]
 *     summary: Update agent
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Agent updated successfully
 *   delete:
 *     tags: [Agents]
 *     summary: Delete agent
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Agent deleted successfully
 */

/**
 * @swagger
 * /agents/{id}/test:
 *   post:
 *     tags: [Agent Testing]
 *     summary: Test agent with default or custom prompts
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               testType:
 *                 type: string
 *                 enum: [default, custom]
 *                 example: "default"
 *               prompt:
 *                 type: string
 *                 example: "Recommend a luxury hotel in Paris for a business trip"
 *               expectedOutput:
 *                 type: string
 *                 example: "Should recommend high-end business hotels in Paris"
 *     responses:
 *       200:
 *         description: Test results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DefaultPromptTest'
 */

/**
 * @swagger
 * /agents/{id}/chat:
 *   post:
 *     tags: [Chat]
 *     summary: Send message to agent
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message:
 *                 type: string
 *                 example: "I need a hotel recommendation for my vacation"
 *               sessionId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Agent response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 response:
 *                   type: string
 *                 sessionId:
 *                   type: string
 */

/**
 * @swagger
 * /marketing/trends:
 *   get:
 *     tags: [Marketing Agent]
 *     summary: Get Google Trends data for destinations
 *     parameters:
 *       - in: query
 *         name: destination
 *         schema:
 *           type: string
 *         description: Specific destination to get trends for
 *         example: "paris"
 *     responses:
 *       200:
 *         description: Trends data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   destination:
 *                     type: string
 *                   popularity:
 *                     type: integer
 *                   season:
 *                     type: string
 *                   trend:
 *                     type: string
 */

/**
 * @swagger
 * /marketing/hotels:
 *   get:
 *     tags: [Marketing Agent]
 *     summary: Get hotels by category
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [luxury, business, budget, resort, boutique]
 *         description: Hotel category filter
 *         example: "luxury"
 *     responses:
 *       200:
 *         description: Hotel list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 */

/**
 * @swagger
 * /marketing/summary:
 *   get:
 *     tags: [Marketing Agent]
 *     summary: Get hotel categories summary
 *     responses:
 *       200:
 *         description: Hotel summary data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: string
 *                 totalHotels:
 *                   type: integer
 *                 hotelsByCategory:
 *                   type: object
 */

/**
 * @swagger
 * /marketing/recommend:
 *   post:
 *     tags: [Marketing Agent]
 *     summary: Get personalized hotel recommendations
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [query]
 *             properties:
 *               query:
 *                 type: string
 *                 example: "I need a luxury hotel in Paris for my honeymoon"
 *               preferences:
 *                 type: object
 *                 properties:
 *                   budget:
 *                     type: string
 *                     enum: [luxury, business, budget, resort, boutique]
 *                   destination:
 *                     type: string
 *                   season:
 *                     type: string
 *                   travelers:
 *                     type: integer
 *     responses:
 *       200:
 *         description: Personalized recommendations
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MarketingRecommendation'
 */

/**
 * @swagger
 * /api-keys:
 *   get:
 *     tags: [API Management]
 *     summary: Get all API keys
 *     responses:
 *       200:
 *         description: List of API keys
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ApiKey'
 *   post:
 *     tags: [API Management]
 *     summary: Create new API key
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, provider, keyValue]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "OpenAI Production Key"
 *               provider:
 *                 type: string
 *                 example: "openai"
 *               keyValue:
 *                 type: string
 *                 example: "sk-..."
 *     responses:
 *       201:
 *         description: API key created successfully
 */

/**
 * @swagger
 * /custom-models:
 *   get:
 *     tags: [Custom Models]
 *     summary: Get all custom models
 *     responses:
 *       200:
 *         description: List of custom models
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CustomModel'
 *   post:
 *     tags: [Custom Models]
 *     summary: Register new custom model
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, provider, modelId]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Custom GPT Model"
 *               provider:
 *                 type: string
 *                 example: "openai"
 *               modelId:
 *                 type: string
 *                 example: "gpt-4-custom"
 *               endpoint:
 *                 type: string
 *               maxTokens:
 *                 type: integer
 *               contextLength:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Custom model registered successfully
 */

/**
 * @swagger
 * /modules:
 *   get:
 *     tags: [Module Library]
 *     summary: Get available modules
 *     responses:
 *       200:
 *         description: List of available modules
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   version:
 *                     type: string
 *                   capabilities:
 *                     type: array
 *                     items:
 *                       type: string
 */

/**
 * @swagger
 * /mcp/servers:
 *   get:
 *     tags: [MCP Protocol]
 *     summary: Get available MCP servers
 *     responses:
 *       200:
 *         description: List of MCP servers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   status:
 *                     type: string
 *                   capabilities:
 *                     type: array
 *                     items:
 *                       type: string
 */

/**
 * @swagger
 * /mcp/test-connection:
 *   post:
 *     tags: [MCP Protocol]
 *     summary: Test MCP server connection
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [serverId]
 *             properties:
 *               serverId:
 *                 type: string
 *                 example: "hotel-analytics"
 *               endpoint:
 *                 type: string
 *     responses:
 *       200:
 *         description: Connection test results
 */

/**
 * @swagger
 * /monitoring/stats:
 *   get:
 *     tags: [Monitoring]
 *     summary: Get system statistics
 *     responses:
 *       200:
 *         description: System statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalAgents:
 *                   type: string
 *                 totalSessions:
 *                   type: string
 *                 totalMessages:
 *                   type: string
 *                 systemHealth:
 *                   type: string
 */

/**
 * @swagger
 * /agents/{id}/download:
 *   get:
 *     tags: [Agents]
 *     summary: Download agent configuration as JSON
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent ID
 *     responses:
 *       200:
 *         description: Agent configuration download
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 type:
 *                   type: string
 *                   example: "agent"
 *                 version:
 *                   type: string
 *                   example: "1.0"
 *                 exportedAt:
 *                   type: string
 *                   format: date-time
 *                 data:
 *                   $ref: '#/components/schemas/Agent'
 */

/**
 * @swagger
 * /agents/upload:
 *   post:
 *     tags: [Agents]
 *     summary: Upload agent configuration from JSON
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     example: "agent"
 *                   data:
 *                     $ref: '#/components/schemas/Agent'
 *               preserveId:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to preserve the original ID
 *               duplicateAction:
 *                 type: string
 *                 enum: [skip, rename, overwrite]
 *                 default: rename
 *                 description: How to handle duplicate names
 *     responses:
 *       201:
 *         description: Agent uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 agent:
 *                   $ref: '#/components/schemas/Agent'
 *                 action:
 *                   type: string
 *                   enum: [created, skip, rename, overwrite]
 *                 originalName:
 *                   type: string
 */

/**
 * @swagger
 * /custom-models/{id}/download:
 *   get:
 *     tags: [Custom Models]
 *     summary: Download custom model configuration as JSON
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Custom model ID
 *     responses:
 *       200:
 *         description: Custom model configuration download
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 type:
 *                   type: string
 *                   example: "custom-model"
 *                 version:
 *                   type: string
 *                   example: "1.0"
 *                 exportedAt:
 *                   type: string
 *                   format: date-time
 *                 data:
 *                   $ref: '#/components/schemas/CustomModel'
 */

/**
 * @swagger
 * /custom-models/upload:
 *   post:
 *     tags: [Custom Models]
 *     summary: Upload custom model configuration from JSON
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     example: "custom-model"
 *                   data:
 *                     $ref: '#/components/schemas/CustomModel'
 *               preserveId:
 *                 type: boolean
 *                 default: false
 *               duplicateAction:
 *                 type: string
 *                 enum: [skip, rename, overwrite]
 *                 default: rename
 *     responses:
 *       201:
 *         description: Custom model uploaded successfully
 */

/**
 * @swagger
 * /modules/{id}/download:
 *   get:
 *     tags: [Modules]
 *     summary: Download module configuration as JSON
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Module ID
 *     responses:
 *       200:
 *         description: Module configuration download
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 type:
 *                   type: string
 *                   example: "module"
 *                 version:
 *                   type: string
 *                   example: "1.0"
 *                 exportedAt:
 *                   type: string
 *                   format: date-time
 *                 data:
 *                   type: object
 */

/**
 * @swagger
 * /modules/upload:
 *   post:
 *     tags: [Modules]
 *     summary: Upload module configuration from JSON
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     example: "module"
 *                   data:
 *                     type: object
 *               preserveId:
 *                 type: boolean
 *                 default: false
 *               duplicateAction:
 *                 type: string
 *                 enum: [skip, rename, overwrite]
 *                 default: rename
 *     responses:
 *       201:
 *         description: Module uploaded successfully
 */

/**
 * @swagger
 * /mcp/servers/{id}/download:
 *   get:
 *     tags: [MCP Protocol]
 *     summary: Download MCP server configuration as JSON
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MCP server ID
 *     responses:
 *       200:
 *         description: MCP server configuration download
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 type:
 *                   type: string
 *                   example: "mcp-server"
 *                 version:
 *                   type: string
 *                   example: "1.0"
 *                 exportedAt:
 *                   type: string
 *                   format: date-time
 *                 data:
 *                   type: object
 */

/**
 * @swagger
 * /mcp/servers/upload:
 *   post:
 *     tags: [MCP Protocol]
 *     summary: Upload MCP server configuration from JSON
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     example: "mcp-server"
 *                   data:
 *                     type: object
 *               preserveId:
 *                 type: boolean
 *                 default: false
 *               duplicateAction:
 *                 type: string
 *                 enum: [skip, rename, overwrite]
 *                 default: rename
 *     responses:
 *       201:
 *         description: MCP server uploaded successfully
 */

/**
 * @swagger
 * /backup/all:
 *   get:
 *     tags: [Backup & Restore]
 *     summary: Download complete platform backup
 *     responses:
 *       200:
 *         description: Complete platform backup as JSON file
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 type:
 *                   type: string
 *                   example: "full-platform-backup"
 *                 version:
 *                   type: string
 *                   example: "1.0"
 *                 exportedAt:
 *                   type: string
 *                   format: date-time
 *                 data:
 *                   type: object
 *                   properties:
 *                     agents:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Agent'
 *                     customModels:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CustomModel'
 *                     modules:
 *                       type: array
 *                       items:
 *                         type: object
 *                     mcpServers:
 *                       type: array
 *                       items:
 *                         type: object
 */

/**
 * @swagger
 * /backup/restore:
 *   post:
 *     tags: [Backup & Restore]
 *     summary: Restore from complete platform backup
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     example: "full-platform-backup"
 *                   data:
 *                     type: object
 *               preserveIds:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to preserve original IDs
 *               duplicateAction:
 *                 type: string
 *                 enum: [skip, rename, overwrite]
 *                 default: rename
 *                 description: How to handle duplicate names during restore
 *     responses:
 *       200:
 *         description: Platform restore completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 duplicateAction:
 *                   type: string
 *                 detailed:
 *                   type: object
 *                   properties:
 *                     agents:
 *                       type: object
 *                       properties:
 *                         created:
 *                           type: integer
 *                         skipped:
 *                           type: integer
 *                         renamed:
 *                           type: integer
 *                     customModels:
 *                       type: object
 *                       properties:
 *                         created:
 *                           type: integer
 *                         skipped:
 *                           type: integer
 *                         renamed:
 *                           type: integer
 *                     modules:
 *                       type: object
 *                       properties:
 *                         created:
 *                           type: integer
 *                         skipped:
 *                           type: integer
 *                         renamed:
 *                           type: integer
 *                     mcpServers:
 *                       type: object
 *                       properties:
 *                         created:
 *                           type: integer
 *                         skipped:
 *                           type: integer
 *                         renamed:
 *                           type: integer
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: object
 *                       properties:
 *                         created:
 *                           type: integer
 *                         skipped:
 *                           type: integer
 *                         renamed:
 *                           type: integer
 */

export { specs };