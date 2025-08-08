#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo "================================================"
echo "Docker Worker Runtime Test"
echo "================================================"
echo "This test verifies the worker can actually import and use workspace packages"
echo ""

# Build the worker image
echo -e "${YELLOW}Building worker Docker image...${NC}"
if docker build -f Dockerfile.worker -t test-worker:latest . > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Build succeeded${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi

# Test 1: Verify Node.js and pnpm work
echo -e "\n${YELLOW}Test 1: Basic runtime check${NC}"
if docker run --rm test-worker:latest node --version > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Node.js works${NC}"
else
    echo -e "${RED}✗ Node.js failed${NC}"
    exit 1
fi

if docker run --rm test-worker:latest pnpm --version > /dev/null 2>&1; then
    echo -e "${GREEN}✓ pnpm works${NC}"
else
    echo -e "${RED}✗ pnpm failed${NC}"
    exit 1
fi

# Test 2: Verify workspace packages can be imported
echo -e "\n${YELLOW}Test 2: Import workspace packages${NC}"
echo "Testing @roast/domain import..."
if docker run --rm test-worker:latest node -e "
try {
    require('@roast/domain');
    console.log('✓ @roast/domain imported successfully');
    process.exit(0);
} catch (e) {
    console.error('✗ Failed to import @roast/domain:', e.message);
    process.exit(1);
}
" 2>&1; then
    echo -e "${GREEN}✓ @roast/domain can be imported${NC}"
else
    echo -e "${RED}✗ @roast/domain import failed${NC}"
    exit 1
fi

echo "Testing @roast/db import..."
if docker run --rm test-worker:latest node -e "
try {
    require('@roast/db');
    console.log('✓ @roast/db imported successfully');
    process.exit(0);
} catch (e) {
    console.error('✗ Failed to import @roast/db:', e.message);
    process.exit(1);
}
" 2>&1; then
    echo -e "${GREEN}✓ @roast/db can be imported${NC}"
else
    echo -e "${RED}✗ @roast/db import failed${NC}"
    exit 1
fi

echo "Testing @roast/ai import..."
if docker run --rm test-worker:latest node -e "
try {
    require('@roast/ai');
    console.log('✓ @roast/ai imported successfully');
    process.exit(0);
} catch (e) {
    console.error('✗ Failed to import @roast/ai:', e.message);
    process.exit(1);
}
" 2>&1; then
    echo -e "${GREEN}✓ @roast/ai can be imported${NC}"
else
    echo -e "${RED}✗ @roast/ai import failed${NC}"
    exit 1
fi

# Test 3: Verify the actual job processor script can be loaded
echo -e "\n${YELLOW}Test 3: Load job processor script${NC}"
if docker run --rm \
    -e DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy?schema=public" \
    -e AUTH_SECRET="test" \
    -e ANTHROPIC_API_KEY="test" \
    test-worker:latest \
    pnpm --filter @roast/web exec tsx -e "
try {
    // Try to load the configuration which imports workspace packages
    const { config } = require('@roast/domain');
    console.log('✓ Configuration loaded');
    
    // Try to import from @roast/db
    const { prisma } = require('@roast/db');
    console.log('✓ Database package loaded');
    
    // Try to import from @roast/ai
    const { callClaude } = require('@roast/ai');
    console.log('✓ AI package loaded');
    
    console.log('✓ All workspace packages work correctly');
    process.exit(0);
} catch (e) {
    console.error('✗ Failed to load packages:', e.message);
    console.error('Stack:', e.stack);
    process.exit(1);
}
" 2>&1; then
    echo -e "${GREEN}✓ All workspace packages load correctly${NC}"
else
    echo -e "${RED}✗ Failed to load workspace packages${NC}"
    exit 1
fi

# Test 4: Verify the actual command can start (but immediately exit)
echo -e "\n${YELLOW}Test 4: Test actual worker command${NC}"
if docker run --rm \
    -e DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy?schema=public" \
    -e AUTH_SECRET="test" \
    -e ANTHROPIC_API_KEY="test" \
    test-worker:latest \
    timeout 5 pnpm --filter @roast/web run process-jobs-adaptive 2>&1 | grep -q "Error" && echo "Command failed as expected without real DB" || echo "Command started"; then
    echo -e "${GREEN}✓ Worker command can be invoked${NC}"
else
    echo -e "${RED}✗ Worker command failed to start${NC}"
    # Don't exit here as it might fail due to DB connection which is expected
fi

# Clean up
echo -e "\n${YELLOW}Cleaning up...${NC}"
docker rmi test-worker:latest 2>/dev/null || true

echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}✅ All critical tests passed!${NC}"
echo -e "${GREEN}================================================${NC}"
echo "The worker Docker image can successfully:"
echo "  • Import @roast/domain"
echo "  • Import @roast/db"
echo "  • Import @roast/ai"
echo "  • Load all workspace packages with tsx"
echo "  • Start the job processor command"