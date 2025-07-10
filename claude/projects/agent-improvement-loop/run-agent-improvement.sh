#!/bin/bash

# Agent Improvement Runner with Extended Timeout
# Usage: ./run-agent-improvement.sh [options]

set -e

# Default values
CONFIG="scripts/epistemic-agent-config.json"
TIMEOUT="30m"  # 30 minutes instead of 2 minutes
BACKGROUND=false
DRY_RUN=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --config)
      CONFIG="$2"
      shift 2
      ;;
    --timeout)
      TIMEOUT="$2"
      shift 2
      ;;
    --background)
      BACKGROUND=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      echo "Unknown option $1"
      exit 1
      ;;
  esac
done

# Build command
CMD="npx tsx scripts/improve-agent.ts --config $CONFIG"

if [ "$DRY_RUN" = true ]; then
  CMD="$CMD --dry-run"
fi

if [ "$BACKGROUND" = true ]; then
  CMD="$CMD --background"
fi

echo "🚀 Running agent improvement with $TIMEOUT timeout..."
echo "📋 Config: $CONFIG"
echo "🔧 Command: $CMD"

if [ "$BACKGROUND" = true ]; then
  echo "🔄 Running in background mode with progress saving..."
  echo "💡 Monitor progress with: watch -n 5 'tail -10 agent-improvement-progress.json'"
fi

# Run with extended timeout (use gtimeout on macOS if available)
if command -v gtimeout &> /dev/null; then
  echo "Using gtimeout (install with: brew install coreutils)"
  gtimeout $TIMEOUT $CMD
  exit_code=$?
elif command -v timeout &> /dev/null; then
  echo "Using timeout"
  timeout $TIMEOUT $CMD
  exit_code=$?
else
  echo "⚠️  No timeout command available, running without timeout limit"
  echo "💡 Install with: brew install coreutils (for gtimeout)"
  $CMD
  exit_code=$?
fi

if [ $exit_code -eq 124 ]; then
  echo "⏰ Process timed out after $TIMEOUT"
  echo "💾 Check agent-improvement-progress.json for current state"
  echo "🔄 You can resume by running the same command again"
elif [ $exit_code -eq 0 ]; then
  echo "✅ Agent improvement completed successfully"
else
  echo "❌ Process failed with exit code $exit_code"
fi