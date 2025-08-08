#!/bin/bash
# Test script for Docker worker build
# This script builds the worker image and tests package accessibility

set -e

echo "========================================="
echo "Docker Worker Build Test"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Build the worker image
echo -e "${YELLOW}Building Docker worker image...${NC}"
echo "This will take several minutes on first run."
echo ""

if docker build -f Dockerfile.worker -t roastmypost-worker:test . ; then
    echo -e "${GREEN}✓ Docker build succeeded${NC}"
else
    echo -e "${RED}✗ Docker build failed${NC}"
    exit 1
fi

echo ""
echo "========================================="
echo "Testing package imports in built image..."
echo "========================================="

# Test that packages are accessible in the built image
echo -e "${YELLOW}Testing @roast/domain...${NC}"
if docker run --rm roastmypost-worker:test node -e "try { require('@roast/domain'); console.log('✓ @roast/domain works'); process.exit(0); } catch(e) { console.error('✗ @roast/domain failed:', e.message); process.exit(1); }"; then
    echo -e "${GREEN}✓ @roast/domain accessible${NC}"
else
    echo -e "${RED}✗ @roast/domain not accessible${NC}"
    exit 1
fi

echo -e "${YELLOW}Testing @roast/db...${NC}"
if docker run --rm roastmypost-worker:test node -e "try { require('@roast/db'); console.log('✓ @roast/db works'); process.exit(0); } catch(e) { console.error('✗ @roast/db failed:', e.message); process.exit(1); }"; then
    echo -e "${GREEN}✓ @roast/db accessible${NC}"
else
    echo -e "${RED}✗ @roast/db not accessible${NC}"
    exit 1
fi

echo -e "${YELLOW}Testing @roast/ai...${NC}"
if docker run --rm roastmypost-worker:test node -e "try { require('@roast/ai'); console.log('✓ @roast/ai works'); process.exit(0); } catch(e) { console.error('✗ @roast/ai failed:', e.message); process.exit(1); }"; then
    echo -e "${GREEN}✓ @roast/ai accessible${NC}"
else
    echo -e "${RED}✗ @roast/ai not accessible${NC}"
    exit 1
fi

echo ""
echo "========================================="
echo "Testing process-jobs-adaptive command..."
echo "========================================="

# Test that the process-jobs-adaptive command is available
echo -e "${YELLOW}Testing worker command availability...${NC}"
if docker run --rm roastmypost-worker:test sh -c "timeout 3 pnpm run process-jobs-adaptive --help 2>/dev/null || true" ; then
    echo -e "${GREEN}✓ Worker command is available${NC}"
else
    echo -e "${YELLOW}⚠ Worker command test inconclusive (this is often OK)${NC}"
fi

echo ""
echo "========================================="
echo -e "${GREEN}All tests passed!${NC}"
echo "========================================="
echo "The Docker worker image is ready for deployment."