import express from 'express';
const app = express();
const port = 5005;

app.use(express.json());

// Simple test routes
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working' });
});

app.get('/api/auth/status', (req, res) => {
  res.json({ authenticated: false, message: "Test mode - no authentication" });
});

app.listen(port, () => {
  console.log(`Test server running on port ${port}`);
});