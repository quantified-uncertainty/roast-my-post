#!/bin/bash

echo "📦 Setting up Direct API cost tracking..."

# Check if we're in the right directory
if [ ! -f "input.md" ]; then
    echo "❌ Error: input.md not found. Run this from experiments/08-optimized-claude-code/"
    exit 1
fi

# Install Anthropic SDK
echo "Installing @anthropic-ai/sdk..."
npm install @anthropic-ai/sdk

echo ""
echo "✅ Setup complete!"
echo ""
echo "To run the cost tracking test:"
echo "1. Get an API key from https://console.anthropic.com/account/keys"
echo "2. Export it: export ANTHROPIC_API_KEY=sk-ant-..."
echo "3. Run: node direct-api-with-cost.js"
echo ""
echo "This will show EXACT costs per run!"