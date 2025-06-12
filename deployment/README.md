# Production Deployment Guide

Complete guide for deploying the AI Agent Platform to production with PM2 and Nginx.

## Quick Deployment

For immediate deployment on your EC2 instance:

```bash
# Complete build and deployment
bash deployment/build-and-deploy.sh

# Set up SSL (replace with your domain)
bash deployment/ssl-setup.sh yourdomain.com admin@yourdomain.com
```

## Manual Step-by-Step Deployment

### 1. Build the Application

```bash
# Build React frontend
npm run build

# Verify build output
ls -la client/dist/
```

### 2. Configure PM2

```bash
# Deploy with PM2 and Nginx
bash deployment/production-deploy.sh
```

This script will:
- Install dependencies in production mode
- Create PM2 ecosystem configuration
- Start the application with PM2 clustering
- Configure Nginx reverse proxy
- Set up static file serving
- Configure security headers and gzip compression

### 3. SSL Certificate Setup

```bash
# Install Let's Encrypt SSL certificate
bash deployment/ssl-setup.sh yourdomain.com admin@yourdomain.com
```

This will:
- Install certbot if needed
- Generate SSL certificates
- Update Nginx configuration for HTTPS
- Set up automatic certificate renewal

### 4. Environment Configuration

Ensure these environment variables are set:

```bash
# Required for production
export NODE_ENV=production
export DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require"
export OPENAI_API_KEY="your-openai-key"

# Optional configuration
export DOMAIN="yourdomain.com"
export PORT="5000"
```

## Architecture Overview

### Frontend (Static Files)
- Built React application served by Nginx
- Gzip compression enabled
- Static asset caching (1 year)
- Security headers configured

### Backend (API Server)
- Node.js application managed by PM2
- Cluster mode for multiple instances
- Automatic process restart on crashes
- Memory limit and monitoring

### Database
- PostgreSQL with SSL connections
- Connection pooling via Drizzle ORM
- Automated migrations and seeding

## Management Commands

### PM2 Process Management
```bash
# View application status
pm2 status

# View logs
pm2 logs agent-platform

# Restart application
pm2 restart agent-platform

# Stop application
pm2 stop agent-platform

# Monitor resources
pm2 monit
```

### Nginx Management
```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# View logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Check status
sudo systemctl status nginx
```

### Database Operations
```bash
# Push schema changes
npm run db:push

# Run setup scripts
bash setup/complete-setup.sh

# Validate setup
npx tsx setup/scripts/validate-setup.ts
```

## Monitoring and Troubleshooting

### Health Checks
- Frontend: `curl http://yourdomain.com`
- Backend API: `curl http://yourdomain.com/api/health`
- Database: Check application logs

### Common Issues

**Frontend not loading:**
```bash
# Check if build exists
ls -la client/dist/

# Rebuild if needed
npm run build

# Check Nginx configuration
sudo nginx -t
```

**Backend API errors:**
```bash
# Check PM2 logs
pm2 logs agent-platform

# Restart application
pm2 restart agent-platform

# Check database connection
npx tsx setup/scripts/validate-setup.ts
```

**SSL certificate issues:**
```bash
# Check certificate status
sudo certbot certificates

# Renew certificates
sudo certbot renew

# Check renewal cron job
crontab -l
```

## Security Configuration

### Firewall Rules
```bash
# Allow HTTP and HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Allow SSH (if not already configured)
sudo ufw allow 22

# Enable firewall
sudo ufw enable
```

### Nginx Security Headers
The deployment automatically configures:
- X-Frame-Options: SAMEORIGIN
- X-XSS-Protection: 1; mode=block
- X-Content-Type-Options: nosniff
- Strict-Transport-Security (HTTPS only)
- Content Security Policy

### Database Security
- SSL connections required in production
- Connection pooling with limits
- Environment variable credential storage

## Performance Optimization

### PM2 Clustering
- Automatic CPU core detection
- Load balancing across instances
- Memory monitoring and restart limits

### Nginx Optimization
- Gzip compression for text files
- Static asset caching with long expiry
- Proxy buffering for API requests

### Database Optimization
- Connection pooling
- Query optimization via Drizzle ORM
- Indexed columns for performance

## Backup and Recovery

### Database Backups
```bash
# Create backup
node scripts/backup-database.js

# Restore from backup
node scripts/backup-database.js restore backup-file.sql
```

### Application Backups
```bash
# Backup application files
tar -czf app-backup-$(date +%Y%m%d).tar.gz \
  --exclude=node_modules \
  --exclude=client/dist \
  --exclude=logs \
  .
```

## Scaling Considerations

### Horizontal Scaling
- Load balancer configuration
- Shared database across instances
- Session storage considerations

### Vertical Scaling
- PM2 instance count adjustment
- Database connection pool sizing
- Memory and CPU monitoring

## Updates and Maintenance

### Application Updates
```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install --production

# Rebuild application
npm run build

# Restart with zero downtime
pm2 reload agent-platform
```

### System Maintenance
```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Clean old logs
pm2 flush

# Restart services if needed
sudo systemctl restart nginx
```

## Support and Monitoring

### Log Locations
- Application: `logs/` directory
- PM2: `~/.pm2/logs/`
- Nginx: `/var/log/nginx/`
- System: `/var/log/syslog`

### Monitoring Setup
- PM2 built-in monitoring
- Nginx access logs
- Database connection monitoring
- Custom health check endpoints

For additional support, check the application logs and ensure all environment variables are properly configured.