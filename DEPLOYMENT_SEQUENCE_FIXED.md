# Production Deployment Sequence (Fixed)

## Issue Resolution
**Fixed:** PM2 configuration error - all deployment scripts now use `ecosystem.config.cjs` (CommonJS format) instead of `.js` to avoid ES module conflicts.

## Complete Deployment Steps

### 1. Pre-deployment Setup
```bash
# On your EC2 instance
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx nodejs npm postgresql-client git curl build-essential
sudo npm install -g pm2 tsx

# Clone repository
git clone <your-repo-url> /home/ubuntu/AttachmentAnalyzer
cd /home/ubuntu/AttachmentAnalyzer
```

### 2. Environment Configuration
```bash
# Copy and configure environment
cp .env.production.example .env.production
nano .env.production
```

Required variables:
- `DATABASE_URL=postgresql://username:password@host:port/database`
- `OPENAI_API_KEY=your-openai-key`
- `NODE_ENV=production`
- `PORT=5000`

### 3. Deployment Options

#### Option A: Quick Deploy (Testing)
```bash
bash deployment/quick-deploy.sh
```
- Basic PM2 setup with single instance
- Standard Nginx configuration
- Health checks enabled
- **Best for:** Development/staging environments

#### Option B: Complete Deploy (Production)
```bash
bash deployment/complete-deploy.sh
```
- PM2 clustering with auto-scaling
- Advanced Nginx with security headers
- Rate limiting and performance optimization
- **Best for:** Production environments

#### Option C: Optimized Deploy (Enterprise)
```bash
bash deployment/optimized-deploy.sh
```
- Enhanced PM2 with memory limits
- Maximum Nginx optimization
- Advanced monitoring and logging
- **Best for:** High-traffic production systems

### 4. SSL Configuration (Optional)
```bash
bash deployment/ssl-setup.sh yourdomain.com admin@yourdomain.com
```

### 5. Post-Deployment Verification

#### Check Application Status
```bash
# PM2 status
pm2 status
pm2 logs agent-platform

# Application health
curl http://localhost/health
curl http://localhost/api/v1/health
```

#### Check Services
```bash
# Nginx status
sudo systemctl status nginx
sudo nginx -t

# View logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 6. Management Commands

#### Application Management
```bash
pm2 restart agent-platform    # Restart app
pm2 stop agent-platform       # Stop app
pm2 monit                     # Real-time monitoring
pm2 reload agent-platform     # Zero-downtime reload
```

#### Nginx Management
```bash
sudo systemctl reload nginx   # Reload configuration
sudo systemctl restart nginx # Full restart
```

#### Database Operations
```bash
# Backup database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore database
psql $DATABASE_URL < backup_file.sql
```

## Key Features

### All Deployment Scripts Include:
- ✅ Automatic build output detection (handles both `dist/public/` and `client/dist/`)
- ✅ PM2 CommonJS configuration (`.cjs` extension)
- ✅ Build warning suppression for large chunks
- ✅ Health check validation
- ✅ Process cleanup and restart
- ✅ Nginx reverse proxy setup
- ✅ Static file serving optimization

### Security Features:
- Rate limiting (60 requests/minute per IP)
- Security headers (HSTS, X-Frame-Options, etc.)
- Request size limits
- GZIP compression
- Static asset caching

### Performance Optimizations:
- PM2 clustering with CPU core detection
- Memory limits and monitoring
- Nginx worker optimization
- Asset compression and caching
- Connection pooling

## Troubleshooting

### Common Issues:

1. **PM2 ES Module Error (Fixed)**
   ```bash
   # Error: require() of ES Module not supported
   # Solution: Scripts now use ecosystem.config.cjs
   ```

2. **Build Output Location**
   ```bash
   # Scripts auto-detect both locations:
   # - dist/public/ (current build output)
   # - client/dist/ (alternative location)
   ```

3. **Large Bundle Warning**
   ```bash
   # Warning suppressed in deployment scripts
   # Consider code splitting for production optimization
   ```

4. **Database Connection**
   ```bash
   # Verify DATABASE_URL format:
   # postgresql://user:pass@host:port/dbname
   ```

### Health Check Endpoints:
- `GET /health` - Basic health check
- `GET /api/v1/health` - API health with database status
- `GET /api/v1/system/status` - Detailed system information

## Deployment Timeline
- **Quick Deploy:** 3-5 minutes
- **Complete Deploy:** 5-8 minutes  
- **Optimized Deploy:** 8-12 minutes

The deployment process is now fully automated and handles all common issues, including the PM2 ES module conflict that was encountered.