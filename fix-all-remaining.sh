#!/bin/bash

echo "Fixing all remaining test issues..."

# Fix 1: Fix all syntax errors with Promise.resolve patterns
find internal-packages/ai -name "*.vtest.ts" -exec sed -i '' \
  -e 's/Promise\.resolve((/Promise.resolve(/g' \
  -e 's/Promise\.reject((/Promise.reject(/g' \
  -e 's/}))}/)}/g' {} \;

# Fix 2: Fix mockImplementation patterns
find internal-packages/ai -name "*.vtest.ts" -exec sed -i '' \
  's/\.mockImplementation(() => Promise\.resolve(({\(.*\)}))/\.mockImplementation(() => Promise.resolve({\1}))/g' {} \;

# Fix 3: Fix missing vitest imports
find internal-packages/ai -name "*.vtest.ts" | while read file; do
  # Check if file uses vi but doesn't import it
  if grep -q "vi\." "$file" && ! grep -q "import.*{.*vi.*}.*from.*'vitest'" "$file"; then
    # Add vi to existing vitest import if exists
    if grep -q "import.*from.*'vitest'" "$file"; then
      sed -i '' "s/import { \(.*\) } from 'vitest'/import { \1, vi } from 'vitest'/g" "$file"
    else
      # Add new import at top
      sed -i '' "1i\\
import { vi } from 'vitest';\\
" "$file"
    fi
  fi
done

# Fix 4: Fix test files that use 'it' instead of 'test'
find internal-packages/ai -name "*.vtest.ts" -exec sed -i '' \
  "s/import { describe, it,/import { describe, test as it,/g" {} \;

echo "Fixes applied!"