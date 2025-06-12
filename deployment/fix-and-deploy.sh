#!/bin/bash

set -e

APP_NAME="agent-platform"
APP_DIR="/home/ubuntu/AttachmentAnalyzer"

echo "🔧 Fixing PM2 deployment issues..."

cd $APP_DIR

# Stop and clean existing PM2 processes
echo "Cleaning existing PM2 processes..."
pm2 delete $APP_NAME 2>/dev/null || true
pm2 kill 2>/dev/null || true

# Check environment file
if [ ! -f .env.production ]; then
    echo "⚠️  Creating .env.production from template..."
    cp .env.production.example .env.production
    echo "📝 Please edit .env.production with your actual values:"
    echo "   - DATABASE_URL=postgresql://user:pass@host:port/db"
    echo "   - OPENAI_API_KEY=your-key-here"
    echo "   - NODE_ENV=production"
    echo "   - PORT=5000"
fi

# Install dependencies if node_modules is missing
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Test database connection
echo "🔍 Testing database connection..."
if ! timeout 10 npx tsx -e "
import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.production' });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not set in .env.production');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT 1').then(() => {
  console.log('✅ Database connection successful');
  process.exit(0);
}).catch(err => {
  console.error('❌ Database connection failed:', err.message);
  process.exit(1);
});
"; then
    echo "⚠️  Database connection test failed. Please check your DATABASE_URL in .env.production"
    echo "Example format: postgresql://username:password@hostname:5432/database"
fi

# Test application startup
echo "🧪 Testing application startup..."
timeout 15 npx tsx server/index.ts &
TEST_PID=$!
sleep 10

if kill -0 $TEST_PID 2>/dev/null; then
    echo "✅ Application startup test passed"
    kill $TEST_PID 2>/dev/null
else
    echo "❌ Application startup test failed"
    echo "Common issues:"
    echo "  1. Missing environment variables in .env.production"
    echo "  2. Database connection problems"
    echo "  3. Missing OpenAI API key"
fi

# Create simplified PM2 config for troubleshooting
cat > ecosystem.simple.cjs << EOF
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: 'server/index.ts',
    interpreter: 'npx',
    interpreterArgs: 'tsx',
    cwd: '$APP_DIR',
    instances: 1,
    exec_mode: 'fork',
    env_file: '.env.production',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    autorestart: true,
    max_restarts: 3,
    min_uptime: '5s'
  }]
};
EOF

# Create logs directory
mkdir -p logs

# Start with simplified config
echo "🚀 Starting with simplified PM2 configuration..."
pm2 start ecosystem.simple.cjs

sleep 5

# Check status
echo "📊 PM2 Status:"
pm2 list

echo ""
echo "📋 Recent logs:"
pm2 logs $APP_NAME --lines 20 --nostream

echo ""
echo "🔍 Diagnostics complete!"
echo ""
echo "If the application is still failing:"
echo "1. Check logs: pm2 logs $APP_NAME"
echo "2. Verify .env.production has correct values"
echo "3. Test database connectivity manually"
echo "4. Ensure OpenAI API key is valid"
echo ""
echo "Once issues are resolved, run:"
echo "  pm2 restart $APP_NAME"
echo "  pm2 save"