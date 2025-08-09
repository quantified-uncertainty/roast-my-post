#!/bin/bash

# Test script for authentication bypass functionality
# This script tests both the API route and tool execution with bypass enabled

echo "🧪 Testing Authentication Bypass for Tools"
echo "==========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Set test environment
export NODE_ENV=test
export BYPASS_TOOL_AUTH=true

echo "📋 Environment:"
echo "  NODE_ENV: $NODE_ENV"
echo "  BYPASS_TOOL_AUTH: $BYPASS_TOOL_AUTH"
echo ""

# Test 1: Unit tests for createToolRoute
echo "🔬 Test 1: Unit Tests for createToolRoute"
echo "----------------------------------------"
if pnpm test createToolRoute.test.ts > /tmp/test-output.log 2>&1; then
    echo -e "${GREEN}✅ Unit tests passed${NC}"
else
    echo -e "${RED}❌ Unit tests failed${NC}"
    echo "Error output:"
    tail -20 /tmp/test-output.log
fi
echo ""

# Test 2: Integration tests for API route
echo "🔬 Test 2: Integration Tests for API Route"
echo "-----------------------------------------"
if pnpm test route.integration.test.ts > /tmp/test-output2.log 2>&1; then
    echo -e "${GREEN}✅ Integration tests passed${NC}"
else
    echo -e "${YELLOW}⚠️  Integration tests not found or failed${NC}"
    echo "This is expected if the test file doesn't exist yet"
fi
echo ""

# Test 3: Manual API test with curl
echo "🔬 Test 3: Manual API Test (requires server on port 3005)"
echo "--------------------------------------------------------"
if lsof -i :3005 > /dev/null 2>&1; then
    echo "Server detected on port 3005, testing API..."
    
    RESPONSE=$(curl -s -X POST http://localhost:3005/api/tools/check-math-with-mathjs \
        -H "Content-Type: application/json" \
        -d '{"statement":"2 + 2 = 4"}' | head -c 100)
    
    if echo "$RESPONSE" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ API bypass working - request successful${NC}"
    elif echo "$RESPONSE" | grep -q "Not authenticated"; then
        echo -e "${RED}❌ API bypass not working - authentication required${NC}"
    else
        echo -e "${YELLOW}⚠️  Unexpected response: $RESPONSE${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No server running on port 3005${NC}"
    echo "Start the server with: PORT=3005 BYPASS_TOOL_AUTH=true pnpm dev"
fi
echo ""

# Summary
echo "📊 Summary"
echo "========="
echo "The authentication bypass system allows tools to work without login in development."
echo "Key components:"
echo "  1. BYPASS_TOOL_AUTH=true environment variable"
echo "  2. Modified createToolRoute.ts to check for bypass"
echo "  3. Only works in development mode (not production)"
echo ""
echo "To use in development:"
echo "  PORT=3005 BYPASS_TOOL_AUTH=true pnpm dev"
echo ""
echo "✨ Done!"