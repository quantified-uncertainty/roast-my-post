#!/bin/bash
# Debug script for Docker worker build issues

set -e

echo "========================================="
echo "Docker Worker Debug Build"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Build with specific target to debug step by step
echo -e "${YELLOW}Building up to the base stage...${NC}"

# Build and stop at the base stage
docker build -f Dockerfile.worker --target base -t roastmypost-worker:debug . || {
    echo -e "${RED}Build failed!${NC}"
    exit 1
}

echo -e "${GREEN}✓ Base stage built${NC}"
echo ""

# Now let's check what's in the deployment
echo -e "${YELLOW}Checking what's in /prod/worker/node_modules/@roast...${NC}"
docker run --rm roastmypost-worker:debug sh -c "ls -la /prod/worker/node_modules/@roast/" || echo "Failed to list @roast packages"

echo ""
echo -e "${YELLOW}Checking @roast/domain structure...${NC}"
docker run --rm roastmypost-worker:debug sh -c "ls -la /prod/worker/node_modules/@roast/domain/" || echo "Failed to list @roast/domain"

echo ""
echo -e "${YELLOW}Checking @roast/db structure...${NC}"
docker run --rm roastmypost-worker:debug sh -c "ls -la /prod/worker/node_modules/@roast/db/" || echo "Failed to list @roast/db"

echo ""
echo -e "${YELLOW}Checking if dist directories exist...${NC}"
docker run --rm roastmypost-worker:debug sh -c "
    echo 'Checking @roast/domain/dist:' && ls -la /prod/worker/node_modules/@roast/domain/dist 2>/dev/null || echo '  NOT FOUND'
    echo ''
    echo 'Checking @roast/db/dist:' && ls -la /prod/worker/node_modules/@roast/db/dist 2>/dev/null || echo '  NOT FOUND'
    echo ''
    echo 'Checking @roast/db/generated:' && ls -la /prod/worker/node_modules/@roast/db/generated 2>/dev/null || echo '  NOT FOUND'
"

echo ""
echo -e "${YELLOW}Testing require() for each package...${NC}"
docker run --rm roastmypost-worker:debug sh -c "cd /prod/worker && node -e \"
    console.log('Testing package requires:');
    try { 
        require('@roast/domain'); 
        console.log('✓ @roast/domain works'); 
    } catch(e) { 
        console.error('✗ @roast/domain failed:', e.message); 
    }
    try { 
        require('@roast/db'); 
        console.log('✓ @roast/db works'); 
    } catch(e) { 
        console.error('✗ @roast/db failed:', e.message); 
    }
    try { 
        require('@roast/ai'); 
        console.log('✓ @roast/ai works'); 
    } catch(e) { 
        console.error('✗ @roast/ai failed:', e.message); 
    }
\""