#!/bin/bash

# Production-ready wrapper for orchestrated analysis
# Works around timeout and tty issues

set -euo pipefail

DOCUMENT_PATH="${1:-}"
if [ -z "$DOCUMENT_PATH" ] || [ ! -f "$DOCUMENT_PATH" ]; then
    echo "Usage: $0 <document-path>"
    exit 1
fi

echo "🎭 PRODUCTION DOCUMENT ANALYSIS"
echo "=============================="
echo "Document: $DOCUMENT_PATH"
echo
echo "This script runs the orchestrated analysis with production-ready settings:"
echo "  - Suppresses tty warnings"
echo "  - Handles timeouts gracefully"
echo "  - Provides clean output"
echo

# Set environment to avoid GNU parallel tty issues
export PARALLEL_SHELL=/bin/bash
export PARALLEL="--no-notice --will-cite"

# Create a wrapper script that handles the timeout externally
WRAPPER_SCRIPT=$(mktemp)
cat > "$WRAPPER_SCRIPT" << 'EOF'
#!/bin/bash
# Timeout wrapper to avoid the 2-minute shell timeout
exec timeout 900 "$@"
EOF
chmod +x "$WRAPPER_SCRIPT"

# Run the analysis
echo "Starting analysis..."
echo

# Use the wrapper to run with a 15-minute timeout
"$WRAPPER_SCRIPT" ./orchestrate-analysis.sh "$DOCUMENT_PATH" 2>&1 | \
    grep -v "/dev/tty: Device not configured" | \
    grep -v "^ETA:" | \
    grep -v "^Computer:jobs" | \
    grep -v "^\[K" | \
    sed 's/\[K//g'

# Cleanup
rm -f "$WRAPPER_SCRIPT"

# Find the latest output directory
LATEST_OUTPUT=$(ls -td outputs/* 2>/dev/null | head -1)

if [ -n "$LATEST_OUTPUT" ] && [ -d "$LATEST_OUTPUT" ]; then
    echo
    echo "✅ Analysis complete!"
    echo "   Output directory: $LATEST_OUTPUT"
    
    if [ -f "$LATEST_OUTPUT/final-report.md" ]; then
        echo "   Final report: $LATEST_OUTPUT/final-report.md"
        echo
        echo "📄 Report preview:"
        echo "=================="
        head -20 "$LATEST_OUTPUT/final-report.md"
        echo "..."
        echo "(See full report at $LATEST_OUTPUT/final-report.md)"
    else
        echo "   ⚠️  No final report generated (analysis may have been partial)"
    fi
else
    echo "❌ Analysis failed - no output directory created"
    exit 1
fi