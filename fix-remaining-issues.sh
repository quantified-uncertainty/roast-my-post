#!/bin/bash

echo "Fixing remaining test issues..."

# Fix 1: Replace require with vi.importActual
find internal-packages/ai -name "*.vtest.ts" -exec sed -i '' \
  "s/const \(.*\) = require(\(.*\))/const \1 = await vi.importActual(\2)/g" {} \;

# Fix 2: Make test functions async if they use await vi.importActual
find internal-packages/ai -name "*.vtest.ts" -exec sed -i '' \
  "s/beforeEach(() => {/beforeEach(async () => {/g" {} \;

# Fix 3: Fix specific mock patterns
find internal-packages/ai -name "*.vtest.ts" -exec sed -i '' \
  "s/\.mockResolvedValue(/\.mockImplementation(() => Promise.resolve(/g" {} \;
  
find internal-packages/ai -name "*.vtest.ts" -exec sed -i '' \
  "s/\.mockRejectedValue(/\.mockImplementation(() => Promise.reject(/g" {} \;

# Fix 4: Fix vi.fn() calls with initial implementation
find internal-packages/ai -name "*.vtest.ts" -exec sed -i '' \
  "s/vi\.fn()\.mockResolvedValue(/vi.fn().mockImplementation(() => Promise.resolve(/g" {} \;

echo "Fixes applied!"