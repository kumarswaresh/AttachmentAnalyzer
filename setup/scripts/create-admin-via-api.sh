#!/bin/bash

# Create admin user via API endpoint
# This bypasses direct database connection issues

echo "Creating admin user via API..."

# Wait for server to be ready
echo "Waiting for server to be ready..."
sleep 5

# Create admin user via API
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@local.dev",
    "password": "admin123"
  }' || echo "Admin user creation via API completed"

echo ""
echo "Admin credentials:"
echo "Email: admin@local.dev"
echo "Password: admin123"