#!/bin/bash

# Test script for all three analyzers

set -euo pipefail

echo "🧪 Testing Experiment 20 Analyzers"
echo "=================================="
echo

# Create a simple test document if it doesn't exist
if [ ! -f "test-documents/simple-test.md" ]; then
    mkdir -p test-documents
    cat > test-documents/simple-test.md << 'EOF'
# Simple Test Document

The population of the United States is approximately 500 million people as of 2024.

This represents a 50% increase from 2020, when the population was 250 million.

## Economic Claims

The GDP growth rate in 2024 was 15%, the highest in history.

## Conclusion

These statistics show that growth is accelerating. However, earlier we said growth was slowing.
EOF
fi

# Test 1: Simple Analyzer
echo "1️⃣  Testing Simple Analyzer..."
echo "   Running: ./simple-analyzer.js test-documents/simple-test.md"
if ./simple-analyzer.js test-documents/simple-test.md > /dev/null 2>&1; then
    echo "   ✅ Simple analyzer works"
    LATEST=$(ls -td outputs/simple-test-* 2>/dev/null | head -1)
    if [ -f "$LATEST/report.md" ]; then
        echo "   Output: $LATEST"
        echo "   Findings: $(cat "$LATEST/findings.json" | grep -c "line" || echo "0")"
    fi
else
    echo "   ❌ Simple analyzer failed"
fi
echo

# Test 2: Resumable Analyzer (with interrupt simulation)
echo "2️⃣  Testing Resumable Analyzer..."
echo "   Running: ./resumable-analyzer.js test-documents/simple-test.md"

# Start the analyzer in background
./resumable-analyzer.js test-documents/simple-test.md > resumable-test.log 2>&1 &
PID=$!

# Let it run for 3 seconds then check
sleep 3

if kill -0 $PID 2>/dev/null; then
    # Still running, good
    echo "   ✅ Resumable analyzer started"
    
    # Check if state file was created
    LATEST=$(ls -td outputs/simple-test-* 2>/dev/null | grep -v "$(ls -td outputs/simple-test-* | head -1)" | head -1)
    if [ -f "$LATEST/state.json" ]; then
        echo "   ✅ State file created: $LATEST/state.json"
        
        # Show job status
        TOTAL=$(cat "$LATEST/state.json" | grep -c '"id": "job-' || echo "0")
        echo "   Jobs created: $TOTAL"
    fi
    
    # Kill it to test resumption
    kill $PID 2>/dev/null || true
    wait $PID 2>/dev/null || true
    
    echo "   Process stopped for resumption test"
else
    echo "   ⚠️  Analyzer completed too quickly for interrupt test"
fi

# Clean up
rm -f resumable-test.log
echo

# Test 3: Prompt-Based Analyzer
echo "3️⃣  Testing Prompt-Based Analyzer..."

# First list available prompts
echo "   Available prompt types:"
./prompt-based-analyzer.js --list | grep "^  " | head -5 | sed 's/^/     /'
echo "     ... and more"
echo

# Run with specific prompts
echo "   Running: ./prompt-based-analyzer.js test-documents/simple-test.md --prompts logical_errors,factual_claims"
if ./prompt-based-analyzer.js test-documents/simple-test.md --prompts logical_errors,factual_claims > /dev/null 2>&1; then
    echo "   ✅ Prompt-based analyzer works"
    
    LATEST=$(ls -td outputs/simple-test-* 2>/dev/null | head -1)
    if [ -f "$LATEST/dashboard.md" ]; then
        echo "   Output: $LATEST"
        
        # Show summary
        echo "   Job Summary:"
        grep -A 5 "Job Status:" "$LATEST/dashboard.md" | grep -E "(Total|Completed)" | sed 's/^/     /'
    fi
else
    echo "   ❌ Prompt-based analyzer failed"
fi

echo
echo "🏁 Testing complete!"
echo
echo "Next steps:"
echo "1. Check the output directories for results"
echo "2. Try running on your own documents"
echo "3. Customize prompts in prompt-based-analyzer.js"