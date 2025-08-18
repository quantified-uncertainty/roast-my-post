#!/bin/bash

# Script to migrate test files from Jest to Vitest
# Usage: ./migrate-ai-tests.sh <directory>

DIR="${1:-/Users/ozziegooen/Documents/Github/jest-to-vitest-p2/internal-packages/ai}"

# Function to convert a single test file
convert_file() {
    local file="$1"
    echo "Converting: $file"
    
    # Replace Jest imports with Vitest
    sed -i '' \
        -e "s/import { describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll, jest } from '@jest\/globals'/import { describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest'/g" \
        -e "s/from '@jest\/globals'/from 'vitest'/g" \
        -e 's/jest\.fn()/vi.fn()/g' \
        -e 's/jest\.mock/vi.mock/g' \
        -e 's/jest\.unmock/vi.unmock/g' \
        -e 's/jest\.spyOn/vi.spyOn/g' \
        -e 's/jest\.clearAllMocks/vi.clearAllMocks/g' \
        -e 's/jest\.resetAllMocks/vi.resetAllMocks/g' \
        -e 's/jest\.restoreAllMocks/vi.restoreAllMocks/g' \
        -e 's/jest\.mocked/vi.mocked/g' \
        -e 's/jest\.Mock/any/g' \
        -e 's/jest\.Mocked/any/g' \
        -e 's/jest\.MockedFunction/any/g' \
        -e 's/as jest\./as vi./g' \
        "$file"
    
    # Rename the file
    local newfile="${file%.test.ts}.vtest.ts"
    if [[ "$file" == *.test.tsx ]]; then
        newfile="${file%.test.tsx}.vtest.tsx"
    fi
    
    mv "$file" "$newfile"
    echo "  -> Renamed to: $(basename "$newfile")"
}

# Find and convert all test files in the directory
find "$DIR" -type f \( -name "*.test.ts" -o -name "*.test.tsx" \) | while read -r file; do
    convert_file "$file"
done

echo "Migration complete!"