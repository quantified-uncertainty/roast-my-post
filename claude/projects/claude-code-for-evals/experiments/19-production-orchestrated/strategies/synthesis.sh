#!/bin/bash

echo "📊 Executing SYNTHESIS with structured findings"
echo

# Check for findings
if [ ! -f "state/current-findings.json" ]; then
    echo "❌ No findings to synthesize"
    exit 1
fi

# Get iteration
ITERATION=$(cat state/iteration-count.txt 2>/dev/null || echo "1")
OUTPUT_DIR="outputs/iteration-${ITERATION}-synthesis"
mkdir -p "$OUTPUT_DIR"

# Calculate statistics
STATS=$(node -e "
const findings = require('./state/current-findings.json');

const stats = {
    total: findings.length,
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

console.log(JSON.stringify(stats, null, 2));
")

echo "📝 Synthesizing findings:"
echo "$STATS"
echo

# Create structured findings summary
FINDINGS_SUMMARY=$(node -e "
const findings = require('./state/current-findings.json');

// Group by severity and category
const grouped = {
    critical: findings.filter(f => f.severity === 'critical'),
    major: findings.filter(f => f.severity === 'major'),
    minor: findings.filter(f => f.severity === 'minor')
};

console.log('STRUCTURED FINDINGS SUMMARY');
console.log('==========================');
console.log('');

// Output by severity
['critical', 'major', 'minor'].forEach(severity => {
    if (grouped[severity].length > 0) {
        console.log(\`\${severity.toUpperCase()} ISSUES (\${grouped[severity].length}):\`);
        console.log('-'.repeat(40));
        
        // Group by category within severity
        const byCategory = {};
        grouped[severity].forEach(f => {
            if (!byCategory[f.category]) byCategory[f.category] = [];
            byCategory[f.category].push(f);
        });
        
        Object.keys(byCategory).sort().forEach(category => {
            console.log(\`\\n[\${category.replace(/_/g, ' ').toUpperCase()}]\`);
            byCategory[category].forEach((f, i) => {
                console.log(\`\${i + 1}. Line \${f.line}: \${f.issue}\`);
                console.log(\`   Quote: \"\${f.quote.substring(0, 60)}\${f.quote.length > 60 ? '...' : ''}\"\`);
            });
        });
        console.log('');
    }
});
")

# Create synthesis prompt
PROMPT="You are creating a final analysis report based on validated, structured findings.

$FINDINGS_SUMMARY

Create a professional report with:

1. **Executive Summary** (2-3 paragraphs)
   - Overall document quality assessment
   - Most critical issues identified
   - Key recommendations

2. **Critical Issues** (if any exist)
   - Explain each with context
   - Impact on document validity
   - Required fixes
   - IMPORTANT: Include all source citations from findings

3. **Major Issues** 
   - Group by type
   - Provide examples with specific data/sources
   - Suggest improvements
   - IMPORTANT: Preserve all "Source:" references from findings

4. **Minor Issues**
   - Brief listing
   - Quick fixes
   - Include sources where provided

5. **Positive Aspects**
   - What the document does well
   - Strong points to preserve

6. **Recommendations**
   - Prioritized action items
   - Specific next steps

7. **Technical Summary**
   - Total issues by category
   - Coverage assessment

Format as professional markdown. Be specific and actionable.
CRITICAL: When findings include "Source:" references, you MUST include them in your report."

# Save prompt for debugging
echo "$PROMPT" > "$OUTPUT_DIR/synthesis-prompt.txt"

# Run synthesis
echo "🤖 Generating comprehensive report..."
echo

claude -p "$PROMPT" --max-turns 5 > "$OUTPUT_DIR/report.md" 2>"$OUTPUT_DIR/synthesis.log"

if [ -s "$OUTPUT_DIR/report.md" ]; then
    echo "✅ Report generated successfully"
    
    # Copy to state as final report
    cp "$OUTPUT_DIR/report.md" state/final-report.md
    
    # Show preview
    echo
    echo "📋 Report preview:"
    echo "=================="
    head -n 40 "$OUTPUT_DIR/report.md"
    echo
    echo "... (see full report in state/final-report.md)"
    
    # Save final statistics
    node -e "
    const findings = require('./state/current-findings.json');
    const stats = {
        reportGenerated: new Date().toISOString(),
        totalFindings: findings.length,
        bySeverity: {
            critical: findings.filter(f => f.severity === 'critical').length,
            major: findings.filter(f => f.severity === 'major').length,
            minor: findings.filter(f => f.severity === 'minor').length
        },
        byCategory: {},
        iterations: $ITERATION
    };
    
    findings.forEach(f => {
        stats.byCategory[f.category] = (stats.byCategory[f.category] || 0) + 1;
    });
    
    require('fs').writeFileSync('$OUTPUT_DIR/final-stats.json', JSON.stringify(stats, null, 2));
    
    // Also save to state
    require('fs').writeFileSync('state/final-stats.json', JSON.stringify(stats, null, 2));
    "
    
    echo
    echo "📊 Statistics saved"
else
    echo "❌ Report generation failed"
    exit 1
fi

echo
echo "✅ SYNTHESIS complete"