#!/bin/bash
set -euo pipefail

# Comprehensive Docker check - matches what CI does
# This script runs all Docker build tests locally before pushing

echo "🐳 Docker Comprehensive Check"
echo "=============================="
echo "This runs the same checks as CI to catch issues before pushing."
echo ""

# Track failures
FAILED=false
WORKER_BUILD_SUCCESS=false

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# 1. Run basic checks first
echo "Step 1: Quick validation checks..."
echo "-----------------------------------"
echo "Checking basic requirements..."

# Check for required build outputs
if [ -d "internal-packages/db/generated" ]; then
    echo -e "${GREEN}✅ @roast/db has generated Prisma client${NC}"
else
    echo -e "${RED}❌ @roast/db missing generated directory${NC}"
    echo "Run: pnpm --filter @roast/db run gen"
    exit 1
fi

if [ -d "internal-packages/domain/dist" ]; then
    echo -e "${GREEN}✅ @roast/domain has dist directory${NC}"
else
    echo -e "${RED}❌ @roast/domain missing dist${NC}" 
    echo "Run: pnpm --filter @roast/domain run build"
    exit 1
fi

echo -e "${GREEN}✅ Basic validation passed${NC}"

echo ""
echo "Step 2: Building Docker images..."
echo "---------------------------------"

# 2. Test Worker Build
echo ""
echo "Testing Worker build..."
if docker build -f Dockerfile.worker -t roastmypost-worker:test . > /tmp/worker-build.log 2>&1; then
    echo -e "${GREEN}✅ Worker Docker build passed${NC}"
    WORKER_BUILD_SUCCESS=true
else
    echo -e "${RED}❌ Worker Docker build failed${NC}"
    echo "Last 50 lines of build log:"
    tail -50 /tmp/worker-build.log
    FAILED=true
fi

# 3. Test Worker Runtime (only if build succeeded)
if [ "$WORKER_BUILD_SUCCESS" = true ]; then
    echo ""
    echo "Testing Worker runtime package access..."
    if docker run --rm \
        -e DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5432/test" \
        -e ANTHROPIC_API_KEY="test-key" \
        -e OPENAI_API_KEY="test-key" \
        roastmypost-worker:test \
        sh -c 'cd /app/apps/web && npx tsx -e "
            try {
                require(\"@roast/domain\");
                require(\"@roast/db\");
                require(\"@roast/ai\");
                console.log(\"✅ All packages accessible\");
            } catch (e) {
                console.error(\"❌ Package loading failed:\", e.message);
                process.exit(1);
            }
        "' > /tmp/worker-runtime.log 2>&1; then
        echo -e "${GREEN}✅ Worker runtime test passed${NC}"
    else
        echo -e "${RED}❌ Worker runtime test failed${NC}"
        cat /tmp/worker-runtime.log
        FAILED=true
    fi
else
    echo -e "${YELLOW}⏭️  Skipping Worker runtime test (build failed)${NC}"
fi

# 4. Test Main App Build
echo ""
echo "Testing Main app build..."
if docker build \
    --build-arg SKIP_ENV_VALIDATION=true \
    --build-arg DATABASE_URL="postgresql://postgres:postgres@localhost:5432/test" \
    -f Dockerfile \
    -t roastmypost-web:test . > /tmp/web-build.log 2>&1; then
    echo -e "${GREEN}✅ Main app Docker build passed${NC}"
    
    # Test that .next directory exists
    echo ""
    echo "Testing that .next directory exists..."
    if docker run --rm roastmypost-web:test ls -la .next/ > /dev/null 2>&1; then
        echo -e "${GREEN}✅ .next directory found${NC}"
    else
        echo -e "${RED}❌ .next directory missing - Next.js won't start!${NC}"
        FAILED=true
    fi
    
    # Test ArgoCD simulation - the ACTUAL runtime command
    echo ""
    echo "Testing ArgoCD simulation (ACTUAL runtime)..."
    
    # Clean up any existing test containers
    docker stop argo-test 2>/dev/null || true
    docker rm argo-test 2>/dev/null || true
    
    # Run exactly like ArgoCD does
    if docker run -d --name argo-test \
        -e DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" \
        -e AUTH_SECRET="test-secret" \
        -e NEXTAUTH_URL="http://localhost:3000" \
        -e NODE_ENV="production" \
        -p 3001:3000 \
        roastmypost-web:test \
        pnpm start > /tmp/argo-start.log 2>&1; then
        
        echo -e "${GREEN}✅ ArgoCD simulation container started${NC}"
        
        # Wait for app to start
        echo "Waiting 15 seconds for app to start..."
        sleep 15
        
        # Test actual HTTP endpoints like ArgoCD would
        if curl -f -s http://localhost:3001/api/health > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Health check endpoint working${NC}"
        else
            echo -e "${RED}❌ Health check failed - app won't serve requests${NC}"
            FAILED=true
        fi
        
        if curl -f -s http://localhost:3001/ > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Main page endpoint working${NC}"
        else
            echo -e "${RED}❌ Main page failed - Next.js not serving properly${NC}"
            FAILED=true
        fi
        
        # Check for errors in logs
        if docker logs argo-test 2>&1 | grep -i "error\|fail\|exception" | grep -v "DeprecationWarning" > /tmp/argo-errors.log 2>&1; then
            if [ -s /tmp/argo-errors.log ]; then
                echo -e "${YELLOW}⚠️  Found potential errors in logs:${NC}"
                head -5 /tmp/argo-errors.log
            fi
        fi
        
        # Cleanup
        docker stop argo-test > /dev/null 2>&1
        docker rm argo-test > /dev/null 2>&1
        
    else
        echo -e "${RED}❌ ArgoCD simulation failed to start${NC}"
        echo "This means ArgoCD will definitely fail!"
        docker logs argo-test 2>/dev/null | tail -20 || echo "No logs available"
        docker stop argo-test 2>/dev/null || true
        docker rm argo-test 2>/dev/null || true
        FAILED=true
    fi
else
    echo -e "${RED}❌ Main app Docker build failed${NC}"
    echo "Last 50 lines of build log:"
    tail -50 /tmp/web-build.log
    FAILED=true
fi

# 5. Summary
echo ""
echo "=============================="
echo "Docker Check Summary"
echo "=============================="

if [ "$FAILED" = true ]; then
    echo -e "${RED}❌ Docker checks FAILED${NC}"
    echo ""
    echo "This means CI will fail if you push these changes."
    echo "Fix the issues above before pushing to avoid CI failures."
    echo ""
    echo "Debug tips:"
    echo "  - Check full logs in /tmp/*.log"
    echo "  - Run './dev/scripts/validate-monorepo.sh' for detailed package checks"
    echo "  - Run individual Docker builds to see full output"
    exit 1
else
    echo -e "${GREEN}✅ All Docker checks PASSED${NC}"
    echo ""
    echo "Safe to push - CI Docker tests should pass!"
fi

# Cleanup
rm -f /tmp/worker-build.log /tmp/worker-runtime.log /tmp/web-build.log