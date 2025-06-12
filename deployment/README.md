# Production Deployment Guide

## Available Deployment Scripts

### 1. Quick Deployment (Recommended)
```bash
bash deployment/quick-deploy.sh
```
- Fast production deployment with streamlined build process
- Handles flexible build output locations (dist/public or client/dist)
- Single PM2 process for reliability
- Basic Nginx configuration with gzip compression

### 2. Optimized Deployment
```bash
bash deployment/optimized-deploy.sh
```
- Full production deployment with advanced optimizations
- PM2 clustering with auto-scaling
- Enhanced Nginx configuration with rate limiting and security headers
- Advanced asset caching and performance tuning

### 3. Standard Deployment
```bash
bash deployment/production-deploy.sh
```
- Standard production deployment
- Balanced configuration between performance and simplicity
- Comprehensive logging and monitoring

### 4. SSL Setup
```bash
bash deployment/ssl-setup.sh yourdomain.com admin@yourdomain.com
```
- Automated SSL certificate setup with Let's Encrypt
- Nginx HTTPS configuration with security headers
- Automatic certificate renewal

## Build Process

The deployment scripts automatically handle different build output structures:

1. **Vite Build Output**: `dist/public/` (standard Vite configuration)
2. **Alternative Output**: `client/dist/` (custom configuration)
3. **Fallback**: Copies from any detected build directory to standardized location

## Prerequisites

### EC2 Instance Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y nginx nodejs npm postgresql-client git curl

# Install PM2 globally
sudo npm install -g pm2 tsx

# Install build tools
sudo apt install -y build-essential

# Clone repository
git clone <your-repo-url> /home/ubuntu/AttachmentAnalyzer
cd /home/ubuntu/AttachmentAnalyzer
```

### Environment Configuration
```bash
# Set up environment variables
cp .env.production.example .env.production

# Edit with your values
nano .env.production
```

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API key
- `NODE_ENV=production`
- `PORT=5000`

## Deployment Process

### 1. Initial Deployment
```bash
# Choose deployment method
bash deployment/quick-deploy.sh

# Add SSL (optional)
bash deployment/ssl-setup.sh yourdomain.com admin@yourdomain.com
```

### 2. Application Management
```bash
# View logs
pm2 logs agent-platform

# Restart application
pm2 restart agent-platform

# Monitor processes
pm2 monit

# View status
pm2 status
```

### 3. Nginx Management
```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# View logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Health Checks

The deployment automatically configures health check endpoints:

- **Frontend**: `http://yourdomain.com/`
- **API**: `http://yourdomain.com/api/`
- **Health**: `http://yourdomain.com/health`

## Troubleshooting

### Build Issues
```bash
# Check build output
ls -la dist/
ls -la client/dist/

# Manual build
npm run build

# Check build logs
npm run build 2>&1 | tee build.log
```

### Service Issues
```bash
# Check PM2 status
pm2 status
pm2 logs agent-platform --lines 50

# Check Nginx status
sudo systemctl status nginx
sudo nginx -t

# Check ports
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :5000
```

### Database Issues
```bash
# Test database connection
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()').then(r => console.log('DB OK:', r.rows[0])).catch(console.error);
"
```

## Performance Optimization

### PM2 Clustering (Optimized Deployment)
- Automatically scales to CPU cores
- Memory restart limits prevent memory leaks
- Process monitoring and auto-restart

### Nginx Optimization
- Gzip compression for text assets
- Static file caching (1-year for assets)
- Rate limiting for API endpoints
- Security headers for enhanced protection

### Build Optimization
- Code splitting for smaller initial bundles
- Asset optimization and compression
- Source map generation for debugging

## Security Features

### SSL/TLS
- Automatic Let's Encrypt certificate generation
- Strong cipher suites and protocols
- HSTS headers for enhanced security

### Nginx Security
- Hidden server tokens
- X-Frame-Options protection
- Content type sniffing protection
- Rate limiting on API endpoints

### Application Security
- Environment variable protection
- Secure session configuration
- API key validation and rate limiting

## Monitoring

### Application Monitoring
```bash
# PM2 monitoring
pm2 monit

# Resource usage
htop
df -h
free -h
```

### Log Monitoring
```bash
# Application logs
pm2 logs agent-platform --follow

# System logs
journalctl -u nginx -f
tail -f /var/log/nginx/access.log
```

## Backup and Recovery

### Database Backup
```bash
# Create backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
psql $DATABASE_URL < backup_file.sql
```

### Application Backup
```bash
# Backup application files
tar -czf app_backup_$(date +%Y%m%d_%H%M%S).tar.gz \
  /home/ubuntu/AttachmentAnalyzer \
  --exclude=node_modules \
  --exclude=.git
```

## Updates and Maintenance

### Application Updates
```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install --production

# Rebuild and restart
bash deployment/quick-deploy.sh
```

### System Updates
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Node.js/npm
sudo npm install -g npm@latest

# Update PM2
sudo npm install -g pm2@latest
pm2 update
```

This guide provides comprehensive instructions for deploying and managing your AI agent platform in production with proper security, performance, and monitoring capabilities.