#!/bin/bash

echo "=== PM2 Diagnostic Report ==="
echo "Date: $(date)"
echo "User: $(whoami)"
echo "Working Directory: $(pwd)"
echo ""

echo "=== PM2 Status ==="
pm2 list
echo ""

echo "=== PM2 Logs (Last 30 lines) ==="
pm2 logs agent-platform --lines 30 --nostream
echo ""

echo "=== Environment Check ==="
echo "NODE_ENV: $NODE_ENV"
echo "DATABASE_URL: ${DATABASE_URL:0:20}..." # Show first 20 chars only
echo "OPENAI_API_KEY: ${OPENAI_API_KEY:0:10}..." # Show first 10 chars only
echo ""

echo "=== File Permissions ==="
ls -la server/index.ts
echo ""

echo "=== Node Dependencies ==="
which node
which npx
which tsx
echo ""

echo "=== PM2 Configuration ==="
if [ -f ecosystem.config.cjs ]; then
    echo "Found ecosystem.config.cjs:"
    head -20 ecosystem.config.cjs
else
    echo "ecosystem.config.cjs not found"
fi
echo ""

echo "=== Manual Test ==="
echo "Testing direct execution:"
npx tsx server/index.ts &
sleep 5
kill $! 2>/dev/null
echo ""

echo "=== PM2 Delete and Restart ==="
pm2 delete agent-platform 2>/dev/null
pm2 start ecosystem.config.cjs --env production
echo ""

echo "=== Final Status ==="
pm2 list