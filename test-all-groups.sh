#!/bin/bash

# Test each group and collect results
echo "Testing all groups systematically..."

test_group() {
  local name=$1
  local pattern=$2
  echo ""
  echo "=== Testing $name ==="
  pnpm test "$pattern" 2>&1 | grep -E "Test Files|Tests" | tail -2
}

# Test each directory
test_group "Claude" "src/claude/**/*.vtest.ts"
test_group "Tools" "src/tools/**/*.vtest.ts"
test_group "Plugins" "src/analysis-plugins/**/*.vtest.ts"
test_group "Workflows" "src/workflows/**/*.vtest.ts"
test_group "Helicone" "src/helicone/**/*.vtest.ts"
test_group "Text Location" "src/text-location/**/*.vtest.ts"
test_group "Integration" "src/__tests__/**/*.vtest.ts"

echo ""
echo "=== SUMMARY ==="
echo "Run 'pnpm test' to see detailed failure messages"