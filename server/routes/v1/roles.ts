import { Router } from 'express';
import { requireAuth } from '../../auth';
import { storage } from '../../storage';

export const rolesRoutes = Router();

/**
 * @swagger
 * /roles:
 *   get:
 *     summary: Get all roles
 *     tags: [Roles v1]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of roles
 */
rolesRoutes.get('/', requireAuth, async (req, res) => {
  try {
    // For now, return standard roles - this can be expanded to database storage later
    const roles = [
      { id: 1, name: 'Super Admin', description: 'Full system access' },
      { id: 2, name: 'Admin', description: 'Administrative access' },
      { id: 3, name: 'Manager', description: 'Management access' },
      { id: 4, name: 'User', description: 'Standard user access' },
      { id: 5, name: 'Guest', description: 'Limited access' }
    ];
    res.json(roles);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ message: 'Failed to fetch roles' });
  }
});

/**
 * @swagger
 * /roles:
 *   post:
 *     summary: Create a new role
 *     tags: [Roles v1]
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
 *     responses:
 *       201:
 *         description: Role created successfully
 */
rolesRoutes.post('/', requireAuth, async (req, res) => {
  try {
    if (req.user!.role !== 'Super Admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { name, description } = req.body;
    const role = {
      id: Date.now(),
      name,
      description,
      createdAt: new Date().toISOString()
    };
    
    res.status(201).json(role);
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ message: 'Failed to create role' });
  }
});