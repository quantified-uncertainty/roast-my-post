#!/bin/bash

echo "📊 Executing SYNTHESIS strategy (FIXED)"

# Check for findings
if [ ! -f "state/current-findings.json" ]; then
    echo "❌ No findings to synthesize"
    exit 1
fi

FINDINGS_COUNT=$(node -e "console.log(require('./state/current-findings.json').length)")
echo "📝 Synthesizing $FINDINGS_COUNT findings..."

# Create a structured summary of findings
FINDINGS_SUMMARY=$(node -e "
const findings = require('./state/current-findings.json');

// Group by severity and category
const grouped = {
    critical: findings.filter(f => f.severity === 'critical'),
    major: findings.filter(f => f.severity === 'major'),
    minor: findings.filter(f => f.severity === 'minor')
};

// Output structured summary
console.log('FINDINGS SUMMARY:');
console.log('================');
console.log(\`Total findings: \${findings.length}\`);
console.log(\`- Critical: \${grouped.critical.length}\`);
console.log(\`- Major: \${grouped.major.length}\`);
console.log(\`- Minor: \${grouped.minor.length}\`);
console.log('');

// List findings by severity
['critical', 'major', 'minor'].forEach(severity => {
    if (grouped[severity].length > 0) {
        console.log(\`\${severity.toUpperCase()} ISSUES:\`);
        grouped[severity].forEach((f, i) => {
            const lines = f.lineNumbers.length > 0 ? \`Lines \${f.lineNumbers.join(', ')}\` : 'No line ref';
            console.log(\`\${i+1}. [\${f.category}] \${lines}: \${f.description.substring(0, 100)}...\`);
            if (f.quotes.length > 0) {
                console.log(\`   Quote: \${f.quotes[0].substring(0, 80)}...\`);
            }
        });
        console.log('');
    }
});
")

# Create synthesis prompt
PROMPT="You are creating a final analysis report based on systematic findings from document analysis.

$FINDINGS_SUMMARY

Please create a comprehensive report that:

1. **Executive Summary** (2-3 paragraphs)
   - Overview of document quality
   - Most critical issues found
   - Overall assessment

2. **Critical Issues** (if any)
   - List each critical finding with context
   - Explain why it's critical
   - Suggest fixes

3. **Major Issues**
   - Group by category (factual, logical, clarity, etc.)
   - Provide specific examples
   - Impact assessment

4. **Minor Issues**
   - Brief list with line references
   - Quick fixes suggested

5. **Recommendations**
   - Prioritized action items
   - Specific improvements needed

6. **Statistical Summary**
   - Total issues by category
   - Distribution by severity

Format as a professional markdown report. Be specific and reference line numbers."

# Save prompt for debugging
echo "$PROMPT" > state/synthesis-prompt.txt

# Run synthesis
echo
echo "🤖 Generating comprehensive report..."

ITERATION=$(cat state/iteration-count.txt 2>/dev/null || echo "1")
OUTPUT_DIR="outputs/iteration-${ITERATION}-synthesis"
mkdir -p "$OUTPUT_DIR"

# Run Claude to create report
claude -p "$PROMPT" --max-turns 5 > "$OUTPUT_DIR/report.md" 2>"$OUTPUT_DIR/synthesis.log"

if [ -s "$OUTPUT_DIR/report.md" ]; then
    echo "✅ Report generated successfully"
    
    # Copy to state as final report
    cp "$OUTPUT_DIR/report.md" state/final-report.md
    
    # Show preview
    echo
    echo "📋 Report preview:"
    echo "=================="
    head -n 30 "$OUTPUT_DIR/report.md"
    echo
    echo "... (see full report in state/final-report.md)"
    
    # Create summary statistics
    node -e "
    const findings = require('./state/current-findings.json');
    const stats = {
        totalFindings: findings.length,
        bySeverity: {
            critical: findings.filter(f => f.severity === 'critical').length,
            major: findings.filter(f => f.severity === 'major').length,
            minor: findings.filter(f => f.severity === 'minor').length
        },
        byCategory: {}
    };
    
    findings.forEach(f => {
        stats.byCategory[f.category] = (stats.byCategory[f.category] || 0) + 1;
    });
    
    require('fs').writeFileSync('$OUTPUT_DIR/statistics.json', JSON.stringify(stats, null, 2));
    console.log('📊 Statistics saved to $OUTPUT_DIR/statistics.json');
    "
else
    echo "❌ Report generation failed"
    exit 1
fi

echo
echo "✅ SYNTHESIS complete"