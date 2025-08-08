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

# 1. Run monorepo validation first
echo "Step 1: Validating monorepo structure..."
echo "----------------------------------------"
if ./dev/scripts/validate-monorepo.sh; then
    echo -e "${GREEN}✅ Monorepo validation passed${NC}"
else
    echo -e "${RED}❌ Monorepo validation failed${NC}"
    echo "Fix issues above before continuing."
    exit 1
fi

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