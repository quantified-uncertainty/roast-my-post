#!/bin/bash

echo "🎯 EXPERIMENT 13: Parallel Claude Code Execution (ROBUST)"
echo "=================================================="
echo

# Make all scripts executable
chmod +x *.js *.sh

# Create log directory
mkdir -p run-logs
LOG_FILE="run-logs/experiment-$(date +%Y%m%d-%H%M%S).log"

# Function to log and display
log_both() {
    echo "$1" | tee -a "$LOG_FILE"
}

log_both "Started at: $(date)"
log_both ""

# Phase 1: Decompose
log_both "📋 PHASE 1: Task Decomposition"
log_both "------------------------------"
node 01-decompose-task.js 2>&1 | tee -a "$LOG_FILE"

if [ ${PIPESTATUS[0]} -ne 0 ]; then
    log_both "❌ Decomposition failed"
    exit 1
fi

# Validate tasks.json exists
if [ ! -f "tasks.json" ]; then
    log_both "❌ tasks.json not created"
    exit 1
fi

log_both ""
log_both "✅ Phase 1 complete. Press Enter to continue to parallel execution..."
read

# Phase 2: Parallel execution
log_both ""
log_both "🚀 PHASE 2: Parallel Execution"
log_both "------------------------------"
./02-run-parallel.sh 2>&1 | tee -a "$LOG_FILE"

if [ ${PIPESTATUS[0]} -ne 0 ]; then
    log_both "❌ Parallel execution failed"
    log_both "Check outputs/ directory for individual task logs"
    exit 1
fi

# Check if we have enough outputs to consolidate
if [ ! -f "parallel-execution-summary.json" ]; then
    log_both "❌ No execution summary found"
    exit 1
fi

SUCCESS_COUNT=$(node -e "console.log(require('./parallel-execution-summary.json').tasksSuccess)")
if [ "$SUCCESS_COUNT" -lt 3 ]; then
    log_both "⚠️  Only $SUCCESS_COUNT/6 tasks succeeded. Consolidation may be limited."
fi

log_both ""
log_both "✅ Phase 2 complete. Press Enter to continue to consolidation..."
read

# Phase 3: Consolidate
log_both ""
log_both "📊 PHASE 3: Consolidation"
log_both "------------------------"
node 03-consolidate.js 2>&1 | tee -a "$LOG_FILE"

log_both ""
log_both "✅ EXPERIMENT COMPLETE!"
log_both "Ended at: $(date)"
log_both ""
log_both "📄 Key outputs:"
log_both "  - tasks.json: The decomposed tasks"
log_both "  - outputs/: Individual task results and logs"
log_both "  - final-consolidated-report.md: The final combined report"
log_both "  - final-summary.json: Timing and statistics"
log_both "  - $LOG_FILE: Complete experiment log"

# Show final stats if available
if [ -f "final-summary.json" ]; then
    TOTAL_TIME=$(node -e "console.log(require('./final-summary.json').totalTime)")
    SPEEDUP=$(node -e "console.log((960 / require('./final-summary.json').totalTime).toFixed(1))")
    log_both ""
    log_both "📊 Performance:"
    log_both "  - Total time: ${TOTAL_TIME}s"
    log_both "  - Speedup vs serial: ${SPEEDUP}x"
fi