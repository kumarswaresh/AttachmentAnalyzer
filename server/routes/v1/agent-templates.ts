import { Router } from 'express';
import { requireAuth } from '../../auth';
import { storage } from '../../storage';

export const agentTemplatesRoutes = Router();

/**
 * @swagger
 * /agent-templates:
 *   get:
 *     summary: Get all agent templates
 *     tags: [Agent Templates v1]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of agent templates
 */
agentTemplatesRoutes.get('/', requireAuth, async (req, res) => {
  try {
    const templates = await storage.getAgentTemplates(req.user!.id);
    res.json(templates);
  } catch (error) {
    console.error('Error fetching agent templates:', error);
    res.status(500).json({ message: 'Failed to fetch agent templates' });
  }
});

/**
 * @swagger
 * /agent-templates:
 *   post:
 *     summary: Create a new agent template
 *     tags: [Agent Templates v1]
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
 *         description: Agent template created successfully
 */
agentTemplatesRoutes.post('/', requireAuth, async (req, res) => {
  try {
    const templateData = req.body;
    const template = await storage.createAgentTemplate({
      ...templateData,
      userId: req.user!.id
    });
    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating agent template:', error);
    res.status(500).json({ message: 'Failed to create agent template' });
  }
});