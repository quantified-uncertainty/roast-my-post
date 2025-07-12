#!/bin/bash

# Production-ready orchestrated analysis script
# Key changes:
# 1. No GNU parallel (avoiding tty issues)
# 2. Explicit timeouts where needed
# 3. Better error handling
# 4. Cleaner output

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_BASE="$SCRIPT_DIR/outputs"
MAX_CONCURRENT_TASKS=4
TASK_TIMEOUT=300  # 5 minutes per task

# Check for required tools
if ! command -v claude &> /dev/null; then
    echo "❌ Error: 'claude' command not found. Please install Claude CLI."
    exit 1
fi

# claude-code is the actual command used, no need to check separately

# Get document path
DOCUMENT_PATH="${1:-}"
if [ -z "$DOCUMENT_PATH" ]; then
    echo "Usage: $0 <document-path>"
    exit 1
fi

if [ ! -f "$DOCUMENT_PATH" ]; then
    echo "❌ Error: Document not found: $DOCUMENT_PATH"
    exit 1
fi

# Create output directory
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DOCUMENT_NAME=$(basename "$DOCUMENT_PATH" .md)
OUTPUT_DIR="$OUTPUT_BASE/${DOCUMENT_NAME}-${TIMESTAMP}"
mkdir -p "$OUTPUT_DIR"/{tasks,prompts,synthesis}

echo "🎭 ORCHESTRATED PARALLEL ANALYSIS"
echo "================================"
echo "Document: $DOCUMENT_PATH"
echo "Output: $OUTPUT_DIR"
echo

# Phase 1: Document Classification
echo "📊 Phase 1: Analyzing document with LLM..."
CLASSIFICATION=$(node "$SCRIPT_DIR/lib/analyze-document.js" "$DOCUMENT_PATH" "$OUTPUT_DIR" 2>/dev/null)
echo "   ✅ Classification complete"
echo

# Phase 2: Task Generation
echo "📋 Phase 2: Generating task list..."
TASK_COUNT=$(jq -r '.tasks | length' "$OUTPUT_DIR/task-list.json")
echo "   ✅ Generated $TASK_COUNT analysis tasks"
echo

# Phase 3: Create Prompts
echo "✍️  Phase 3: Creating task prompts..."
PROMPT_COUNT=0
while IFS= read -r task; do
    TYPE=$(echo "$task" | jq -r '.type')
    EFFORT=$(echo "$task" | jq -r '.effort')
    
    node "$SCRIPT_DIR/lib/create-prompts.js" "$DOCUMENT_PATH" "{\"type\":\"$TYPE\",\"effort\":\"$EFFORT\"}" \
        > "$OUTPUT_DIR/prompts/task-$((++PROMPT_COUNT))-${TYPE}.txt" 2>/dev/null
done < <(jq -c '.tasks[]' "$OUTPUT_DIR/task-list.json")
echo "   ✅ Created $PROMPT_COUNT prompts"
echo

# Phase 4: Run Tasks (without GNU parallel)
echo "🚀 Phase 4: Running analysis tasks..."
echo "   Running up to $MAX_CONCURRENT_TASKS concurrent tasks"
echo

# Function to run a single task
run_task() {
    local task_num=$1
    local task_type=$2
    local prompt_file="$OUTPUT_DIR/prompts/task-${task_num}-${task_type}.txt"
    local output_file="$OUTPUT_DIR/tasks/task-${task_num}-${task_type}.json"
    local raw_file="${output_file}.raw"
    
    echo "   [${task_num}/${TASK_COUNT}] Starting: $task_type"
    
    # Run with explicit timeout
    if timeout $TASK_TIMEOUT claude-code --max-turns 15 < "$prompt_file" > "$raw_file" 2>&1; then
        # Extract JSON from output
        node "$SCRIPT_DIR/lib/extract-findings.js" "$raw_file" "$output_file" "$task_type" 2>/dev/null
        echo "   [${task_num}/${TASK_COUNT}] ✅ Complete: $task_type"
        return 0
    else
        echo "   [${task_num}/${TASK_COUNT}] ❌ Failed: $task_type (timeout or error)"
        return 1
    fi
}

