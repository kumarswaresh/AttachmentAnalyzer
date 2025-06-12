import { Router } from 'express';
import { requireAuth } from '../../auth';
import { storage } from '../../storage';
import { LlmRouter } from '../../services/LlmRouter';
import { VectorStore } from '../../services/VectorStore';
import { LoggingModule } from '../../services/LoggingModule';
import crypto from 'crypto';

export const agentsRoutes = Router();

/**
 * @swagger
 * /agents:
 *   get:
 *     summary: Get all agents
 *     tags: [Agents v1]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of agents
 */
agentsRoutes.get('/', requireAuth, async (req, res) => {
  try {
    const agents = await storage.getAgents();
    res.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ message: 'Failed to fetch agents' });
  }
});

/**
 * @swagger
 * /agents:
 *   post:
 *     summary: Create a new agent
 *     tags: [Agents v1]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               capabilities:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Agent created successfully
 */
agentsRoutes.post('/', requireAuth, async (req, res) => {
  try {
    const agentData = req.body;
    const agent = await storage.createAgent({
      ...agentData,
      userId: req.user!.id
    });
    res.status(201).json(agent);
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({ message: 'Failed to create agent' });
  }
});

/**
 * @swagger
 * /agents/{id}:
 *   get:
 *     summary: Get agent by ID
 *     tags: [Agents v1]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Agent details
 */
agentsRoutes.get('/:id', requireAuth, async (req, res) => {
  try {
    const agent = await storage.getAgent(req.params.id);
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    res.json(agent);
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({ message: 'Failed to fetch agent' });
  }
});

/**
 * @swagger
 * /agents/{id}:
 *   put:
 *     summary: Update agent by ID
 *     tags: [Agents v1]
 *     security:
 *       - bearerAuth: []
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
 */
agentsRoutes.put('/:id', requireAuth, async (req, res) => {
  try {
    const agent = await storage.updateAgent(req.params.id, req.body);
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    res.json(agent);
  } catch (error) {
    console.error('Error updating agent:', error);
    res.status(500).json({ message: 'Failed to update agent' });
  }
});

/**
 * @swagger
 * /agents/{id}:
 *   delete:
 *     summary: Delete agent by ID
 *     tags: [Agents v1]
 *     security:
 *       - bearerAuth: []
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
agentsRoutes.delete('/:id', requireAuth, async (req, res) => {
  try {
    const deleted = await storage.deleteAgent(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    res.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    console.error('Error deleting agent:', error);
    res.status(500).json({ message: 'Failed to delete agent' });
  }
});

// Initialize services
const llmRouter = new LlmRouter();
const vectorStore = new VectorStore();
const loggingModule = new LoggingModule();

/**
 * @swagger
 * /agents/{id}/execute:
 *   post:
 *     summary: Execute agent with input
 *     tags: [Agents v1]
 *     security:
 *       - bearerAuth: []
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
 *               input:
 *                 type: string
 *                 description: Input for the agent
 *               parameters:
 *                 type: object
 *                 description: Optional execution parameters
 *     responses:
 *       200:
 *         description: Agent executed successfully
 */
agentsRoutes.post('/:id/execute', requireAuth, async (req, res) => {
  try {
    const agent = await storage.getAgent(req.params.id);
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    const { input, parameters = {} } = req.body;
    const executionId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      console.log('Executing agent with direct OpenAI integration');
      
      let output;
      let fromCache = false;

      // For marketing agents, use direct OpenAI call like the working marketing endpoint
      if (agent.name.toLowerCase().includes('marketing') || input.toLowerCase().includes('hotel')) {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        
        const systemPrompt = `You are a luxury travel specialist AI. Generate authentic hotel recommendations in the exact JSON format:
[{"countryCode":"XX","countryName":"Country","stateCode":"XX","state":"State/Region","cityCode":1,"cityName":"City","code":101,"name":"Hotel Name","rating":4.5,"description":"Detailed description","imageUrl":"https://example.com/images/hotel-name.jpg"}]

Requirements:
- Return only valid JSON array
- Use real hotel names and authentic details
- Include accurate location codes and names
- Rating between 4.0-5.0 for luxury hotels
- Detailed, compelling descriptions
- Proper image URL format`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input }
          ],
          max_tokens: 4000,
          temperature: 0.7,
        });

        output = completion.choices[0]?.message?.content || "No response generated";
      } else {
        // For non-marketing agents, use the LLM router
        output = await llmRouter.executeAgent(agent, input);
      }

      const duration = Date.now() - startTime;

      // Skip CloudWatch logging to avoid timeout issues
      console.log(`Agent execution completed - ID: ${executionId}, Duration: ${duration}ms, FromCache: ${fromCache}`);

      res.json({
        executionId,
        output,
        fromCache,
        duration,
        parameters: parameters
      });

    } catch (executionError) {
      const duration = Date.now() - startTime;
      
      await loggingModule.logExecution(agent.id, executionId, "error", {
        input,
        duration,
        error: executionError instanceof Error ? executionError.message : "Unknown error"
      });

      res.status(500).json({ 
        message: "Agent execution failed",
        executionId,
        error: executionError instanceof Error ? executionError.message : "Unknown error"
      });
    }
  } catch (error) {
    console.error('Error executing agent:', error);
    res.status(500).json({ message: 'Failed to execute agent' });
  }
});

/**
 * @swagger
 * /agents/{id}/invoke:
 *   post:
 *     summary: Invoke agent (alias for execute)
 *     tags: [Agents v1]
 *     security:
 *       - bearerAuth: []
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
 *               input:
 *                 type: string
 *                 description: Input for the agent
 *               parameters:
 *                 type: object
 *                 description: Optional execution parameters
 *     responses:
 *       200:
 *         description: Agent invoked successfully
 */
agentsRoutes.post('/:id/invoke', requireAuth, async (req, res) => {
  try {
    const agent = await storage.getAgent(req.params.id);
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    const { input, parameters = {} } = req.body;
    const executionId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      // Execute agent with LLM directly
      console.log('Executing agent via invoke endpoint');
      const output = await llmRouter.executeAgent(agent, input);
      const duration = Date.now() - startTime;

      // Log execution (non-blocking)
      try {
        await loggingModule.logExecution(agent.id, executionId, "success", {
          input,
          output,
          duration,
          model: agent.model
        });
      } catch (logError) {
        console.log('Logging failed (non-blocking):', logError instanceof Error ? logError.message : 'Unknown error');
      }

      res.json({
        executionId,
        output,
        duration,
        agent: {
          id: agent.id,
          name: agent.name,
          model: agent.model
        }
      });

    } catch (executionError) {
      const duration = Date.now() - startTime;
      
      await loggingModule.logExecution(agent.id, executionId, "error", {
        input,
        duration,
        error: executionError instanceof Error ? executionError.message : "Unknown error"
      });

      res.status(500).json({ 
        message: "Agent invocation failed",
        executionId,
        error: executionError instanceof Error ? executionError.message : "Unknown error"
      });
    }
  } catch (error) {
    console.error('Error invoking agent:', error);
    res.status(500).json({ message: 'Failed to invoke agent' });
  }
});