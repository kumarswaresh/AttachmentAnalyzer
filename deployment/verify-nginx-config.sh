#!/bin/bash

echo "=== Nginx Configuration Verification ==="

CURRENT_DIR=$(pwd)

echo "1. Checking directory structure..."
echo "   Current directory: $CURRENT_DIR"
if [ -d "$CURRENT_DIR/dist/public" ]; then
    echo "   ✓ dist/public exists"
    echo "   Files in dist/public:"
    ls -la "$CURRENT_DIR/dist/public/" | head -10
else
    echo "   ✗ dist/public not found"
fi

echo
echo "2. Checking file permissions..."
if [ -f "$CURRENT_DIR/dist/public/index.html" ]; then
    echo "   index.html permissions: $(ls -l "$CURRENT_DIR/dist/public/index.html")"
    echo "   index.html size: $(wc -c < "$CURRENT_DIR/dist/public/index.html") bytes"
else
    echo "   ✗ index.html not found"
fi

echo
echo "3. Checking Nginx status..."
if sudo systemctl is-active nginx >/dev/null 2>&1; then
    echo "   ✓ Nginx is running"
else
    echo "   ✗ Nginx is not running"
fi

echo
echo "4. Checking Nginx configuration..."
if [ -f "/etc/nginx/sites-available/agent-platform" ]; then
    echo "   ✓ Configuration file exists"
    echo "   Root path in config:"
    sudo grep "root" /etc/nginx/sites-available/agent-platform || echo "   No root directive found"
else
    echo "   ✗ Configuration file not found"
fi

echo
echo "5. Testing configuration syntax..."
if sudo nginx -t 2>&1; then
    echo "   ✓ Configuration syntax is valid"
else
    echo "   ✗ Configuration syntax error"
fi

echo
echo "6. Checking error logs..."
if [ -f "/var/log/nginx/error.log" ]; then
    echo "   Recent errors:"
    sudo tail -5 /var/log/nginx/error.log 2>/dev/null || echo "   No recent errors"
else
    echo "   No error log file found"
fi

echo
echo "7. Testing file access..."
if [ -r "$CURRENT_DIR/dist/public/index.html" ]; then
    echo "   ✓ index.html is readable"
    echo "   First line: $(head -1 "$CURRENT_DIR/dist/public/index.html")"
else
    echo "   ✗ index.html is not readable"
fi

echo
echo "8. Checking process ownership..."
echo "   Nginx processes:"
ps aux | grep nginx | grep -v grep || echo "   No nginx processes found"

echo
echo "=== Verification Complete ==="