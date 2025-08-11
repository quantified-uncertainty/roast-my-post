#!/bin/bash

# Quick Tool Validation Script
# Runs parallel tests of all tools and provides confidence score

echo "================================================"
echo "QUICK TOOL VALIDATION (Parallel Execution)"
echo "================================================"
echo ""

# Check if server is running
if ! curl -s http://localhost:3000 > /dev/null; then
  echo "❌ Server not running on port 3000"
  echo "   Please start with: pnpm dev"
  exit 1
fi

echo "✅ Server is running"
echo ""

# Run Playwright tests with increased parallelization
echo "Running tool validation tests with 4 parallel workers..."
echo "================================================"

# Set environment to enable parallelization
export PLAYWRIGHT_WORKERS=4

# Run the e2e validation tests
pnpm playwright test tools-e2e-validation.spec.ts --reporter=line 2>&1 | tee test-results.log

# Extract results
PASSED=$(grep -c "✓" test-results.log || echo 0)
FAILED=$(grep -c "✘" test-results.log || echo 0)
TOTAL=$((PASSED + FAILED))

echo ""
echo "================================================"
echo "RESULTS SUMMARY"
echo "================================================"

if [ $TOTAL -gt 0 ]; then
  CONFIDENCE=$((PASSED * 100 / TOTAL))
else
  CONFIDENCE=0
fi

echo "Tests Passed: $PASSED"
echo "Tests Failed: $FAILED"
echo "Total Tests: $TOTAL"
echo ""
echo "CONFIDENCE LEVEL: ${CONFIDENCE}%"

if [ $CONFIDENCE -ge 99 ]; then
  echo "✅ EXCELLENT: 99% confidence achieved!"
elif [ $CONFIDENCE -ge 90 ]; then
  echo "🟢 GOOD: ${CONFIDENCE}% confidence - Almost there!"
elif [ $CONFIDENCE -ge 70 ]; then
  echo "🟡 FAIR: ${CONFIDENCE}% confidence - Some issues remain"
else
  echo "🔴 NEEDS WORK: ${CONFIDENCE}% confidence - Multiple issues found"
fi

echo "================================================"

# Clean up
rm -f test-results.log

exit $((100 - CONFIDENCE))