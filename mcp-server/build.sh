#!/bin/bash

# Build script for MCP server
echo "Building MCP server..."

# Change to MCP server directory
cd "$(dirname "$0")"

# Run TypeScript compiler
npx tsc

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "To use the updated MCP server:"
    echo "1. Restart Claude app or reload the MCP server"
    echo "2. The new 'import_article' tool will be available"
else
    echo "❌ Build failed!"
    exit 1
fi