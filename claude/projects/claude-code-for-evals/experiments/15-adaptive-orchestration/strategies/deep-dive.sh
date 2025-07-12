#!/bin/bash

echo "🔍 Executing DEEP_DIVE strategy"

# Load decision to get focus area
FOCUS=$(cat state/current-decision.json | node -e "
const decision = JSON.parse(require('fs').readFileSync(0, 'utf8'));
console.log(decision.focus || 'general analysis');
")

echo "📌 Focus area: $FOCUS"

# Create focused analysis prompt
PROMPT="Perform a deep, thorough analysis of the document at input.md, specifically focusing on:

$FOCUS

Instructions:
- Be extremely thorough and detailed
- Check every instance related to this focus
- Provide context and explanations
- Include specific line numbers
- Suggest corrections where applicable

This is a deep dive - take your time to be comprehensive."

# Run deep analysis with longer timeout
OUTPUT_DIR="outputs/iteration-$(cat state/iteration-count.txt)-deepdive"
mkdir -p "$OUTPUT_DIR"

echo "🔎 Starting deep analysis..."

if command -v gtimeout &> /dev/null; then
    TIMEOUT_CMD="gtimeout 480"
else  
    TIMEOUT_CMD="timeout 480"
fi

$TIMEOUT_CMD claude -p "$PROMPT" --max-turns 20 --allowedTools Read > "$OUTPUT_DIR/deep-dive-results.md" 2>/dev/null

if [ -s "$OUTPUT_DIR/deep-dive-results.md" ]; then
    echo "✅ Deep dive complete"
    
    # Extract findings and add to state
    node -e "
    const fs = require('fs');
    const content = fs.readFileSync('$OUTPUT_DIR/deep-dive-results.md', 'utf8');
    
    // Load current findings
    let findings = [];
    if (fs.existsSync('state/current-findings.json')) {
        findings = JSON.parse(fs.readFileSync('state/current-findings.json', 'utf8'));
    }
    
    // Add deep dive as a set of findings
    findings.push({
        source: 'deep-dive',
        iteration: $(cat state/iteration-count.txt),
        category: 'deep-analysis',
        finding: 'Deep dive on: $FOCUS - See $OUTPUT_DIR/deep-dive-results.md',
        timestamp: new Date().toISOString()
    });
    
    fs.writeFileSync('state/current-findings.json', JSON.stringify(findings, null, 2));
    "
else
    echo "❌ Deep dive failed"
fi