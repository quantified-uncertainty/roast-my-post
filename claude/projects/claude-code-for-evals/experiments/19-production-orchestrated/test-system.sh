#!/bin/bash

# Test script for production orchestrated analysis

set -euo pipefail

echo "🧪 SYSTEM TEST FOR EXPERIMENT 19"
echo "================================"
echo

# Check dependencies
echo "📋 Checking dependencies..."
command -v claude >/dev/null 2>&1 || { echo "❌ claude CLI not found"; exit 1; }
command -v parallel >/dev/null 2>&1 || { echo "❌ GNU parallel not found"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js not found"; exit 1; }
echo "   ✅ All dependencies found"
echo

# Test 1: Cost estimation
echo "💰 Test 1: Cost estimation"
echo "   Running cost estimate on comprehensive-test.md..."
node lib/estimate-costs.js comprehensive-test.md . > /dev/null
if [ -f "cost-estimate.txt" ]; then
    echo "   ✅ Cost estimation working"
    grep "ESTIMATED TOTAL COST" cost-estimate.txt
else
    echo "   ❌ Cost estimation failed"
fi
echo

# Test 2: Document classification
echo "🏷️  Test 2: Document classification"
echo "   Testing LLM classification..."
OUTPUT=$(node lib/analyze-document.js comprehensive-test.md /tmp/test-classification 2>&1)
if echo "$OUTPUT" | grep -q "empirical_research"; then
    echo "   ✅ Classification working"
    echo "   Document type: $(echo "$OUTPUT" | jq -r '.type' 2>/dev/null || echo "empirical_research")"
else
    echo "   ❌ Classification failed"
fi
echo

# Test 3: Simple analysis (quick)
echo "🚀 Test 3: Quick analysis test"
cat > test-quick.md << 'EOF'
# Quick Test
The Federal Reserve interest rate is 5.5% as of 2024.
EOF

echo "   Running analysis on simple test document..."
echo "   This should complete in ~1 minute..."

# Run with minimal parallelism for testing
MAX_PARALLEL=2 ./orchestrate-analysis.sh test-quick.md 2>&1 | \
    grep -v "/dev/tty" | \
    grep -E "(Phase|Complete|Source|Cost)" | \
    tail -20

# Check if output was created
LATEST_OUTPUT=$(ls -td outputs/test-quick-* 2>/dev/null | head -1)
if [ -n "$LATEST_OUTPUT" ] && [ -f "$LATEST_OUTPUT/final-report.md" ]; then
    echo
    echo "   ✅ Analysis completed successfully"
    echo "   Output: $LATEST_OUTPUT"
    
    # Check for source citations
    if grep -q "Source:" "$LATEST_OUTPUT/all-findings.json" 2>/dev/null; then
        echo "   ✅ Source citations included"
    else
        echo "   ⚠️  No source citations found"
    fi
    
    # Check for cost report
    if [ -f "$LATEST_OUTPUT/cost-summary.txt" ]; then
        echo "   ✅ Cost tracking working"
    else
        echo "   ⚠️  Cost tracking not working"
    fi
else
    echo "   ❌ Analysis failed or incomplete"
fi

# Cleanup
rm -f test-quick.md cost-estimate.txt cost-estimate.json

echo
echo "🏁 Test suite complete!"
echo
echo "Next steps:"
echo "1. Run full analysis: ./orchestrate-analysis.sh comprehensive-test.md"
echo "2. Check costs after completion"
echo "3. Review final report for source citations"