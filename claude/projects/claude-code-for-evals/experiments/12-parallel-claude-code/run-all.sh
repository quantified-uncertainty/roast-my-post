#!/bin/bash

echo "🎯 EXPERIMENT 12: Parallel Claude Code Execution"
echo "============================================="
echo

# Make all scripts executable
chmod +x *.js *.sh

# Phase 1: Decompose
echo "📋 PHASE 1: Task Decomposition"
echo "------------------------------"
node 01-decompose-task.js

if [ $? -ne 0 ]; then
    echo "❌ Decomposition failed"
    exit 1
fi

echo
echo "⏸️  Press Enter to continue to parallel execution..."
read

# Phase 2: Parallel execution
echo
echo "🚀 PHASE 2: Parallel Execution"
echo "------------------------------"
./02-run-parallel.sh

if [ $? -ne 0 ]; then
    echo "❌ Parallel execution failed"
    exit 1
fi

echo
echo "⏸️  Press Enter to continue to consolidation..."
read

# Phase 3: Consolidate
echo
echo "📊 PHASE 3: Consolidation"
echo "------------------------"
node 03-consolidate.js

echo
echo "✅ EXPERIMENT COMPLETE!"
echo
echo "📄 Key outputs:"
echo "  - tasks.json: The decomposed tasks"
echo "  - outputs/: Individual task results"
echo "  - final-consolidated-report.md: The final combined report"
echo "  - final-summary.json: Timing and statistics"