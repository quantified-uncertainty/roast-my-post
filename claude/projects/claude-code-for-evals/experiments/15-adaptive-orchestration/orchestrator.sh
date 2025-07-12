#!/bin/bash

echo "🎯 ADAPTIVE ORCHESTRATION SYSTEM"
echo "================================"
echo

# Configuration
MAX_ITERATIONS=10
TIME_BUDGET=1200  # 20 minutes default
START_TIME=$(date +%s)

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --max-iterations)
            MAX_ITERATIONS="$2"
            shift 2
            ;;
        --time-budget)
            TIME_BUDGET="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "📋 Configuration:"
echo "  - Max iterations: $MAX_ITERATIONS"
echo "  - Time budget: $((TIME_BUDGET / 60)) minutes"
echo

# Initialize
mkdir -p state
mkdir -p outputs
chmod +x *.js *.sh

# Copy input file if needed
if [ ! -f "input.md" ]; then
    cp ../13-parallel-claude-robust/input.md ./input.md 2>/dev/null || {
        echo "❌ Error: input.md not found"
        echo "   Please provide an input.md file to analyze"
        exit 1
    }
fi

# Reset state if requested
if [ "$1" == "--reset" ]; then
    echo "🔄 Resetting state..."
    rm -rf state/*
    rm -rf outputs/*
fi

# Main orchestration loop
ITERATION=0
CONTINUE=true

while [ "$CONTINUE" = true ]; do
    ITERATION=$((ITERATION + 1))
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))
    
    echo
    echo "═══════════════════════════════════════"
    echo "🔄 ITERATION $ITERATION"
    echo "⏱️  Elapsed: $((ELAPSED / 60))m $((ELAPSED % 60))s"
    echo "═══════════════════════════════════════"
    echo
    
    # Check termination conditions
    if [ $ITERATION -gt $MAX_ITERATIONS ]; then
        echo "⚠️  Reached max iterations ($MAX_ITERATIONS)"
        CONTINUE=false
        break
    fi
    
    if [ $ELAPSED -gt $TIME_BUDGET ]; then
        echo "⚠️  Exceeded time budget ($((TIME_BUDGET / 60)) minutes)"
        CONTINUE=false
        break
    fi
    
    # Planning phase
    echo "📊 Phase 1: Planning"
    echo "-------------------"
    node planning-agent.js
    
    if [ ! -f "state/current-decision.json" ]; then
        echo "❌ Planning failed - no decision made"
        exit 1
    fi
    
    # Extract strategy
    STRATEGY=$(node -e "console.log(require('./state/current-decision.json').strategy)")
    
    if [ "$STRATEGY" = "COMPLETE" ]; then
        echo "✅ Analysis complete!"
        CONTINUE=false
        break
    fi
    
    # Execution phase
    echo
    echo "⚙️  Phase 2: Executing $STRATEGY"
    echo "----------------------------"
    
    EXEC_START=$(date +%s)
    
    case $STRATEGY in
        PARALLEL_EXPLORE)
            ./strategies/parallel-explore.sh
            ;;
        DEEP_DIVE)
            ./strategies/deep-dive.sh
            ;;
        SYNTHESIS)
            ./strategies/synthesis.sh
            ;;
        GAP_FILL)
            ./strategies/gap-fill.sh
            ;;
        *)
            echo "❌ Unknown strategy: $STRATEGY"
            exit 1
            ;;
    esac
    
    EXEC_END=$(date +%s)
    EXEC_DURATION=$((EXEC_END - EXEC_START))
    
    # Update history
    echo
    echo "📝 Phase 3: Updating State"
    echo "-------------------------"
    
    node -e "
    const fs = require('fs');
    const path = require('path');
    
    // Load current history
    let history = [];
    const historyPath = path.join('state', 'analysis-history.json');
    if (fs.existsSync(historyPath)) {
        history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    }
    
    // Add this execution
    history.push({
        iteration: $ITERATION,
        strategy: '$STRATEGY',
        duration: $EXEC_DURATION,
        timestamp: new Date().toISOString()
    });
    
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
    console.log('✓ State updated');
    "
    
    # Brief pause between iterations
    echo
    echo "💭 Thinking..."
    sleep 2
done

# Final report
echo
echo "═══════════════════════════════════════"
echo "📊 FINAL SUMMARY"
echo "═══════════════════════════════════════"

TOTAL_TIME=$(($(date +%s) - START_TIME))
echo "⏱️  Total time: $((TOTAL_TIME / 60))m $((TOTAL_TIME % 60))s"
echo "🔄 Iterations completed: $((ITERATION - 1))"

if [ -f "state/current-findings.json" ]; then
    FINDING_COUNT=$(node -e "console.log(require('./state/current-findings.json').length)")
    echo "📝 Total findings: $FINDING_COUNT"
fi

if [ -f "state/final-report.md" ]; then
    echo
    echo "✅ Final report available at: state/final-report.md"
else
    echo
    echo "⚠️  No final report generated"
fi

echo
echo "📂 Check the state/ directory for detailed results"