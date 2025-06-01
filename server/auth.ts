import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { storage } from "./storage";
import type { User, InsertUser, InsertUserSession } from "@shared/schema";

export interface AuthResult {
  success: boolean;
  user?: User;
  sessionToken?: string;
  message?: string;
}

export class AuthService {
  // Register new user
  async register(username: string, email: string, password: string): Promise<AuthResult> {
    try {
      // Check if user already exists
      const existingUserByUsername = await storage.getUserByUsername(username);
      if (existingUserByUsername) {
        return { success: false, message: "Username already exists" };
      }

      const existingUserByEmail = await storage.getUserByEmail(email);
      if (existingUserByEmail) {
        return { success: false, message: "Email already exists" };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const insertUser: InsertUser = {
        username,
        email,
        password: hashedPassword,
        role: "user",
      };

      const user = await storage.createUser(insertUser);

      // Create session
      const sessionToken = await this.createSession(user.id);

      return {
        success: true,
        user,
        sessionToken,
        message: "Registration successful"
      };
    } catch (error) {
      console.error("Registration error:", error);
      return { success: false, message: "Registration failed" };
    }
  }

  // Login user
  async login(usernameOrEmail: string, password: string): Promise<AuthResult> {
    try {
      // Find user by username or email
      let user = await storage.getUserByUsername(usernameOrEmail);
      if (!user) {
        user = await storage.getUserByEmail(usernameOrEmail);
      }

      if (!user) {
        return { success: false, message: "Invalid credentials" };
      }

      if (!user.isActive) {
        return { success: false, message: "Account is deactivated" };
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return { success: false, message: "Invalid credentials" };
      }

      // Update last login
      await storage.updateUser(user.id, { lastLogin: new Date() });

      // Create session
      const sessionToken = await this.createSession(user.id);

      return {
        success: true,
        user,
        sessionToken,
        message: "Login successful"
      };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, message: "Login failed" };
    }
  }

  // Create session
  async createSession(userId: number): Promise<string> {
    const sessionToken = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    const insertSession: InsertUserSession = {
      id: sessionToken,
      userId,
      expiresAt,
    };

    await storage.createUserSession(insertSession);
    return sessionToken;
  }

  // Validate session
  async validateSession(sessionToken: string): Promise<User | null> {
    try {
      if (!sessionToken) return null;

      const session = await storage.getUserSession(sessionToken);
      if (!session) return null;

      // Check if session expired
      if (session.expiresAt < new Date()) {
        await storage.deleteUserSession(sessionToken);
        return null;
      }

      // Get user
      const user = await storage.getUser(session.userId);
      if (!user || !user.isActive) {
        await storage.deleteUserSession(sessionToken);
        return null;
      }

      return user;
    } catch (error) {
      console.error("Session validation error:", error);
      return null;
    }
  }

  // Logout
  async logout(sessionToken: string): Promise<void> {
    try {
      await storage.deleteUserSession(sessionToken);
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  // Clean expired sessions
  async cleanExpiredSessions(): Promise<void> {
    try {
      await storage.deleteExpiredSessions();
    } catch (error) {
      console.error("Session cleanup error:", error);
    }
  }
}

export const authService = new AuthService();

// Middleware for protecting routes
export async function requireAuth(req: any, res: any, next: any) {
  try {
    // Check multiple auth sources for Swagger compatibility
    let sessionToken = null;
    
    // 1. Check Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader) {
      sessionToken = authHeader.replace('Bearer ', '').trim();
    }
    
    // 2. Check cookie-based session for browser requests
    if (!sessionToken && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'sessionToken') {
          sessionToken = value;
          break;
        }
      }
    }
    
    // 3. Check query parameter for testing
    if (!sessionToken && req.query.token) {
      sessionToken = req.query.token;
    }

    if (!sessionToken) {
      return res.status(401).json({ 
        message: "Authentication required",
        details: "Provide session token via Authorization header (Bearer <token>), cookie, or ?token= query parameter"
      });
    }

    const user = await authService.validateSession(sessionToken);
    if (!user) {
      return res.status(401).json({ message: "Invalid or expired session" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ message: "Authentication error" });
  }
}

// Middleware for admin routes
export async function requireAdmin(req: any, res: any, next: any) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}