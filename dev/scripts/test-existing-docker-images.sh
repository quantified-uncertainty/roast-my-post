#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo "================================================"
echo "Testing Existing Docker Images"
echo "================================================"

# Test main image
echo -e "\n${YELLOW}Testing Main Image (roastmypost-test:main)${NC}"

if docker image inspect roastmypost-test:main > /dev/null 2>&1; then
    echo "✓ Main image exists"
    
    # Test basic Node.js
    echo "  Testing basic Node.js..."
    if docker run --rm roastmypost-test:main node -e "console.log('Node test passed')"; then
        echo -e "  ${GREEN}✓ Node.js works${NC}"
    else
        echo -e "  ${RED}✗ Node.js failed${NC}"
        exit 1
    fi
    
    # Test application structure
    echo "  Testing application structure..."
    if docker run --rm roastmypost-test:main node -e "
        const fs = require('fs');
        if (!fs.existsSync('/app/apps/web/server.js')) {
            console.error('server.js not found');
            process.exit(1);
        }
        if (!fs.existsSync('/app/apps/web/.next/static')) {
            console.error('Static assets not found');
            process.exit(1);
        }
        if (!fs.existsSync('/app/prisma')) {
            console.error('Prisma schema not found');
            process.exit(1);
        }
        console.log('Main application structure OK');
    "; then
        echo -e "  ${GREEN}✓ Main application structure is correct${NC}"
    else
        echo -e "  ${RED}✗ Main application structure missing components${NC}"
        exit 1
    fi
    
    # Test server initialization
    echo "  Testing server initialization..."
    if timeout 5 docker run --rm roastmypost-test:main node /app/apps/web/server.js > /dev/null 2>&1 || [ $? -eq 124 ]; then
        echo -e "  ${GREEN}✓ Standalone server can initialize${NC}"
    else
        echo -e "  ${RED}✗ Standalone server failed to initialize${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Main image tests passed!${NC}"
else
    echo -e "${RED}✗ Main image not found - run docker build first${NC}"
    exit 1
fi

# Test worker image
echo -e "\n${YELLOW}Testing Worker Image (roastmypost-test:worker)${NC}"

if docker image inspect roastmypost-test:worker > /dev/null 2>&1; then
    echo "✓ Worker image exists"
    
    # Test basic Node.js
    echo "  Testing basic Node.js..."
    if docker run --rm roastmypost-test:worker node -e "console.log('Node test passed')"; then
        echo -e "  ${GREEN}✓ Node.js works${NC}"
    else
        echo -e "  ${RED}✗ Node.js failed${NC}"
        exit 1
    fi
    
    # Test pnpm availability
    echo "  Testing pnpm availability..."
    if docker run --rm roastmypost-test:worker pnpm --version > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓ pnpm is available${NC}"
    else
        echo -e "  ${RED}✗ pnpm not found${NC}"
        exit 1
    fi
    
    # Test workspace packages
    echo "  Testing workspace packages..."
    if docker run --rm roastmypost-test:worker node -e "
        const fs = require('fs');
        const packages = [
            '/app/internal-packages/db/dist',
            '/app/internal-packages/domain/dist',
            '/app/internal-packages/ai/dist',
            '/app/node_modules/.prisma/client'
        ];
        
        let failed = false;
        for (const path of packages) {
            if (!fs.existsSync(path)) {
                console.error(\`Missing: \${path}\`);
                failed = true;
            }
        }
        
        if (failed) {
            process.exit(1);
        } else {
            console.log('All workspace packages are built');
        }
    "; then
        echo -e "  ${GREEN}✓ All workspace packages are built${NC}"
    else
        echo -e "  ${RED}✗ Some workspace packages missing${NC}"
        exit 1
    fi
    
    # Test tsx availability
    echo "  Testing tsx availability..."
    if docker run --rm roastmypost-test:worker pnpm tsx --version > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓ tsx is available${NC}"
    else
        echo -e "  ${RED}✗ tsx not found${NC}"
        exit 1
    fi
    
    # Test job processor script
    echo "  Testing job processor script..."
    if docker run --rm roastmypost-test:worker test -f /app/apps/web/scripts/adaptive-job-processor.ts; then
        echo -e "  ${GREEN}✓ Job processor script exists${NC}"
    else
        echo -e "  ${RED}✗ Job processor script missing${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Worker image tests passed!${NC}"
else
    echo -e "${RED}✗ Worker image not found - run docker build first${NC}"
    exit 1
fi

echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}All Docker image tests passed!${NC}"
echo -e "${GREEN}================================================${NC}"