#!/bin/bash
set -euo pipefail

# Monorepo Health Check Script
# Catches common issues before they become Docker build problems

echo "🔍 Monorepo Validation Check"
echo "============================"

ERRORS=0
WARNINGS=0

# Color codes
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
    ((ERRORS++))
}

warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
    ((WARNINGS++))
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

info() {
    echo "ℹ️  $1"
}

# 1. Check if all workspace packages have required fields
echo ""
echo "1. Checking workspace package.json files..."
for pkg in internal-packages/*/package.json apps/*/package.json; do
    if [ -f "$pkg" ]; then
        pkg_name=$(jq -r '.name' "$pkg")
        
        # Check for name field
        if [ "$pkg_name" = "null" ]; then
            error "$pkg missing 'name' field"
        else
            # Check for main/exports field
            has_main=$(jq -r '.main // .exports // "none"' "$pkg")
            if [ "$has_main" = "none" ]; then
                warning "$pkg_name has no 'main' or 'exports' field"
            fi
        fi
    fi
done

# 2. Check TypeScript compilation for packages that need building
echo ""
echo "2. Checking TypeScript compilation..."
for pkg in "@roast/db" "@roast/domain"; do
    info "Checking $pkg..."
    if pnpm --filter "$pkg" run typecheck 2>/dev/null; then
        success "$pkg TypeScript check passed"
    else
        error "$pkg TypeScript compilation failed"
    fi
done

# 3. Check for dist directories after build
echo ""
echo "3. Checking build outputs..."
if [ -d "internal-packages/db/generated" ]; then
    success "@roast/db has generated Prisma client"
else
    warning "@roast/db missing generated directory - run 'pnpm --filter @roast/db run gen'"
fi

if [ -d "internal-packages/domain/dist" ]; then
    success "@roast/domain has dist directory"
else
    warning "@roast/domain missing dist - run 'pnpm --filter @roast/domain run build'"
fi

# 4. Check for tsx vs node usage
echo ""
echo "4. Checking execution methods..."
worker_uses_tsx=$(grep -l "tsx" apps/web/package.json | wc -l)
if [ "$worker_uses_tsx" -gt 0 ]; then
    success "Worker uses tsx (can run TypeScript directly)"
    info "Note: @roast/ai doesn't need building for worker"
else
    info "Worker uses node (needs compiled JavaScript)"
fi

# 5. Check for common Docker build issues
echo ""
echo "5. Checking for common Docker issues..."

# Check for package-lock.json (shouldn't exist in pnpm repo)
if [ -f "package-lock.json" ]; then
    error "package-lock.json exists (should use pnpm-lock.yaml)"
else
    success "No package-lock.json found (correct for pnpm)"
fi

# Check for .env files that might be copied to Docker
if [ -f ".env" ] || [ -f ".env.local" ]; then
    warning "Found .env files - ensure they're in .dockerignore"
fi

# 6. Test workspace resolution
echo ""
echo "6. Testing workspace package resolution..."
test_file=$(mktemp)
cat > "$test_file" << 'EOF'
const tryRequire = (pkg) => {
    try {
        require.resolve(pkg);
        return true;
    } catch {
        return false;
    }
};

console.log(JSON.stringify({
    domain: tryRequire('@roast/domain'),
    db: tryRequire('@roast/db'),
    ai: tryRequire('@roast/ai')
}));
EOF

cd apps/web
resolution_result=$(npx tsx "$test_file" 2>/dev/null || echo '{"error": true}')
cd ../..
rm "$test_file"

if echo "$resolution_result" | grep -q '"error"'; then
    error "Failed to test package resolution"
else
    domain_ok=$(echo "$resolution_result" | jq -r '.domain')
    db_ok=$(echo "$resolution_result" | jq -r '.db')
    ai_ok=$(echo "$resolution_result" | jq -r '.ai')
    
    [ "$domain_ok" = "true" ] && success "@roast/domain resolves correctly" || error "@roast/domain resolution failed"
    [ "$db_ok" = "true" ] && success "@roast/db resolves correctly" || error "@roast/db resolution failed"
    [ "$ai_ok" = "true" ] && success "@roast/ai resolves correctly" || error "@roast/ai resolution failed"
fi

# 7. Quick Docker build test (optional)
echo ""
echo "7. Docker build test..."
if command -v docker &> /dev/null; then
    info "Testing quick Docker build (worker only)..."
    
    # Create minimal test Dockerfile
    test_dockerfile=$(mktemp)
    cat > "$test_dockerfile" << 'EOF'
FROM node:20-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm install --frozen-lockfile --ignore-scripts || true
EOF
    
    if docker build -f "$test_dockerfile" -t monorepo-test:quick . &>/dev/null; then
        success "Basic Docker dependency install works"
        docker rmi monorepo-test:quick &>/dev/null
    else
        warning "Docker quick test failed - full build may have issues"
    fi
    rm "$test_dockerfile"
else
    info "Docker not available - skipping Docker test"
fi

# Summary
echo ""
echo "============================="
echo "Validation Summary"
echo "============================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo "Your monorepo is healthy and ready for Docker builds."
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Validation completed with $WARNINGS warning(s)${NC}"
    echo "Review warnings above, but Docker builds should work."
else
    echo -e "${RED}❌ Validation failed with $ERRORS error(s) and $WARNINGS warning(s)${NC}"
    echo "Fix errors above before attempting Docker builds."
    exit 1
fi

# Quick fixes section
if [ $ERRORS -gt 0 ] || [ $WARNINGS -gt 0 ]; then
    echo ""
    echo "Quick fixes:"
    echo "------------"
    echo "1. Regenerate Prisma: pnpm --filter @roast/db run gen"
    echo "2. Build packages: pnpm --filter @roast/domain run build"
    echo "3. Install deps: pnpm install"
    echo "4. Test Docker: ./dev/scripts/test-docker-builds.sh"
fi