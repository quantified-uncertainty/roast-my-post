#!/bin/bash

# Main orchestration script for parallel Claude Code analysis

set -euo pipefail

# Configuration
MAX_PARALLEL=6
TIMEOUT_PER_TASK=600  # 10 minutes per task (for web searches)
TIMEOUT_SYNTHESIS=900  # 15 minutes for synthesis (longer)
DOCUMENT="${1:-input.md}"

if [ ! -f "$DOCUMENT" ]; then
    echo "❌ Error: Document not found: $DOCUMENT"
    exit 1
fi

echo "🎭 ORCHESTRATED PARALLEL ANALYSIS"
echo "================================"
echo "Document: $DOCUMENT"
echo

# Clean previous state
rm -rf state
mkdir -p state

# Setup output directory with document-specific naming
DOC_NAME=$(basename "$DOCUMENT" .md)
OUTPUT_DIR="outputs/${DOC_NAME}-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUTPUT_DIR/tasks" "$OUTPUT_DIR/synthesis" "$OUTPUT_DIR/prompts"

# 1. Analyze document characteristics with LLM
echo "📊 Phase 1: Analyzing document characteristics with LLM..."
# First ensure the output directory exists before writing to it
mkdir -p "$OUTPUT_DIR"
echo "   Running LLM-based document classification..."
node lib/analyze-document.js "$DOCUMENT" > "$OUTPUT_DIR/document-metadata.json"
DOC_METADATA=$(cat "$OUTPUT_DIR/document-metadata.json")
echo "   Document type detected: $(echo "$DOC_METADATA" | jq -r .type)"
echo "   Flaw density: $(echo "$DOC_METADATA" | jq -r .flawDensity)"
echo "   Analysis depth: $(echo "$DOC_METADATA" | jq -r .analysisDepth)"
echo "   Features: $(echo "$DOC_METADATA" | jq -r '.features | join(", ")')"
echo "   Reasoning: $(echo "$DOC_METADATA" | jq -r .reasoning)"
echo

# 2. Generate task list based on document
echo "📋 Phase 2: Generating task list..."
node lib/generate-tasks.js "$OUTPUT_DIR/document-metadata.json" > "$OUTPUT_DIR/task-list.json"
TASK_COUNT=$(cat "$OUTPUT_DIR/task-list.json" | jq 'length')
echo "   Generated $TASK_COUNT analysis tasks"
echo

# 3. Create task prompts
echo "✍️  Phase 3: Creating task prompts..."
mkdir -p "$OUTPUT_DIR/prompts"
node lib/create-prompts.js "$DOCUMENT" "$OUTPUT_DIR/task-list.json" "$OUTPUT_DIR/prompts"
echo "   Created $TASK_COUNT prompts"
echo

# 4. Run parallel Claude Code instances
echo "🚀 Phase 4: Running parallel analysis (max $MAX_PARALLEL concurrent)..."
echo "   Progress:"

# Export variables for parallel tasks
export OUTPUT_DIR
export TIMEOUT_PER_TASK

# Run tasks in parallel (suppress tty warnings)
# Create a helper script to avoid variable expansion issues
cat > "$OUTPUT_DIR/run-task.sh" << 'SCRIPT_EOF'
#!/bin/bash
TASK_JSON="$1"
OUTPUT_DIR="$2"
TIMEOUT_PER_TASK="$3"

TASK_ID=$(echo "$TASK_JSON" | jq -r .id)
TASK_TYPE=$(echo "$TASK_JSON" | jq -r .type)
PROMPT_FILE="$OUTPUT_DIR/prompts/$TASK_ID.txt"
OUTPUT_FILE="$OUTPUT_DIR/tasks/$TASK_ID.json"

# Run Claude Code with timeout
if timeout "$TIMEOUT_PER_TASK" claude -p "$(cat "$PROMPT_FILE")" > "$OUTPUT_FILE.raw" 2>&1; then
    # Parse structured output
    node lib/parse-task-output.js "$OUTPUT_FILE.raw" "$TASK_TYPE" > "$OUTPUT_FILE"
    # Track usage and costs
    node lib/track-usage.js track "$OUTPUT_FILE" "$OUTPUT_FILE.raw" 2>/dev/null || true
    echo "[$TASK_ID] ✅ Complete"
else
    echo "{\"error\": \"Task failed or timed out\", \"task\": $TASK_JSON}" > "$OUTPUT_FILE"
    echo "[$TASK_ID] ❌ Failed"
fi
SCRIPT_EOF

chmod +x "$OUTPUT_DIR/run-task.sh"

# Run tasks in parallel
cat "$OUTPUT_DIR/task-list.json" | jq -r '.[] | @json' | \
    parallel -j "$MAX_PARALLEL" --eta --no-notice \
    "$OUTPUT_DIR/run-task.sh" {} "$OUTPUT_DIR" "$TIMEOUT_PER_TASK"

echo
echo "✅ Phase 4 complete: All tasks finished"
echo

# 5. Collect and validate findings
echo "📦 Phase 5: Collecting and validating findings..."
node lib/collect-findings.js "$OUTPUT_DIR/tasks" > "$OUTPUT_DIR/all-findings-raw.json"
TOTAL_RAW=$(cat "$OUTPUT_DIR/all-findings-raw.json" | jq 'length')

# Validate and deduplicate
node lib/validate-findings.js "$OUTPUT_DIR/all-findings-raw.json" > "$OUTPUT_DIR/all-findings.json"
TOTAL_VALID=$(cat "$OUTPUT_DIR/all-findings.json" | jq 'length')

echo "   Collected $TOTAL_RAW findings, $TOTAL_VALID after validation"
echo "   By severity:"
echo "     - Critical: $(cat "$OUTPUT_DIR/all-findings.json" | jq '[.[] | select(.severity == "critical")] | length')"
echo "     - Major: $(cat "$OUTPUT_DIR/all-findings.json" | jq '[.[] | select(.severity == "major")] | length')"
echo "     - Minor: $(cat "$OUTPUT_DIR/all-findings.json" | jq '[.[] | select(.severity == "minor")] | length')"
echo

# 6. Pattern recognition
echo "🔍 Phase 6: Analyzing patterns..."
node lib/analyze-patterns.js "$OUTPUT_DIR/all-findings.json" > "$OUTPUT_DIR/synthesis/patterns.json"
PATTERN_COUNT=$(cat "$OUTPUT_DIR/synthesis/patterns.json" | jq '.patterns | length')
echo "   Identified $PATTERN_COUNT recurring patterns"
echo

# 7. Generate synthesis prompt
echo "📝 Phase 7: Preparing synthesis..."
node lib/create-synthesis-prompt.js \
    "$DOCUMENT" \
    "$OUTPUT_DIR/all-findings.json" \
    "$OUTPUT_DIR/synthesis/patterns.json" \
    > "$OUTPUT_DIR/synthesis/synthesis-prompt.txt"
echo "   Synthesis prompt created"
echo

# 8. Run final synthesis with longer timeout and retry logic
echo "🎯 Phase 8: Running final synthesis..."
SYNTHESIS_SUCCESS=false

for attempt in 1 2 3; do
  echo "   Synthesis attempt $attempt/3..."
  
  # Use shorter prompt for retries
  if [ $attempt -eq 1 ]; then
    PROMPT_FILE="$OUTPUT_DIR/synthesis/synthesis-prompt.txt"
    echo "   Using full synthesis prompt"
  else
    node lib/create-short-synthesis-prompt.js \
      "$DOCUMENT" \
      "$OUTPUT_DIR/all-findings.json" \
      "$OUTPUT_DIR/synthesis/patterns.json" \
      > "$OUTPUT_DIR/synthesis/short-synthesis-prompt.txt"
    PROMPT_FILE="$OUTPUT_DIR/synthesis/short-synthesis-prompt.txt"
    echo "   Using shorter synthesis prompt"
  fi
  
  if timeout $TIMEOUT_SYNTHESIS claude -p "$(cat "$PROMPT_FILE")" > "$OUTPUT_DIR/final-report.md" 2>&1; then
    SYNTHESIS_SUCCESS=true
    echo "   ✅ Final report generated successfully"
    break
  else
    echo "   ⚠️  Synthesis attempt $attempt failed (timeout or error)"
    if [ $attempt -lt 3 ]; then
      echo "   🔄 Retrying with shorter prompt and longer timeout..."
      TIMEOUT_SYNTHESIS=$((TIMEOUT_SYNTHESIS + 300))  # Add 5 more minutes each retry
    fi
  fi
done

if [ "$SYNTHESIS_SUCCESS" = false ]; then
  echo "   ❌ Synthesis failed after 3 attempts"
  echo "   📝 Creating summary report instead..."
  
  # Create a minimal report using just the executive summary
  cat > "$OUTPUT_DIR/final-report.md" << EOF
# Analysis Report: $(basename "$DOCUMENT" .md)

## Status
**Note**: Full synthesis timed out. This is a summary based on validated findings.

## Executive Summary
$(cat "$OUTPUT_DIR/executive-summary.json" | jq -r '.assessment.overall')

Total Issues Found: $(cat "$OUTPUT_DIR/all-findings.json" | jq 'length')
- Critical: $(cat "$OUTPUT_DIR/all-findings.json" | jq '[.[] | select(.severity == "critical")] | length')
- Major: $(cat "$OUTPUT_DIR/all-findings.json" | jq '[.[] | select(.severity == "major")] | length')  
- Minor: $(cat "$OUTPUT_DIR/all-findings.json" | jq '[.[] | select(.severity == "minor")] | length')

## Top Critical Issues
$(cat "$OUTPUT_DIR/all-findings.json" | jq -r '[.[] | select(.severity == "critical")][0:3] | .[] | "- Line \(.line): \(.issue)"')

## Complete Analysis
For detailed findings, see: all-findings.json
For patterns identified, see: synthesis/patterns.json

**Note**: This document requires $(cat "$OUTPUT_DIR/executive-summary.json" | jq -r '.assessment.estimatedEffort') of revision work.
EOF
fi
echo

# 9. Create summary output
echo "📊 Phase 9: Creating summary..."
cp "$OUTPUT_DIR/all-findings.json" outputs/
cp "$OUTPUT_DIR/final-report.md" outputs/

# Generate executive summary
node lib/generate-summary.js \
    "$OUTPUT_DIR/all-findings.json" \
    "$OUTPUT_DIR/synthesis/patterns.json" \
    > "$OUTPUT_DIR/executive-summary.json"

cp "$OUTPUT_DIR/executive-summary.json" outputs/

echo
echo "✨ ANALYSIS COMPLETE!"
echo "===================="
echo "Outputs:"
echo "  - Full report: $OUTPUT_DIR/final-report.md"
echo "  - All findings: $OUTPUT_DIR/all-findings.json"
echo "  - Executive summary: $OUTPUT_DIR/executive-summary.json"
echo "  - Task outputs: $OUTPUT_DIR/tasks/"
echo
echo "Key metrics:"
cat "$OUTPUT_DIR/executive-summary.json" | jq '.'

# Generate usage report
echo
echo "💰 Generating cost report..."
if node "lib/track-usage.js" report "$OUTPUT_DIR" 2>/dev/null; then
  echo
  cat "$OUTPUT_DIR/cost-summary.txt" 2>/dev/null || echo "Cost summary not available"
else
  echo "   ⚠️  Could not generate cost report (ensure track-usage.js is tracking each task)"
fi