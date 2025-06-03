import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { setupVite, serveStatic, log } from "./vite";
import { authService } from "./auth";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Basic authentication routes
app.post("/api/auth/login", async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;
    const result = await authService.login(usernameOrEmail, password);
    res.json(result);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Login failed" });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const result = await authService.register(username, email, password);
    res.json(result);
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ success: false, message: "Registration failed" });
  }
});

app.get("/api/auth/status", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.json({ authenticated: false, message: "No authentication token" });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const user = await authService.validateSession(token);
    
    if (!user) {
      return res.json({ authenticated: false, message: "Invalid or expired session" });
    }

    res.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Auth status error:", error);
    res.status(500).json({ authenticated: false, message: "Authentication check failed" });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '').trim();
      await authService.logout(token);
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    res.json({ success: true }); // Always succeed for logout
  }
});

// Basic API test route
app.get("/api/test", (req, res) => {
  res.json({ message: "Server is working", timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
  throw err;
});

(async () => {
  try {
    const server = await setupVite(app, serveStatic);
    const port = 5005;
    server.listen(port, "0.0.0.0", () => {
      log(`serving on port ${port}`);
    });
  } catch (error) {
    console.error("Server startup error:", error);
    // Fallback to basic express server
    const port = 5005;
    app.listen(port, "0.0.0.0", () => {
      console.log(`Basic server running on port ${port}`);
    });
  }
})();