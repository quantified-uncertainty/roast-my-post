#!/bin/bash

# Script to run AI validation tests with Sonnet 4
# This uses the ANALYSIS_MODEL for validating tool outputs

echo "Running Tool AI Validation Tests with Sonnet 4..."
echo "================================================"

# Check if API key is set
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "⚠️  ANTHROPIC_API_KEY not found in environment"
    echo "   To run AI validation tests, set your API key:"
    echo "   export ANTHROPIC_API_KEY='your-api-key-here'"
    exit 1
fi

# Set the ANALYSIS_MODEL to Sonnet 4 if not already set
export ANALYSIS_MODEL="${ANALYSIS_MODEL:-claude-3-5-sonnet-20241022}"

echo "✓ Using model: $ANALYSIS_MODEL"
echo ""

# Run the AI validation tests
echo "Running tests..."
pnpm playwright test tools-validation.spec.ts \
    --grep "Tool AI Validation Tests" \
    --reporter=list

# Capture the exit code
TEST_EXIT_CODE=$?

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ Test completed successfully!"
else
    echo "❌ Test failed with exit code: $TEST_EXIT_CODE"
fi

# Exit with the test's exit code to propagate to CI
exit $TEST_EXIT_CODE