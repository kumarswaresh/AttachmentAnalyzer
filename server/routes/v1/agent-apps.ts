import { Router } from 'express';
import { requireAuth } from '../../auth';
import { storage } from '../../storage';

export const agentAppsRoutes = Router();

/**
 * @swagger
 * /agent-apps:
 *   get:
 *     summary: Get all agent apps
 *     tags: [Agent Apps v1]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of agent apps
 */
agentAppsRoutes.get('/', requireAuth, async (req, res) => {
  try {
    const agentApps = await storage.getAgentApps();
    res.json(agentApps);
  } catch (error) {
    console.error('Error fetching agent apps:', error);
    res.status(500).json({ message: 'Failed to fetch agent apps' });
  }
});

/**
 * @swagger
 * /agent-apps:
 *   post:
 *     summary: Create a new agent app
 *     tags: [Agent Apps v1]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Agent app created successfully
 */
agentAppsRoutes.post('/', requireAuth, async (req, res) => {
  try {
    const agentAppData = req.body;
    const agentApp = await storage.createAgentApp({
      ...agentAppData,
      userId: req.user!.id
    });
    res.status(201).json(agentApp);
  } catch (error) {
    console.error('Error creating agent app:', error);
    res.status(500).json({ message: 'Failed to create agent app' });
  }
});