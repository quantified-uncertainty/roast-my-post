#!/bin/bash

# Setup script for Opik installation
echo "🚀 Setting up Opik for production monitoring..."

# Option 1: Cloud Setup (Recommended for quick start)
echo ""
echo "=== Option 1: Opik Cloud (Recommended) ==="
echo "1. Sign up for free at: https://www.comet.com"
echo "2. Get your API key from: https://www.comet.com/api/my/settings"
echo "3. Set environment variable: export OPIK_API_KEY='your-api-key'"
echo "4. Set workspace: export OPIK_WORKSPACE='your-workspace-name'"
echo ""

# Option 2: Local Setup with Docker
echo "=== Option 2: Self-Hosted Opik ==="
echo "Running local Opik instance with Docker..."
echo ""

# Check if Docker is installed
if command -v docker &> /dev/null; then
    echo "✅ Docker is installed"
    
    # Clone Opik repository if not exists
    if [ ! -d "opik" ]; then
        echo "📦 Cloning Opik repository..."
        git clone https://github.com/comet-ml/opik.git
    fi
    
    # Start Opik
    cd opik
    echo "🐳 Starting Opik with Docker Compose..."
    ./opik.sh
    
    echo ""
    echo "✅ Local Opik is running at: http://localhost:5173"
    echo "   API endpoint: http://localhost:5173/api"
    echo ""
else
    echo "❌ Docker not found. Please install Docker first:"
    echo "   https://docs.docker.com/get-docker/"
fi

# Install Python SDK
echo ""
echo "📦 Installing Opik Python SDK..."
pip install opik

echo ""
echo "✅ Setup complete! Next steps:"
echo "1. Choose Cloud or Self-hosted option above"
echo "2. Run 'npm run opik-eval' to test the integration"