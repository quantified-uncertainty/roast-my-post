#!/bin/bash

echo "🧪 TESTING FIXED ADAPTIVE ORCHESTRATION"
echo "======================================"
echo

# Clean up previous state
rm -rf state/* outputs/*
mkdir -p state outputs

# Initialize
echo "0" > state/iteration-count.txt
chmod +x *.sh *.js strategies/*.sh lib/*.js

# Create a simple test decision
cat > state/current-decision.json << 'EOF'
{
  "strategy": "PARALLEL_EXPLORE",
  "reasoning": "Testing parallel task execution with fixed implementation",
  "tasks": [
    "Find spelling and grammar errors with line numbers",
    "Check mathematical accuracy of statistical claims"
  ],
  "confidence": 0.9
}
EOF

echo "📋 Test 1: Parallel Task Execution"
echo "---------------------------------"
./strategies/parallel-explore.sh

echo
echo "📋 Test 2: Check Output Files"
echo "----------------------------"
ITERATION=$(cat state/iteration-count.txt)
ls -la outputs/iteration-${ITERATION}-parallel/

echo
echo "📋 Test 3: Parse Findings"
echo "------------------------"
if [ -f "outputs/iteration-${ITERATION}-parallel/task-1.json" ]; then
    echo "✅ Task output files created"
    echo "Sample parsed finding:"
    node -e "
    const parsed = require('./outputs/iteration-${ITERATION}-parallel/parsed-findings.json');
    if (parsed.findings.length > 0) {
        const f = parsed.findings[0];
        console.log(\`- [\${f.severity}] \${f.category}: Line \${f.lineNumbers.join(', ')} - \${f.description.substring(0, 100)}...\`);
    }
    "
else
    echo "❌ No task output files found"
fi

echo
echo "📋 Test 4: Check State Updates"
echo "-----------------------------"
if [ -f "state/current-findings.json" ]; then
    FINDINGS_COUNT=$(node -e "console.log(require('./state/current-findings.json').length)")
    echo "✅ Findings saved to state: $FINDINGS_COUNT findings"
else
    echo "❌ No findings in state"
fi

echo
echo "🎯 Test Summary"
echo "--------------"
echo "If you see task outputs and findings above, the fixes are working!"