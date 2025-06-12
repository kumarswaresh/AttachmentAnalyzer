#!/bin/bash

set -e

APP_NAME="agent-platform"
APP_DIR="/home/ubuntu/AttachmentAnalyzer"
LOG_FILE="deployment.log"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting comprehensive deployment fix..."

cd "$APP_DIR"

# 1. Clean PM2 processes
log "Cleaning existing PM2 processes..."
pm2 delete "$APP_NAME" 2>/dev/null || true
pm2 kill 2>/dev/null || true

# 2. Check and create environment file
log "Checking environment configuration..."
if [ ! -f .env.production ]; then
    log "Creating .env.production from template..."
    cat > .env.production << 'EOF'
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/agent_platform
OPENAI_API_KEY=sk-your-openai-key-here
SESSION_SECRET=your-secure-session-secret-here
ALLOWED_ORIGINS=http://localhost:5000,https://your-domain.com
API_RATE_LIMIT=1000
MAX_UPLOAD_SIZE=10485760
LOG_LEVEL=info
ENCRYPTION_KEY=your-32-character-encryption-key
JWT_SECRET=your-jwt-secret-here
CORS_ENABLED=true
HTTPS_ENABLED=false
ADMIN_EMAIL=admin@example.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
EOF
    log "Environment file created. Please update with your actual values:"
    log "  DATABASE_URL - Your PostgreSQL connection string"
    log "  OPENAI_API_KEY - Your OpenAI API key"
    log "  Other secrets as needed"
fi

# 3. Install dependencies
log "Installing dependencies..."
if [ ! -d "node_modules" ] || [ ! -f "package-lock.json" ]; then
    npm clean-install --production=false
fi

# 4. Build application (frontend + backend)
log "Building application..."
npm run build || {
    log "Full build failed, trying components separately..."
    npx vite build --config vite.config.frontend.ts
    npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
}

# 5. Verify build output
if [ -d "dist/public" ] && [ -f "dist/index.js" ]; then
    FRONTEND_SIZE=$(du -sh dist/public | cut -f1)
    BACKEND_SIZE=$(du -sh dist/index.js | cut -f1)
    log "Build successful - Frontend: $FRONTEND_SIZE, Backend: $BACKEND_SIZE"
    BUILD_SUCCESS=true
elif [ -d "client/dist" ]; then
    BUILD_SIZE=$(du -sh client/dist | cut -f1)
    log "Frontend build found in client/dist: $BUILD_SIZE"
    BUILD_SUCCESS=true
else
    log "Warning: Build output incomplete or missing"
    BUILD_SUCCESS=false
fi

# 6. Test database connection
log "Testing database connection..."
cat > test-db.js << 'EOF'
const { Pool } = require('@neondatabase/serverless');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.production' });

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query('SELECT 1 as test')
  .then(() => {
    console.log('Database connection successful');
    process.exit(0);
  })
  .catch(err => {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  });
EOF

timeout 10 node test-db.js && DB_OK=true || DB_OK=false
rm -f test-db.js

if [ "$DB_OK" = "true" ]; then
    log "Database connection test passed"
else
    log "Warning: Database connection test failed"
fi

# 7. Test application startup
log "Testing application startup..."
timeout 15 npx tsx server/index.ts &
TEST_PID=$!
sleep 8

if kill -0 $TEST_PID 2>/dev/null; then
    log "Application startup test passed"
    kill $TEST_PID 2>/dev/null
    APP_OK=true
else
    log "Warning: Application startup test failed"
    APP_OK=false
fi

# 8. Create optimized PM2 configuration
log "Creating PM2 configuration..."
cat > ecosystem.production.cjs << EOF
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: 'dist/index.js',
    cwd: '$APP_DIR',
    instances: 2,
    exec_mode: 'cluster',
    env_file: '.env.production',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    autorestart: true,
    max_restarts: 5,
    min_uptime: '10s',
    max_memory_restart: '500M',
    watch: false,
    ignore_watch: ['node_modules', 'logs', '.git'],
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF

# 9. Create logs directory
mkdir -p logs

