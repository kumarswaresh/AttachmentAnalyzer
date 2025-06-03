import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Basic API routes to prevent errors
app.get("/api/test", (req, res) => {
  res.json({ message: "Server is working", timestamp: new Date().toISOString() });
});

app.get("/api/auth/status", (req, res) => {
  res.json({ authenticated: false, message: "Auth bypassed for demo" });
});

app.get("/api/agents", (req, res) => {
  res.json([]);
});

app.get("/api/modules", (req, res) => {
  res.json([]);
});

app.get("/api/monitoring/metrics", (req, res) => {
  res.json({
    totalAgents: 0,
    activeExecutions: 0,
    successRate: 100,
    avgResponseTime: 0
  });
});

// Serve static files from client build
const clientDistPath = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientDistPath));

// Fallback to index.html for SPA routing
app.get("*", (req, res) => {
  if (!req.path.startsWith("/api")) {
    res.sendFile(path.join(clientDistPath, "index.html"));
  } else {
    res.status(404).json({ error: "API endpoint not found" });
  }
});

const port = 5005;
app.listen(port, "0.0.0.0", () => {
  console.log(`Simple server running on port ${port}`);
});