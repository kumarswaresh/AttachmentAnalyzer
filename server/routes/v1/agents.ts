import { Router } from 'express';
import { requireAuth } from '../../auth';
import { storage } from '../../storage';

export const agentsRoutes = Router();

/**
 * @swagger
 * /api/v1/agents:
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
 * /api/v1/agents:
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
 * /api/v1/agents/{id}:
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
 * /api/v1/agents/{id}:
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
 * /api/v1/agents/{id}:
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