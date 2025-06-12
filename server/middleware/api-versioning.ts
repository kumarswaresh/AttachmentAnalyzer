import { Express, Request, Response, NextFunction } from 'express';
import { API_CONFIG, LEGACY_API_CONFIG } from '../config/api';

// Middleware to handle API versioning
export function setupAPIVersioning(app: Express) {
  // Add API version header to all responses
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    res.set('X-API-Version', API_CONFIG.version);
    next();
  });

  // Handle legacy API routes (without version)
  if (LEGACY_API_CONFIG.enabled) {
    app.use('/api', (req: Request, res: Response, next: NextFunction) => {
      // Skip versioned routes
      if (req.path.startsWith(`/${API_CONFIG.version}/`)) {
        return next();
      }

      // Add deprecation headers for legacy routes
      if (LEGACY_API_CONFIG.deprecationWarning) {
        res.set('X-API-Deprecated', 'true');
        res.set('X-API-Sunset-Date', LEGACY_API_CONFIG.sunsetDate);
        res.set('Warning', '299 - "This API version is deprecated. Please upgrade to /api/v1"');
      }

      // Log legacy usage
      console.warn(`Legacy API usage: ${req.method} ${req.originalUrl}`);
      next();
    });
  }

  // Redirect unversioned API calls to current version
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    // Skip if already versioned or is a special route (docs, health, etc.)
    if (req.path.startsWith(`/${API_CONFIG.version}/`) || 
        req.path === '/health' || 
        req.path.startsWith('/docs') ||
        req.path.startsWith('/swagger')) {
      return next();
    }

    // For unversioned API calls, redirect to v1
    const versionedPath = `/api/${API_CONFIG.version}${req.path}`;
    
    if (req.method === 'GET') {
      return res.redirect(301, versionedPath + (req.url.includes('?') ? '?' + req.url.split('?')[1] : ''));
    } else {
      // For non-GET requests, return a 400 with upgrade instruction
      return res.status(400).json({
        error: 'API_VERSION_REQUIRED',
        message: `Please use versioned API endpoint: ${versionedPath}`,
        currentVersion: API_CONFIG.version,
        deprecatedPath: req.path,
        suggestedPath: versionedPath
      });
    }
  });
}

// Utility function to create versioned routes
export function createVersionedRouter() {
  const express = require('express');
  const router = express.Router();
  
  // Add version info to all responses from this router
  router.use((req: Request, res: Response, next: NextFunction) => {
    res.locals.apiVersion = API_CONFIG.version;
    next();
  });
  
  return router;
}

// Helper to get versioned path
export function getVersionedPath(endpoint: string): string {
  return API_CONFIG.getVersionedPath(endpoint);
}