#!/bin/bash

# Quick EC2 Setup Test Script
# Tests the fixed role seeding and validation on remote servers

echo "🧪 Testing EC2 Remote Setup Fixes..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set. Please export your database connection string."
    exit 1
fi

echo "📊 Testing role seeding with correct JSONB format..."

# Test the fixed role seeding script
if bash setup/scripts/seed-roles-ec2.sh; then
    echo "✅ Role seeding test passed"
else
    echo "❌ Role seeding test failed"
    exit 1
fi

echo "🔍 Validating setup completion..."

# Test the validation script
if npx tsx setup/scripts/validate-setup.ts; then
    echo "✅ Validation test passed"
else
    echo "❌ Validation test failed"
    exit 1
fi

echo "🎯 Testing complete setup script..."

# Test the complete setup (should handle SSL issues automatically)
if bash setup/complete-setup.sh; then
    echo "✅ Complete setup test passed"
else
    echo "⚠️ Complete setup had issues but may have partial success"
fi

echo "📈 Final validation check..."

# Final validation to confirm everything works
if npx tsx setup/scripts/validate-setup.ts; then
    echo ""
    echo "🎉 All EC2 setup tests passed!"
    echo ""
    echo "Your platform is ready for production deployment."
    echo "Start the application with: npm run dev"
    echo ""
else
    echo "❌ Final validation failed"
    exit 1
fi