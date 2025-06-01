#!/bin/bash

# Agent Platform Docker Quick Start Script

set -e

echo "🚀 Agent Platform Docker Setup"
echo "================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << 'EOF'
# Required: OpenAI API Key
OPENAI_API_KEY=your_openai_key_here

# Database Password
POSTGRES_PASSWORD=secure_password_123

# Optional: Additional AI APIs
ANTHROPIC_API_KEY=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
EOF
    echo "⚠️  Please edit .env file with your actual API keys before continuing."
    echo "   Especially set your OPENAI_API_KEY"
    read -p "Press Enter when you've updated the .env file..."
fi

# Prepare clean configuration files
echo "🔧 Preparing configuration files..."
cp package.local.json package.json
cp vite.config.local.ts vite.config.ts

# Ask for deployment type
echo ""
echo "Choose deployment type:"
echo "1) Development (with hot reload)"
echo "2) Production (optimized build)"
read -p "Enter choice [1-2]: " choice

case $choice in
    1)
        echo "🛠️  Starting development environment..."
        docker-compose -f docker-compose.dev.yml up --build
        ;;
    2)
        echo "🏭 Starting production environment..."
        docker-compose up --build -d
        echo ""
        echo "✅ Production environment started!"
        echo "   Frontend: http://localhost"
        echo "   API: http://localhost/api"
        echo "   Docs: http://localhost/api-docs"
        echo ""
        echo "📊 Check logs with: docker-compose logs -f"
        echo "🛑 Stop with: docker-compose down"
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac