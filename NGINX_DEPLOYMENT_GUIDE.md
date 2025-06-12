# Production Nginx Configuration for Agent Platform

## Overview
This configuration optimizes Nginx for the AI agent platform with OpenAI integration, handling extended timeouts for hotel recommendations and agent executions.

## Key Improvements Made

### 1. OpenAI API Optimizations
- **Marketing endpoints**: 120s read timeout for hotel recommendations (5-8 second responses)
- **Agent execution**: 90s timeout for LLM processing
- **Buffer settings**: Optimized for large AI responses

### 2. Security Enhancements
- Rate limiting: 10 req/s for API, 5 req/s for auth
- Content Security Policy allowing OpenAI connections
- Blocked access to sensitive files (.env, .sql, .log)

### 3. Performance Optimizations
- Static file caching: 1 year for assets
- Gzip compression with 6 levels
- JSON caching: 1 hour for config files

## Installation Steps

### 1. Build Application
```bash
# Build frontend and backend
node build-all.js

# Verify build output
ls -la dist/
```

### 2. Deploy Files
```bash
# Copy to production directory
sudo mkdir -p /var/www/agent-platform
sudo cp -r dist/* /var/www/agent-platform/
sudo chown -R www-data:www-data /var/www/agent-platform
```

### 3. Install Nginx Configuration
```bash
# Copy configuration
sudo cp nginx-production.conf /etc/nginx/sites-available/agent-platform

# Enable site
sudo ln -s /etc/nginx/sites-available/agent-platform /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 4. Start Backend Service
```bash
# Set environment variables
export DATABASE_URL="postgresql://user:password@host:port/database"
export OPENAI_API_KEY="sk-proj-your-key"
export SESSION_SECRET="your-secret"
export NODE_ENV="production"

# Start backend on port 5000
node dist/index.js
```

## Service Management

### Using PM2 (Recommended)
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start dist/index.js --name "agent-platform"

# Save PM2 configuration
pm2 save
pm2 startup
```

### Using systemd
```bash
# Create service file
sudo tee /etc/systemd/system/agent-platform.service << EOF
[Unit]
Description=Agent Platform Backend
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/var/www/agent-platform
ExecStart=/usr/bin/node dist/index.js
Restart=always
Environment=NODE_ENV=production
Environment=DATABASE_URL=postgresql://user:password@host:port/database
Environment=OPENAI_API_KEY=sk-proj-your-key
Environment=SESSION_SECRET=your-secret

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl enable agent-platform
sudo systemctl start agent-platform
```

## Testing Configuration

### 1. Health Check
```bash
curl http://your-server.com/health
```

### 2. API Endpoints
```bash
# Test agent list
curl http://your-server.com/api/v1/agents

# Test marketing health
curl http://your-server.com/api/v1/marketing/health
```

### 3. Hotel Recommendations
```bash
curl -X POST http://your-server.com/api/v1/marketing/hotel-recommendations \
  -H "Content-Type: application/json" \
  -d '{"destination": "Tokyo, Japan", "travelType": "business", "starRating": 4, "propertyCount": 2}'
```

## Monitoring

### Check Nginx Logs
```bash
# Access logs
sudo tail -f /var/log/nginx/agent-platform-access.log

# Error logs
sudo tail -f /var/log/nginx/agent-platform-error.log
```

### Check Backend Status
```bash
# PM2 status
pm2 status

# Application logs
pm2 logs agent-platform

# System service status
sudo systemctl status agent-platform
```

## SSL Configuration (Optional)

### Using Certbot
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Performance Tuning

### Nginx Worker Processes
```nginx
# Add to /etc/nginx/nginx.conf
worker_processes auto;
worker_connections 1024;
```

### File Descriptors
```bash
# Increase limits
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf
```

## Troubleshooting

### Common Issues
1. **504 Gateway Timeout**: Increase proxy timeouts for OpenAI calls
2. **Rate Limiting**: Adjust burst limits in nginx config
3. **Static Files 404**: Verify dist/ directory structure
4. **API 500 Errors**: Check backend logs and environment variables

### Debug Commands
```bash
# Check Nginx syntax
sudo nginx -t

# Check backend process
ps aux | grep node

# Test backend directly
curl http://localhost:5000/api/v1/marketing/health

# Check port binding
sudo netstat -tlnp | grep :5000
```

The configuration handles the specific requirements of your OpenAI-powered marketing agents with appropriate timeouts and security measures.