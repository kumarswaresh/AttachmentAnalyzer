import { Router } from 'express';
import { requireAuth } from '../../auth';
import { storage } from '../../storage';

export const customModelsRoutes = Router();

/**
 * @swagger
 * /api/v1/custom-models:
 *   get:
 *     summary: Get all custom models
 *     tags: [Custom Models v1]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of custom models
 */
customModelsRoutes.get('/', requireAuth, async (req, res) => {
  try {
    const customModels = await storage.getCustomModels(req.user!.id);
    res.json(customModels);
  } catch (error) {
    console.error('Error fetching custom models:', error);
    res.status(500).json({ message: 'Failed to fetch custom models' });
  }
});

/**
 * @swagger
 * /api/v1/custom-models:
 *   post:
 *     summary: Create a new custom model
 *     tags: [Custom Models v1]
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
 *         description: Custom model created successfully
 */
customModelsRoutes.post('/', requireAuth, async (req, res) => {
  try {
    const modelData = req.body;
    const customModel = await storage.createCustomModel({
      ...modelData,
      userId: req.user!.id
    });
    res.status(201).json(customModel);
  } catch (error) {
    console.error('Error creating custom model:', error);
    res.status(500).json({ message: 'Failed to create custom model' });
  }
});