# Run tasks with controlled concurrency
TASK_NUM=0
PIDS=()
COMPLETED=0
FAILED=0

while IFS= read -r task; do
    TYPE=$(echo "$task" | jq -r '.type')
    ((TASK_NUM++))
    
    # Wait if we've hit max concurrent
    while [ ${#PIDS[@]} -ge $MAX_CONCURRENT_TASKS ]; do
        for i in "${!PIDS[@]}"; do
            if ! kill -0 "${PIDS[$i]}" 2>/dev/null; then
                wait "${PIDS[$i]}"
                if [ $? -eq 0 ]; then
                    ((COMPLETED++))
                else
                    ((FAILED++))
                fi
                unset 'PIDS[$i]'
            fi
        done
        PIDS=("${PIDS[@]}")  # Reindex array
        sleep 0.5
    done
    
    # Start new task
    run_task $TASK_NUM "$TYPE" &
    PIDS+=($!)
    
done < <(jq -c '.tasks[]' "$OUTPUT_DIR/task-list.json")

# Wait for remaining tasks
echo
echo "   Waiting for remaining tasks to complete..."
for pid in "${PIDS[@]}"; do
    if wait "$pid"; then
        ((COMPLETED++))
    else
        ((FAILED++))
    fi
done

echo
echo "   Tasks completed: $COMPLETED"
echo "   Tasks failed: $FAILED"
echo

# Phase 5: Combine Findings
echo "📊 Phase 5: Combining findings..."
node "$SCRIPT_DIR/lib/combine-findings.js" "$OUTPUT_DIR" 2>/dev/null
echo "   ✅ Combined all findings"
echo

# Phase 6: Pattern Detection
echo "🔍 Phase 6: Detecting patterns..."
node "$SCRIPT_DIR/lib/detect-patterns.js" "$OUTPUT_DIR/all-findings.json" "$OUTPUT_DIR/patterns.json" 2>/dev/null
echo "   ✅ Pattern detection complete"
echo

# Phase 7: Generate Summary
echo "📈 Phase 7: Generating executive summary..."
node "$SCRIPT_DIR/lib/generate-summary.js" "$OUTPUT_DIR" 2>/dev/null
echo "   ✅ Executive summary created"
echo

# Phase 8: Final Synthesis
echo "📝 Phase 8: Creating final report..."

# Setup state for synthesis
cp "$OUTPUT_DIR/all-findings.json" "$SCRIPT_DIR/state/current-findings.json"
cp "$OUTPUT_DIR/patterns.json" "$SCRIPT_DIR/state/patterns.json"
echo "1" > "$SCRIPT_DIR/state/iteration-count.txt"

# Run synthesis
if timeout 120 "$SCRIPT_DIR/strategies/synthesis.sh" > "$OUTPUT_DIR/synthesis.log" 2>&1; then
    if [ -f "$SCRIPT_DIR/state/final-report.md" ]; then
        cp "$SCRIPT_DIR/state/final-report.md" "$OUTPUT_DIR/final-report.md"
        echo "   ✅ Final report generated"
    else
        echo "   ❌ Synthesis completed but no report generated"
    fi
else
    echo "   ❌ Synthesis timed out"
fi

# Cleanup state
rm -f "$SCRIPT_DIR/state/"*.json "$SCRIPT_DIR/state/"*.txt "$SCRIPT_DIR/state/"*.md

# Final summary
echo
echo "✅ ANALYSIS COMPLETE"
echo "==================="
echo "Output directory: $OUTPUT_DIR"
echo "Final report: $OUTPUT_DIR/final-report.md"
echo
echo "Key files:"
echo "  - Task results: $OUTPUT_DIR/tasks/"
echo "  - All findings: $OUTPUT_DIR/all-findings.json"
echo "  - Executive summary: $OUTPUT_DIR/executive-summary.json"
echo "  - Final report: $OUTPUT_DIR/final-report.md"