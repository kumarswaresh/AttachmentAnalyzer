import { Router } from 'express';
import { requireAuth } from '../../auth';
import { storage } from '../../storage';

export const clientApiKeysRoutes = Router();

/**
 * @swagger
 * /client-api-keys:
 *   get:
 *     summary: Get all client API keys
 *     tags: [API Keys v1]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of client API keys
 */
clientApiKeysRoutes.get('/', requireAuth, async (req, res) => {
  try {
    const apiKeys = await storage.getApiKeys(req.user!.id);
    res.json(apiKeys);
  } catch (error) {
    console.error('Error fetching client API keys:', error);
    res.status(500).json({ message: 'Failed to fetch client API keys' });
  }
});

/**
 * @swagger
 * /client-api-keys:
 *   post:
 *     summary: Create a new client API key
 *     tags: [API Keys v1]
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
 *               provider:
 *                 type: string
 *               keyType:
 *                 type: string
 *               keyValue:
 *                 type: string
 *     responses:
 *       201:
 *         description: API key created successfully
 */
clientApiKeysRoutes.post('/', requireAuth, async (req, res) => {
  try {
    const apiKeyData = req.body;
    const apiKey = await storage.createApiKey({
      ...apiKeyData,
      userId: req.user!.id
    });
    res.status(201).json(apiKey);
  } catch (error) {
    console.error('Error creating client API key:', error);
    res.status(500).json({ message: 'Failed to create client API key' });
  }
});