#!/bin/bash

echo "Comprehensive test fixes..."

# Find all test files with issues and fix them in parallel
find internal-packages/ai -name "*.vtest.ts" -print0 | xargs -0 -P 8 -I {} bash -c '
  file="$1"
  
  # Fix 1: Replace jest with vi in imports
  sed -i "" "s/import { describe, test, expect, jest/import { describe, test, expect, vi/g" "$file"
  sed -i "" "s/import { describe, it, expect, jest/import { describe, it, expect, vi/g" "$file"
  
  # Fix 2: Fix mockResolvedValue patterns
  sed -i "" "s/\.mockResolvedValue(/\.mockImplementation(() => Promise.resolve(/g" "$file"
  sed -i "" "s/\.mockResolvedValueOnce(/\.mockImplementationOnce(() => Promise.resolve(/g" "$file"
  sed -i "" "s/\.mockRejectedValue(/\.mockImplementation(() => Promise.reject(/g" "$file"
  sed -i "" "s/\.mockRejectedValueOnce(/\.mockImplementationOnce(() => Promise.reject(/g" "$file"
  
  # Fix 3: Replace require() with proper imports (commented out - too complex for sed)
  # This needs manual fixes
  
  # Fix 4: Add missing vi import if needed
  if grep -q "vi\." "$file" && ! grep -q "import.*vi.*from.*vitest" "$file"; then
    sed -i "" "1s/^/import { vi } from '\''vitest'\'';\n/" "$file"
  fi
  
  # Fix 5: Fix closing parentheses for Promise.resolve/reject
  sed -i "" "s/Promise.resolve({/Promise.resolve(({/g" "$file"
  sed -i "" "s/Promise.reject({/Promise.reject(({/g" "$file"
  
' -- {}

echo "Fixes applied!"