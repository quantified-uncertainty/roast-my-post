#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo "================================================"
echo "Minimal Docker Worker Test"
echo "================================================"
echo ""

# Create a test Dockerfile that mimics production but faster
cat > Dockerfile.test-worker << 'EOF'
FROM node:20-alpine
WORKDIR /app

# Install dependencies and enable corepack
RUN apk add --no-cache libc6-compat python3 make g++
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy all source files
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build all workspace packages
RUN pnpm -r run build

# Test imports
RUN node -e "require('@roast/domain'); console.log('✓ @roast/domain works');"
RUN node -e "require('@roast/db'); console.log('✓ @roast/db works');"  
RUN node -e "require('@roast/ai'); console.log('✓ @roast/ai works');"

CMD ["echo", "All tests passed during build"]
EOF

echo -e "${YELLOW}Building test worker image...${NC}"
if docker build -f Dockerfile.test-worker -t test-worker-minimal:latest . --progress=plain 2>&1 | tee build.log | grep -E "(✓|✗|ERROR|error)"; then
    echo -e "\n${GREEN}✅ Build succeeded and all imports work!${NC}"
    rm -f Dockerfile.test-worker build.log
    docker rmi test-worker-minimal:latest 2>/dev/null || true
    exit 0
else
    echo -e "\n${RED}❌ Build failed! Check build.log for details${NC}"
    rm -f Dockerfile.test-worker
    exit 1
fi