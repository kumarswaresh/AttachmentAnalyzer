import { Router } from 'express';
import { authService } from '../../auth';
import { z } from 'zod';

export const authRoutes = Router();

// Health check endpoint for testing
authRoutes.get('/health', (req, res) => {
  res.json({
    success: true,
    version: 'v1',
    service: 'auth',
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication v1]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - usernameOrEmail
 *               - password
 *             properties:
 *               usernameOrEmail:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   type: object
 *                 sessionToken:
 *                   type: string
 */
authRoutes.post('/login', async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;
    
    if (!usernameOrEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username/email and password are required'
      });
    }

    const result = await authService.login(usernameOrEmail, password);
    
    if (result.success && result.user && result.sessionToken) {
      res.json({
        success: true,
        user: result.user,
        sessionToken: result.sessionToken
      });
    } else {
      res.status(401).json({
        success: false,
        message: result.message || 'Invalid credentials'
      });
    }
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: User registration
 *     tags: [Authentication v1]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Registration successful
 */
authRoutes.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, and password are required'
      });
    }

    const result = await authService.register(username, email, password);
    
    if (result.success && result.user && result.sessionToken) {
      res.status(201).json({
        success: true,
        user: result.user,
        sessionToken: result.sessionToken
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'Registration failed'
      });
    }
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: User logout
 *     tags: [Authentication v1]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
authRoutes.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const sessionToken = authHeader.substring(7);
      await authService.logout(sessionToken);
    }
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/v1/auth/status:
 *   get:
 *     summary: Check authentication status
 *     tags: [Authentication v1]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authentication status
 */
authRoutes.get('/status', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: 'No authentication token provided'
      });
    }

    const sessionToken = authHeader.substring(7);
    const user = await authService.validateSession(sessionToken);
    
    if (user) {
      res.json({
        success: true,
        authenticated: true,
        user: user
      });
    } else {
      res.status(401).json({
        success: false,
        authenticated: false,
        message: 'Invalid or expired session'
      });
    }
  } catch (error: any) {
    console.error('Auth status error:', error);
    res.status(500).json({
      success: false,
      authenticated: false,
      message: 'Internal server error'
    });
  }
});