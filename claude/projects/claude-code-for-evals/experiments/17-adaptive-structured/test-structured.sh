#!/bin/bash

echo "🧪 TESTING STRUCTURED OUTPUT SYSTEM"
echo "=================================="
echo

# Clean state
rm -rf state/* outputs/*
mkdir -p state outputs

# Copy input file
cp ../13-parallel-claude-robust/input.md ./input.md 2>/dev/null || {
    echo "❌ Error: Could not find input.md"
    exit 1
}

# Make scripts executable
chmod +x *.sh *.js strategies/*.sh lib/*.js

# Initialize
echo "0" > state/iteration-count.txt

# Create test decision
cat > state/current-decision.json << 'EOF'
{
  "strategy": "PARALLEL_EXPLORE",
  "reasoning": "Testing structured output format",
  "taskTypes": ["spelling_grammar", "mathematical_accuracy"],
  "confidence": 0.9
}
EOF

echo "📋 Test 1: Run parallel tasks with structured output"
echo "---------------------------------------------------"
./strategies/parallel-explore.sh

echo
echo "📋 Test 2: Check outputs"
echo "-----------------------"
if [ -d "outputs/iteration-1-parallel" ]; then
    echo "✅ Output directory created"
    ls -la outputs/iteration-1-parallel/
else
    echo "❌ No output directory"
fi

echo
echo "📋 Test 3: Verify structured findings"
echo "------------------------------------"
if [ -f "outputs/all-findings.json" ]; then
    FINDINGS=$(cat outputs/all-findings.json)
    FINDING_COUNT=$(echo "$FINDINGS" | node -e "console.log(JSON.parse(require('fs').readFileSync(0, 'utf8')).length)")
    echo "✅ Found $FINDING_COUNT structured findings"
    
    echo
    echo "Sample finding:"
    node -e "
    const findings = require('./outputs/all-findings.json');
    if (findings.length > 0) {
        const f = findings[0];
        console.log(\`Category: \${f.category}\`);
        console.log(\`Severity: \${f.severity}\`);
        console.log(\`Line: \${f.line}\`);
        console.log(\`Quote: \${f.quote.substring(0, 50)}...\`);
        console.log(\`Issue: \${f.issue.substring(0, 80)}...\`);
    }
    "
else
    echo "❌ No findings file"
fi

echo
echo "📋 Test 4: Run synthesis"
echo "-----------------------"
if [ -f "state/current-findings.json" ] && [ $(node -e "console.log(require('./state/current-findings.json').length)") -gt 0 ]; then
    echo "Running synthesis..."
    ./strategies/synthesis.sh
    
    if [ -f "state/final-report.md" ]; then
        echo "✅ Final report generated"
    else
        echo "❌ No final report"
    fi
else
    echo "⚠️  No findings to synthesize"
fi

echo
echo "🎯 Test Summary"
echo "--------------"
echo "Structured output system is working if you see:"
echo "1. ✅ Structured findings with categories and severities"
echo "2. ✅ No garbage data like '- NBA height (Line 7, 9)'"
echo "3. ✅ Real, validated findings only"