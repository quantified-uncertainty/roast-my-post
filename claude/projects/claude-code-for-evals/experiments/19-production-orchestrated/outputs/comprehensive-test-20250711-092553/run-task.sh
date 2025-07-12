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
