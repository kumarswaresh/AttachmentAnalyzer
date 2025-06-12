import { Router } from 'express';
import { requireAuth } from '../../auth';
import { storage } from '../../storage';

export const credentialsRoutes = Router();

/**
 * @swagger
 * /credentials:
 *   get:
 *     summary: Get all credentials
 *     tags: [Credentials v1]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of credentials
 */
credentialsRoutes.get('/', requireAuth, async (req, res) => {
  try {
    const credentials = await storage.getApiKeys(req.user!.id);
    res.json(credentials);
  } catch (error) {
    console.error('Error fetching credentials:', error);
    res.status(500).json({ message: 'Failed to fetch credentials' });
  }
});

/**
 * @swagger
 * /credentials/stats:
 *   get:
 *     summary: Get credentials statistics
 *     tags: [Credentials v1]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Credentials statistics
 */
credentialsRoutes.get('/stats', requireAuth, async (req, res) => {
  try {
    const credentials = await storage.getApiKeys(req.user!.id);
    const stats = {
      total: credentials.length,
      configured: credentials.filter(c => c.encryptedKey && c.encryptedKey.length > 0).length,
      unconfigured: credentials.filter(c => !c.encryptedKey || c.encryptedKey.length === 0).length,
      byProvider: credentials.reduce((acc: any, cred) => {
        acc[cred.provider] = (acc[cred.provider] || 0) + 1;
        return acc;
      }, {})
    };
    res.json(stats);
  } catch (error) {
    console.error('Error fetching credentials stats:', error);
    res.status(500).json({ message: 'Failed to fetch credentials stats' });
  }
});

/**
 * @swagger
 * /credentials:
 *   post:
 *     summary: Create a new credential
 *     tags: [Credentials v1]
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
 *         description: Credential created successfully
 */
credentialsRoutes.post('/', requireAuth, async (req, res) => {
  try {
    const credentialData = req.body;
    const credential = await storage.createApiKey({
      ...credentialData,
      userId: req.user!.id
    });
    res.status(201).json(credential);
  } catch (error) {
    console.error('Error creating credential:', error);
    res.status(500).json({ message: 'Failed to create credential' });
  }
});