#!/bin/bash

# Sequential analysis - run one task at a time to avoid timeouts
set -euo pipefail

DOCUMENT_PATH="${1:-}"
if [ -z "$DOCUMENT_PATH" ] || [ ! -f "$DOCUMENT_PATH" ]; then
    echo "Usage: $0 <document-path>"
    exit 1
fi

# Create output directory
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DOCUMENT_NAME=$(basename "$DOCUMENT_PATH" .md)
OUTPUT_DIR="outputs/${DOCUMENT_NAME}-${TIMESTAMP}"
mkdir -p "$OUTPUT_DIR"/{tasks,prompts,synthesis}

echo "🎭 SEQUENTIAL DOCUMENT ANALYSIS"
echo "=============================="
echo "Document: $DOCUMENT_PATH"
echo "Output: $OUTPUT_DIR"
echo

# Phase 1: Classification
echo "📊 Phase 1: Document classification..."
node lib/analyze-document.js "$DOCUMENT_PATH" "$OUTPUT_DIR"
echo "   ✅ Complete"

# Phase 2: Create task prompts
echo "✍️  Phase 2: Creating prompts..."
node lib/create-prompts.js "$DOCUMENT_PATH" "$OUTPUT_DIR/task-list.json" "$OUTPUT_DIR/prompts"
echo "   ✅ Complete"

# Phase 3: Run tasks one by one
echo "🚀 Phase 3: Running tasks sequentially..."
TASK_COUNT=$(jq length "$OUTPUT_DIR/task-list.json")
echo "   Total tasks: $TASK_COUNT"

for i in $(seq 0 $((TASK_COUNT - 1))); do
    TASK=$(jq -r ".[$i]" "$OUTPUT_DIR/task-list.json")
    TASK_ID=$(echo "$TASK" | jq -r '.id')
    
    echo "   [$(($i + 1))/$TASK_COUNT] Running: $TASK_ID"
    
    # Create individual prompt and run
    PROMPT_FILE="$OUTPUT_DIR/prompts/$TASK_ID.txt"
    OUTPUT_FILE="$OUTPUT_DIR/tasks/$TASK_ID.json"
    
    if [ -f "$PROMPT_FILE" ]; then
        if claude -p "$(cat "$PROMPT_FILE")" > "$OUTPUT_FILE.raw" 2>&1; then
            # Extract findings
            if node lib/extract-findings.js "$OUTPUT_FILE.raw" "$OUTPUT_FILE" "$(echo "$TASK" | jq -r '.type')" 2>/dev/null; then
                echo "   ✅ Complete: $TASK_ID"
            else
                echo "   ⚠️  Complete but extraction failed: $TASK_ID"
            fi
        else
            echo "   ❌ Failed: $TASK_ID"
        fi
    fi
done

echo
echo "📊 Phase 4: Combining results..."
if node lib/combine-findings.js "$OUTPUT_DIR" 2>/dev/null; then
    echo "   ✅ Complete"
fi

echo
echo "📝 Phase 5: Generating report..."
# Setup for synthesis
cp "$OUTPUT_DIR/all-findings.json" state/current-findings.json 2>/dev/null || echo '[]' > state/current-findings.json
echo '{"patterns": []}' > state/patterns.json
echo "1" > state/iteration-count.txt

# Run synthesis
if ./strategies/synthesis.sh > "$OUTPUT_DIR/synthesis.log" 2>&1; then
    if [ -f "state/final-report.md" ]; then
        cp state/final-report.md "$OUTPUT_DIR/final-report.md"
        echo "   ✅ Final report generated"
    fi
fi

echo
echo "✅ ANALYSIS COMPLETE"
echo "==================="
echo "Results: $OUTPUT_DIR"
[ -f "$OUTPUT_DIR/final-report.md" ] && echo "Report: $OUTPUT_DIR/final-report.md"