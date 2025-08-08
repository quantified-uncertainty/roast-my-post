#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo "================================================"
echo "Docker Build Comprehensive Test Suite"
echo "================================================"

# Function to test a Docker build
test_docker_build() {
    local dockerfile=$1
    local image_name=$2
    local test_name=$3
    
    echo -e "\n${YELLOW}Testing: $test_name${NC}"
    echo "Building from: $dockerfile"
    
    # Build the image
    if docker build -f "$dockerfile" -t "$image_name" . ; then
        echo -e "${GREEN}✓ Build succeeded${NC}"
    else
        echo -e "${RED}✗ Build failed${NC}"
        return 1
    fi
    
    # Test 1: Basic node execution
    echo "  Testing basic Node.js execution..."
    if docker run --rm "$image_name" node -e "console.log('Node test passed')"; then
        echo -e "  ${GREEN}✓ Node.js works${NC}"
    else
        echo -e "  ${RED}✗ Node.js failed${NC}"
        return 1
    fi
    
    # Test 2: Verify pnpm is available (only for worker, main uses standalone)
    if [[ "$test_name" == *"Worker"* ]]; then
        echo "  Testing pnpm availability..."
        if docker run --rm "$image_name" pnpm --version > /dev/null 2>&1; then
            echo -e "  ${GREEN}✓ pnpm is available${NC}"
        else
            echo -e "  ${RED}✗ pnpm not found${NC}"
            return 1
        fi
    else
        echo "  Skipping pnpm test for production image (uses standalone build)"
    fi
    
    # Test 3: Verify packages are available (different tests for main vs worker)
    if [[ "$test_name" == *"Worker"* ]]; then
        echo "  Testing workspace packages for worker..."
        
        # Check @roast/db package
        if docker run --rm "$image_name" node -e "
            try {
                const path = require('path');
                const fs = require('fs');
                
                // Check if @roast/db is built
                const dbPath = path.join('/app', 'internal-packages', 'db', 'dist');
                if (!fs.existsSync(dbPath)) {
                    console.error('@roast/db not built');
                    process.exit(1);
                }
                
                // Check if Prisma client is generated
                const prismaPath = path.join('/app', 'node_modules', '.prisma', 'client');
                if (!fs.existsSync(prismaPath)) {
                    console.error('Prisma client not generated');
                    process.exit(1);
                }
                
                console.log('@roast/db package OK');
            } catch (e) {
                console.error('Package check failed:', e.message);
                process.exit(1);
            }
        "; then
            echo -e "  ${GREEN}✓ @roast/db package is built${NC}"
        else
            echo -e "  ${RED}✗ @roast/db package missing or not built${NC}"
            return 1
        fi
        
        # Check @roast/domain package
        if docker run --rm "$image_name" node -e "
            try {
                const path = require('path');
                const fs = require('fs');
                
                // Check if @roast/domain is built
                const domainPath = path.join('/app', 'internal-packages', 'domain', 'dist');
                if (!fs.existsSync(domainPath)) {
                    console.error('@roast/domain not built');
                    process.exit(1);
                }
                
                console.log('@roast/domain package OK');
            } catch (e) {
                console.error('Package check failed:', e.message);
                process.exit(1);
            }
        "; then
            echo -e "  ${GREEN}✓ @roast/domain package is built${NC}"
        else
            echo -e "  ${RED}✗ @roast/domain package missing or not built${NC}"
            return 1
        fi
        
        # Check @roast/ai package
        if docker run --rm "$image_name" node -e "
            try {
                const path = require('path');
                const fs = require('fs');
                
                // Check if @roast/ai is built
                const aiPath = path.join('/app', 'internal-packages', 'ai', 'dist');
                if (!fs.existsSync(aiPath)) {
                    console.error('@roast/ai not built');
                    process.exit(1);
                }
                
                console.log('@roast/ai package OK');
            } catch (e) {
                console.error('Package check failed:', e.message);
                process.exit(1);
            }
        "; then
            echo -e "  ${GREEN}✓ @roast/ai package is built${NC}"
        else
            echo -e "  ${RED}✗ @roast/ai package missing or not built${NC}"
            return 1
        fi
    else
        echo "  Testing main application structure..."
        
        # For main image, check essential runtime files
        if docker run --rm "$image_name" node -e "
            try {
                const path = require('path');
                const fs = require('fs');
                
                // Check if server.js exists (Next.js standalone)
                if (!fs.existsSync('/app/apps/web/server.js')) {
                    console.error('server.js not found');
                    process.exit(1);
                }
                
                // Check if static assets exist
                if (!fs.existsSync('/app/apps/web/.next/static')) {
                    console.error('Static assets not found');
                    process.exit(1);
                }
                
                // Check if prisma schema is available
                if (!fs.existsSync('/app/prisma')) {
                    console.error('Prisma schema not found');
                    process.exit(1);
                }
                
                console.log('Main application structure OK');
            } catch (e) {
                console.error('Structure check failed:', e.message);
                process.exit(1);
            }
        "; then
            echo -e "  ${GREEN}✓ Main application structure is correct${NC}"
        else
            echo -e "  ${RED}✗ Main application structure missing components${NC}"
            return 1
        fi
    fi
    
    # Test 4: Test application can start (different tests for main vs worker)
    if [[ "$test_name" == *"Worker"* ]]; then
        echo "  Testing workspace module imports..."
        if docker run --rm "$image_name" node -e "
            try {
                // Test that requiring internal packages would work
                const path = require('path');
                const fs = require('fs');
                
                // Check package.json files exist for workspace packages
                const packages = ['@roast/db', '@roast/domain', '@roast/ai'];
                for (const pkg of packages) {
                    const pkgJsonPath = path.join('/app', 'node_modules', pkg, 'package.json');
                    if (!fs.existsSync(pkgJsonPath)) {
                        console.error(\`Package \${pkg} not properly linked in node_modules\`);
                        process.exit(1);
                    }
                }
                
                console.log('All workspace packages properly linked');
            } catch (e) {
                console.error('Import test failed:', e.message);
                process.exit(1);
            }
        "; then
            echo -e "  ${GREEN}✓ Module imports configured correctly${NC}"
        else
            echo -e "  ${RED}✗ Module import configuration failed${NC}"
            return 1
        fi
    else
        echo "  Testing standalone application..."
        # For main image, test that the Next.js server can at least initialize
        if docker run --rm "$image_name" timeout 5 node /app/apps/web/server.js > /dev/null 2>&1 || [ $? -eq 124 ]; then
            echo -e "  ${GREEN}✓ Standalone server can initialize${NC}"
        else
            echo -e "  ${RED}✗ Standalone server failed to initialize${NC}"
            return 1
        fi
    fi
    
    echo -e "${GREEN}All tests passed for $test_name!${NC}"
    return 0
}

# Test worker-specific functionality
test_worker_functionality() {
    local image_name=$1
    
    echo -e "\n${YELLOW}Testing Worker-specific functionality${NC}"
    
    # Test that the worker can access the job processor script
    echo "  Checking job processor script..."
    if docker run --rm "$image_name" test -f /app/apps/web/scripts/adaptive-job-processor.ts; then
        echo -e "  ${GREEN}✓ Job processor script exists${NC}"
    else
        echo -e "  ${RED}✗ Job processor script not found${NC}"
        return 1
    fi
    
    # Test that tsx is available for running TypeScript
    echo "  Testing tsx availability..."
    if docker run --rm "$image_name" pnpm tsx --version > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓ tsx is available${NC}"
    else
        echo -e "  ${RED}✗ tsx not found${NC}"
        return 1
    fi
    
    echo -e "${GREEN}Worker-specific tests passed!${NC}"
    return 0
}

# Main test execution
FAILED_TESTS=0
TOTAL_TESTS=0

# Test main Dockerfile
echo -e "\n${YELLOW}════════════════════════════════════════${NC}"
echo -e "${YELLOW}Testing Main Dockerfile${NC}"
echo -e "${YELLOW}════════════════════════════════════════${NC}"
((TOTAL_TESTS++))
if test_docker_build "Dockerfile" "roastmypost-test:main" "Main Application"; then
    echo -e "${GREEN}✓ Main Dockerfile tests passed${NC}"
else
    echo -e "${RED}✗ Main Dockerfile tests failed${NC}"
    ((FAILED_TESTS++))
fi

# Test Worker Dockerfile
echo -e "\n${YELLOW}════════════════════════════════════════${NC}"
echo -e "${YELLOW}Testing Worker Dockerfile${NC}"
echo -e "${YELLOW}════════════════════════════════════════${NC}"
((TOTAL_TESTS++))
if test_docker_build "Dockerfile.worker" "roastmypost-test:worker" "Worker Application"; then
    # Additional worker-specific tests
    if test_worker_functionality "roastmypost-test:worker"; then
        echo -e "${GREEN}✓ Worker Dockerfile tests passed${NC}"
    else
        echo -e "${RED}✗ Worker-specific tests failed${NC}"
        ((FAILED_TESTS++))
    fi
else
    echo -e "${RED}✗ Worker Dockerfile tests failed${NC}"
    ((FAILED_TESTS++))
fi

# Clean up test images
echo -e "\n${YELLOW}Cleaning up test images...${NC}"
docker rmi roastmypost-test:main roastmypost-test:worker 2>/dev/null || true

# Summary
echo -e "\n================================================"
echo "Test Summary"
echo "================================================"
echo "Total tests run: $TOTAL_TESTS"
echo "Failed tests: $FAILED_TESTS"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ All Docker build tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ $FAILED_TESTS test(s) failed${NC}"
    exit 1
fi