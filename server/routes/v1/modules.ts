import { Router } from 'express';
import { requireAuth } from '../../auth';
import { storage } from '../../storage';

export const modulesRoutes = Router();

/**
 * @swagger
 * /api/v1/modules:
 *   get:
 *     summary: Get all modules
 *     tags: [Modules v1]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of modules
 */
modulesRoutes.get('/', requireAuth, async (req, res) => {
  try {
    const modules = await storage.getModuleDefinitions();
    res.json(modules);
  } catch (error) {
    console.error('Error fetching modules:', error);
    res.status(500).json({ message: 'Failed to fetch modules' });
  }
});

/**
 * @swagger
 * /api/v1/modules:
 *   post:
 *     summary: Create a new module
 *     tags: [Modules v1]
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
 *         description: Module created successfully
 */
modulesRoutes.post('/', requireAuth, async (req, res) => {
  try {
    res.status(201).json({ message: 'Module creation not yet implemented' });
  } catch (error) {
    console.error('Error creating module:', error);
    res.status(500).json({ message: 'Failed to create module' });
  }
});