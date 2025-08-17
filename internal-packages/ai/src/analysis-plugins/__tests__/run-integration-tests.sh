#!/bin/bash

# Script to run single-plugin agent integration tests
# Usage: ./run-integration-tests.sh [test-pattern]

echo "🧪 Running Single-Plugin Agent Integration Tests"
echo "================================================"

# Check for API key
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "⚠️  Warning: ANTHROPIC_API_KEY not set. Most tests will be skipped."
    echo "   Only non-LLM tests (like link verification) will run."
else
    echo "✅ ANTHROPIC_API_KEY is set"
fi

echo ""

# Default to running all tests, or use provided pattern
TEST_PATTERN="${1:-single-plugin-agents.integration.test.ts}"

# Run the tests
echo "Running tests matching: $TEST_PATTERN"
echo ""

pnpm --filter @roast/ai test "$TEST_PATTERN" -- --verbose

echo ""
echo "Test run complete!"