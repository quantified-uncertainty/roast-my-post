#!/bin/bash

echo "📊 Executing SYNTHESIS strategy"

# Load current findings
if [ ! -f "state/current-findings.json" ]; then
    echo "❌ No findings to synthesize"
    exit 1
fi

FINDINGS_COUNT=$(node -e "console.log(require('./state/current-findings.json').length)")
echo "📝 Synthesizing $FINDINGS_COUNT findings..."

# Create synthesis prompt
PROMPT="You are creating a final analysis report. Here are all the findings from the analysis:

$(cat state/current-findings.json | node -e "
const findings = JSON.parse(require('fs').readFileSync(0, 'utf8'));
findings.forEach((f, i) => {
    console.log(\`\${i + 1}. \${f.finding}\`);
});
")

Please create a comprehensive report that:
1. Groups findings by type (spelling/grammar, factual errors, logic issues, clarity problems, etc.)
2. Prioritizes by severity (critical, major, minor)
3. Provides a clear executive summary
4. Includes specific recommendations

Format as a professional markdown report."

# Run synthesis
echo
echo "🤖 Running synthesis with Claude..."

claude -p "$PROMPT" --max-turns 5 > state/final-report.md 2>/dev/null

if [ -s "state/final-report.md" ]; then
    echo "✅ Synthesis complete!"
    echo "📄 Report saved to: state/final-report.md"
    
    # Preview first few lines
    echo
    echo "📋 Report preview:"
    echo "----------------"
    head -n 20 state/final-report.md
    echo "..."
else
    echo "❌ Synthesis failed"
    exit 1
fi