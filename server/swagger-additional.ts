/**
 * Additional Swagger documentation for credentials, deployments, and enhanced features
 * This file contains comprehensive API documentation for all implemented endpoints
 */

/**
 * @swagger
 * /credentials/{name}/set:
 *   post:
 *     summary: Set credential value
 *     tags: [Credentials]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Credential name
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [value]
 *             properties:
 *               value:
 *                 type: string
 *                 description: Credential value
 *               useAwsParameterStore:
 *                 type: boolean
 *                 default: false
 *               awsParameterPath:
 *                 type: string
 *                 description: AWS Parameter Store path
 *     responses:
 *       200:
 *         description: Credential updated successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 * 
 * /credentials/{name}:
 *   delete:
 *     summary: Delete credential
 *     tags: [Credentials]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Credential deleted successfully
 * 
 * /credentials/custom:
 *   post:
 *     summary: Create custom credential
 *     tags: [Credentials]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, provider, keyType]
 *             properties:
 *               name:
 *                 type: string
 *               provider:
 *                 type: string
 *               keyType:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               isRequired:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Custom credential created
 * 
 * /credentials/summary:
 *   get:
 *     summary: Get credential summary
 *     tags: [Credentials]
 *     responses:
 *       200:
 *         description: Credential summary statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 configured:
 *                   type: integer
 *                 missing:
 *                   type: integer
 *                 byProvider:
 *                   type: object
 *                 byCategory:
 *                   type: object
 * 
 * /credentials/missing:
 *   get:
 *     summary: Get missing required credentials
 *     tags: [Credentials]
 *     responses:
 *       200:
 *         description: List of missing required credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Credential'
 * 
 * /credentials/aws/test:
 *   get:
 *     summary: Test AWS Parameter Store connection
 *     tags: [Credentials]
 *     responses:
 *       200:
 *         description: AWS connection test result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 connected:
 *                   type: boolean
 * 
 * /agents/{agentId}/credentials:
 *   get:
 *     summary: Get agent credentials
 *     tags: [Credentials]
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Agent credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Credential'
 * 
 * /agents/{agentId}/credentials/{credentialId}:
 *   delete:
 *     summary: Remove credential from agent
 *     tags: [Credentials]
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: credentialId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Credential removed successfully
 * 
 * /deployed/agents/{agentId}/execute:
 *   post:
 *     summary: Execute deployed agent
 *     tags: [Deployed Services]
 *     security:
 *       - accessKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [input]
 *             properties:
 *               input:
 *                 type: object
 *                 description: Agent input data
 *     responses:
 *       200:
 *         description: Agent execution result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 result:
 *                   type: object
 *                 executionTime:
 *                   type: number
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized - invalid access key
 * 
 * /deployed/agent-apps/{appId}/execute:
 *   post:
 *     summary: Execute deployed agent app
 *     tags: [Deployed Services]
 *     security:
 *       - accessKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: appId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [input]
 *             properties:
 *               input:
 *                 type: object
 *     responses:
 *       200:
 *         description: Agent app execution result
 * 
 * /deployed/credentials:
 *   get:
 *     summary: Get credentials for deployed service
 *     tags: [Deployed Services]
 *     security:
 *       - accessKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: provider
 *         schema:
 *           type: string
 *         description: Provider name
 *     responses:
 *       200:
 *         description: Credential value for deployment
 * 
 * /agent-apps:
 *   get:
 *     summary: Get all agent apps
 *     tags: [Agent Apps]
 *     responses:
 *       200:
 *         description: List of agent apps
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AgentApp'
 *   post:
 *     summary: Create new agent app
 *     tags: [Agent Apps]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, workflow]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               workflow:
 *                 type: object
 *               configuration:
 *                 type: object
 *               guardrails:
 *                 type: array
 *     responses:
 *       201:
 *         description: Agent app created successfully
 * 
 * /agent-apps/{id}:
 *   get:
 *     summary: Get agent app by ID
 *     tags: [Agent Apps]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Agent app details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AgentApp'
 *   put:
 *     summary: Update agent app
 *     tags: [Agent Apps]
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
 *         description: Agent app updated successfully
 *   delete:
 *     summary: Delete agent app
 *     tags: [Agent Apps]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Agent app deleted successfully
 * 
 * /agent-apps/{id}/execute:
 *   post:
 *     summary: Execute agent app workflow
 *     tags: [Agent Apps]
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
 *             required: [input]
 *             properties:
 *               input:
 *                 type: object
 *     responses:
 *       200:
 *         description: Workflow execution result
 * 
 * /demo/agents:
 *   get:
 *     summary: Get demo agents
 *     tags: [Demo Workflow]
 *     responses:
 *       200:
 *         description: List of demo agents
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DemoAgent'
 *   post:
 *     summary: Create demo agent
 *     tags: [Demo Workflow]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, goal, role]
 *             properties:
 *               name:
 *                 type: string
 *               goal:
 *                 type: string
 *               role:
 *                 type: string
 *               model:
 *                 type: string
 *     responses:
 *       201:
 *         description: Demo agent created
 * 
 * /demo/agents/{id}/test:
 *   post:
 *     summary: Test demo agent
 *     tags: [Demo Workflow]
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
 *               prompt:
 *                 type: string
 *     responses:
 *       200:
 *         description: Test results
 * 
 * /demo/workflow/start:
 *   post:
 *     summary: Start demo workflow
 *     tags: [Demo Workflow]
 *     responses:
 *       200:
 *         description: Demo workflow started
 * 
 * /mcp/test:
 *   post:
 *     summary: Test MCP integration
 *     tags: [Enhanced Features]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               operation:
 *                 type: string
 *               params:
 *                 type: object
 *     responses:
 *       200:
 *         description: MCP test result
 * 
 * /health/detailed:
 *   get:
 *     summary: Get detailed health status
 *     tags: [Enhanced Features]
 *     responses:
 *       200:
 *         description: Detailed system health
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 services:
 *                   type: object
 *                 timestamp:
 *                   type: string
 * 
 * /monitoring/stats:
 *   get:
 *     summary: Get monitoring statistics
 *     tags: [Enhanced Features]
 *     responses:
 *       200:
 *         description: System monitoring stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalAgents:
 *                   type: string
 *                 totalSessions:
 *                   type: string
 *                 activeDeployments:
 *                   type: string
 */

export const additionalSwaggerDocs = {
  // This file provides comprehensive documentation for all implemented APIs
  // The documentation is automatically included in the main Swagger setup
};