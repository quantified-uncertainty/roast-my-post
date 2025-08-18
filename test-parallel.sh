#!/bin/bash

echo "Running tests in parallel to check status..."

# Function to run tests and report status
run_test_group() {
  group_name=$1
  test_pattern=$2
  
  echo "[$group_name] Starting tests..."
  cd /Users/ozziegooen/Documents/Github/jest-to-vitest-p2/internal-packages/ai
  
  # Run tests and capture results
  pnpm test "$test_pattern" 2>&1 | grep -E "(PASS|FAIL|✓|×)" | tail -20 > "/tmp/test-$group_name.log"
  
  # Count results
  pass_count=$(grep -c "✓\|PASS" "/tmp/test-$group_name.log" || echo 0)
  fail_count=$(grep -c "×\|FAIL" "/tmp/test-$group_name.log" || echo 0)
  
  echo "[$group_name] Complete - Pass: $pass_count, Fail: $fail_count"
}

# Run different test groups in parallel
run_test_group "tools" "src/tools/**/*.vtest.ts" &
run_test_group "plugins" "src/analysis-plugins/**/*.vtest.ts" &
run_test_group "workflows" "src/workflows/**/*.vtest.ts" &
run_test_group "helicone" "src/helicone/**/*.vtest.ts" &
run_test_group "claude" "src/claude/**/*.vtest.ts" &

# Wait for all tests to complete
wait

echo ""
echo "=== Test Summary ==="
for group in tools plugins workflows helicone claude; do
  if [ -f "/tmp/test-$group.log" ]; then
    echo "--- $group ---"
    cat "/tmp/test-$group.log" | head -10
  fi
done