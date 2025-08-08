#!/bin/bash

# Test script for Docker builds

echo "Testing Docker worker build..."
echo "=============================="

# Build the worker image
echo "Building worker image..."
docker build -f Dockerfile.worker -t roastmypost-worker:test . || {
    echo "❌ Worker build failed"
    exit 1
}

echo "✅ Worker build succeeded"

# Test runtime access to packages
echo ""
echo "Testing runtime package access..."
docker run --rm \
  -e DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5432/roast_my_post?schema=public" \
  -e ANTHROPIC_API_KEY="test-key" \
  -e OPENAI_API_KEY="test-key" \
  -e INNGEST_EVENT_KEY="test-key" \
  -e INNGEST_SIGNING_KEY="test-key" \
  -e NEXTAUTH_SECRET="test-secret" \
  -e NEXTAUTH_URL="http://localhost:3000" \
  -e AUTH_SECRET="test-secret" \
  roastmypost-worker:test \
  sh -c 'cd /app/apps/web && node -e "
    console.log(\"Testing package access...\");
    try {
      const domain = require(\"@roast/domain\");
      console.log(\"✅ @roast/domain loaded\");
      const db = require(\"@roast/db\");
      console.log(\"✅ @roast/db loaded\");
      const ai = require(\"@roast/ai\");
      console.log(\"✅ @roast/ai loaded\");
      console.log(\"✅ All packages accessible!\");
    } catch (err) {
      console.error(\"❌ Package load failed:\", err.message);
      process.exit(1);
    }
  "' || {
    echo "❌ Runtime test failed"
    exit 1
}

echo ""
echo "✅ All Docker tests passed!"