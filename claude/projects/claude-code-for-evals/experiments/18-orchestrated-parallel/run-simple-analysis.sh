#!/bin/bash

# Simple production-ready analysis runner
# Runs analysis tasks sequentially with proper error handling

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
mkdir -p "$OUTPUT_DIR"

echo "🎭 DOCUMENT ANALYSIS"
echo "==================="
echo "Document: $DOCUMENT_PATH"
echo "Output: $OUTPUT_DIR"
echo

# Run the existing orchestration with fixes
export PARALLEL_SHELL=/bin/bash
export PARALLEL="--no-notice --will-cite -P 4"

# Redirect stderr to avoid tty noise
./orchestrate-analysis.sh "$DOCUMENT_PATH" 2>&1 | \
    grep -v "/dev/tty: Device not configured" | \
    grep -v "^ETA:" | \
    grep -v "^Computer:jobs"

echo
echo "✅ Analysis complete!"
echo "   Results: $OUTPUT_DIR"