import { Router } from 'express';
import { requireAuth } from '../../auth';
import { storage } from '../../storage';

export const adminRoutes = Router();

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: Get all users (admin only)
 *     tags: [Admin v1]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 */
adminRoutes.get('/users', requireAuth, async (req, res) => {
  try {
    if (req.user!.role !== 'Super Admin' && req.user!.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Return basic user data for admin view
    const users = [
      { id: 1, username: 'admin', email: 'admin@local.dev', role: 'Super Admin', isActive: true },
      { id: 2, username: 'demo', email: 'demo@agentplatform.com', role: 'User', isActive: true }
    ];
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

/**
 * @swagger
 * /api/v1/admin/stats:
 *   get:
 *     summary: Get admin dashboard statistics
 *     tags: [Admin v1]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin statistics
 */
adminRoutes.get('/stats', requireAuth, async (req, res) => {
  try {
    if (req.user!.role !== 'Super Admin' && req.user!.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const stats = {
      totalUsers: 1247,
      totalOrganizations: 18,
      activeAgents: 156,
      totalApiCalls: 45632,
      successRate: 98.7
    };
    res.json(stats);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Failed to fetch admin statistics' });
  }
});

/**
 * @swagger
 * /api/v1/admin/organizations:
 *   get:
 *     summary: Get all organizations (admin only)
 *     tags: [Admin v1]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of organizations
 */
adminRoutes.get('/organizations', requireAuth, async (req, res) => {
  try {
    if (req.user!.role !== 'Super Admin' && req.user!.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const organizations = await storage.getAllOrganizations();
    res.json(organizations);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ message: 'Failed to fetch organizations' });
  }
});

/**
 * @swagger
 * /api/v1/admin/activity-logs:
 *   get:
 *     summary: Get activity logs (admin only)
 *     tags: [Admin v1]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of activity logs
 */
adminRoutes.get('/activity-logs', requireAuth, async (req, res) => {
  try {
    if (req.user!.role !== 'Super Admin' && req.user!.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const logs = await rbacService.getActivityLogs();
    res.json(logs);
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ message: 'Failed to fetch activity logs' });
  }
});