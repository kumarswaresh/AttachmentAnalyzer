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
          bearerFormat: 'JWT',
        },
        sessionAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'Authorization',
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
            model: { type: 'string' },
            status: { type: 'string', enum: ['active', 'inactive', 'training'] },
            guardrails: {
              type: 'object',
              properties: {
                requireHumanApproval: { type: 'boolean' },
                contentFiltering: { type: 'boolean' },
                readOnlyMode: { type: 'boolean' },
                maxTokens: { type: 'integer' },
                allowedDomains: { type: 'array', items: { type: 'string' } },
                blockedKeywords: { type: 'array', items: { type: 'string' } },
              },
            },
            modules: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  moduleId: { type: 'string' },
                  version: { type: 'string' },
                  config: { type: 'object' },
                  enabled: { type: 'boolean' },
                },
              },
            },
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
 *   - name: Agent Testing
 *     description: Agent prompt testing and validation
 *   - name: Monitoring
 *     description: System monitoring and analytics
 */

/**
 * @swagger
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

export { specs };