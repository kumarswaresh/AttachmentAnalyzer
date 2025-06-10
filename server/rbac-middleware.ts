import { Request, Response, NextFunction } from "express";
import { rbacService } from "./services/rbac-service";
import { authService } from "./auth";

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        email: string;
        role: string;
        organizationId?: number;
      };
      apiKey?: {
        id: number;
        userId: number;
        permissions: string[];
        allowedEndpoints: string[];
        organizationId?: number;
      };
      userPermissions?: string[];
      userFeatureAccess?: Record<string, boolean>;
      organizationId?: number;
    }
  }
}

// API Key Authentication Middleware
export const apiKeyAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      message: "API key required", 
      details: "Provide Authorization: Bearer <api_key> header" 
    });
  }

  const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  try {
    const validApiKey = await rbacService.validateApiKey(apiKey);
    
    if (!validApiKey) {
      await rbacService.logApiAccess({
        apiKeyId: null,
        userId: null,
        organizationId: null,
        endpoint: req.path,
        method: req.method,
        statusCode: 401,
        responseTime: 0,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        errorMessage: "Invalid API key"
      });
      
      return res.status(401).json({ 
        message: "Invalid API key" 
      });
    }

    // Check if API key has expired
    if (validApiKey.expiresAt && new Date() > validApiKey.expiresAt) {
      return res.status(401).json({ 
        message: "API key has expired" 
      });
    }

    // Check if endpoint is allowed
    if (validApiKey.allowedEndpoints && validApiKey.allowedEndpoints.length > 0) {
      const isEndpointAllowed = validApiKey.allowedEndpoints.some(endpoint => 
        req.path.startsWith(endpoint) || endpoint === "*"
      );
      
      if (!isEndpointAllowed) {
        return res.status(403).json({ 
          message: "Access denied to this endpoint" 
        });
      }
    }

    // Attach API key info to request
    req.apiKey = {
      id: validApiKey.id,
      userId: validApiKey.userId,
      permissions: validApiKey.permissions || [],
      allowedEndpoints: validApiKey.allowedEndpoints || [],
      organizationId: validApiKey.organizationId || undefined
    };

    next();
  } catch (error) {
    console.error("API key authentication error:", error);
    return res.status(500).json({ 
      message: "Authentication service error" 
    });
  }
};

// Session-based Authentication Middleware (for web interface)
export const sessionAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip authentication for MCP endpoints to allow testing and integration
    if (req.path.startsWith('/api/mcp')) {
      return next();
    }

    const sessionToken = req.headers.authorization?.replace('Bearer ', '') || 
                        req.cookies?.sessionToken ||
                        req.headers['x-session-token'];

    if (!sessionToken) {
      return res.status(401).json({ 
        message: "Authentication required",
        details: "Provide session token via Authorization header (Bearer <token>), cookie, or ?token= query parameter" 
      });
    }

    const user = await authService.validateSession(sessionToken);
    
    if (!user) {
      return res.status(401).json({ 
        message: "Invalid or expired session" 
      });
    }

    // Load user roles and permissions
    const userRoles = await rbacService.getUserRoles(user.id);
    const permissions: string[] = [];
    const featureAccess: Record<string, boolean> = {};

    for (const userRole of userRoles) {
      permissions.push(...(userRole.role.permissions || []));
      Object.assign(featureAccess, userRole.role.featureAccess || {});
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
    
    req.userPermissions = permissions;
    req.userFeatureAccess = featureAccess;

    next();
  } catch (error) {
    console.error("Session authentication error:", error);
    return res.status(500).json({ 
      message: "Authentication service error" 
    });
  }
};

// Flexible Authentication Middleware (supports both API key and session)
export const flexAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  // Check for API key first
  if (authHeader && authHeader.startsWith('Bearer apk_')) {
    return apiKeyAuth(req, res, next);
  }
  
  // Fall back to session auth
  return sessionAuth(req, res, next);
};

// Permission-based Authorization Middleware
export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      let hasPermission = false;

      // Check API key permissions
      if (req.apiKey) {
        hasPermission = req.apiKey.permissions.includes(permission) || 
                       req.apiKey.permissions.includes("*");
        
        // Check wildcard patterns
        if (!hasPermission) {
          hasPermission = req.apiKey.permissions.some(perm => {
            if (perm.endsWith(":*")) {
              const prefix = perm.slice(0, -2);
              return permission.startsWith(prefix + ":");
            }
            return false;
          });
        }
      }
      
      // Check user permissions
      if (req.user && req.userPermissions) {
        hasPermission = await rbacService.hasPermission(req.user.id, permission);
      }

      if (!hasPermission) {
        return res.status(403).json({ 
          message: "Insufficient permissions",
          required: permission 
        });
      }

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      return res.status(500).json({ 
        message: "Authorization service error" 
      });
    }
  };
};

// Feature-based Authorization Middleware
export const requireFeature = (feature: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      let hasAccess = false;

      if (req.user) {
        hasAccess = await rbacService.hasFeatureAccess(req.user.id, feature as any);
      }

      if (!hasAccess) {
        return res.status(403).json({ 
          message: "Feature access denied",
          feature: feature 
        });
      }

      next();
    } catch (error) {
      console.error("Feature access check error:", error);
      return res.status(500).json({ 
        message: "Authorization service error" 
      });
    }
  };
};

// Admin-only Middleware
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let isAdmin = false;

    if (req.user) {
      isAdmin = await rbacService.hasPermission(req.user.id, "*") || 
                await rbacService.hasPermission(req.user.id, "admin:*");
    }

    if (req.apiKey) {
      isAdmin = req.apiKey.permissions.includes("*") || 
                req.apiKey.permissions.includes("admin:*");
    }

    if (!isAdmin) {
      return res.status(403).json({ 
        message: "Administrator access required" 
      });
    }

    next();
  } catch (error) {
    console.error("Admin check error:", error);
    return res.status(500).json({ 
      message: "Authorization service error" 
    });
  }
};