# 10. Start PM2 application
log "Starting PM2 application..."
pm2 start ecosystem.production.cjs

# 11. Wait and check status
sleep 10
PM2_STATUS=$(pm2 jlist | jq -r '.[0].pm2_env.status' 2>/dev/null || echo "unknown")

log "PM2 Status: $PM2_STATUS"

if [ "$PM2_STATUS" = "online" ]; then
    log "SUCCESS: Application is running"
    pm2 save
    
    # 12. Setup startup script
    STARTUP_CMD=$(pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>&1 | grep "sudo env" || true)
    if [ -n "$STARTUP_CMD" ]; then
        log "To enable auto-start on boot, run:"
        log "$STARTUP_CMD"
    fi
    
    # 13. Setup Nginx reverse proxy
    log "Setting up Nginx reverse proxy..."
    if command -v sudo &> /dev/null; then
        bash deployment/setup-nginx.sh 2>&1 | tee nginx-setup.log
        NGINX_EXIT_CODE=${PIPESTATUS[0]}
        
        if [ $NGINX_EXIT_CODE -eq 0 ]; then
            log "Nginx setup completed successfully"
            
            # Test the full stack
            sleep 3
            if curl -f -s http://localhost/health >/dev/null 2>&1; then
                log "Full stack working: PM2 + Nginx"
                SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo 'your-server-ip')
                log "Application accessible at: http://$SERVER_IP"
            else
                log "Nginx proxy test failed - checking backend"
                if curl -f http://localhost:5000/health >/dev/null 2>&1; then
                    log "Backend responding directly on port 5000"
                elif curl -f http://localhost:5000/api/v1/health >/dev/null 2>&1; then
                    log "API health endpoint responding on port 5000"
                else
                    log "Warning: Backend not responding"
                fi
            fi
        else
            log "Nginx setup encountered issues - check nginx-setup.log"
            log "Application accessible directly at: http://localhost:5000"
        fi
    else
        log "Cannot setup Nginx (no sudo access)"
        log "Application accessible directly at: http://localhost:5000"
        log "Run 'sudo bash deployment/setup-nginx.sh' manually on your server"
    fi
    
else
    log "ERROR: Application failed to start"
    log "Checking logs..."
    pm2 logs "$APP_NAME" --lines 20 --nostream || true
    
    # Try simple single instance
    log "Attempting single instance fallback..."
    pm2 delete "$APP_NAME" 2>/dev/null || true
    
    cat > ecosystem.simple.cjs << EOF
module.exports = {
  apps: [{
    name: '$APP_NAME-simple',
    script: 'server/index.ts',
    interpreter: 'npx',
    interpreterArgs: 'tsx',
    cwd: '$APP_DIR',
    instances: 1,
    exec_mode: 'fork',
    env_file: '.env.production',
    autorestart: false
  }]
};
EOF
    
    pm2 start ecosystem.simple.cjs
    sleep 5
    pm2 list
fi

# 14. Final status report
log "=== DEPLOYMENT SUMMARY ==="
log "Database Test: $([ "$DB_OK" = "true" ] && echo "PASS" || echo "FAIL")"
log "App Startup Test: $([ "$APP_OK" = "true" ] && echo "PASS" || echo "FAIL")"
log "PM2 Status: $PM2_STATUS"
log "Build Output: $([ -d "client/dist" ] || [ -d "dist" ] && echo "FOUND" || echo "MISSING")"

if [ "$PM2_STATUS" = "online" ]; then
    log "🎉 DEPLOYMENT SUCCESSFUL"
    log "Application URL: http://$(curl -s ifconfig.me 2>/dev/null || echo 'your-server-ip'):5000"
else
    log "❌ DEPLOYMENT NEEDS ATTENTION"
    log "Next steps:"
    log "1. Check environment variables in .env.production"
    log "2. Verify database connectivity"
    log "3. Review logs: pm2 logs $APP_NAME"
    log "4. Test manual startup: npx tsx server/index.ts"
fi

log "Deployment fix complete. Check $LOG_FILE for details."