#!/bin/bash

echo "🎯 ADAPTIVE ORCHESTRATION WITH STRUCTURED OUTPUTS"
echo "==============================================="
echo

# Configuration
MAX_ITERATIONS=10
TIME_BUDGET=600  # 10 minutes default
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
        --test)
            MAX_ITERATIONS=1
            TIME_BUDGET=120
            shift
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
mkdir -p state outputs
chmod +x *.js strategies/*.sh lib/*.js

# Copy input file if needed
if [ ! -f "input.md" ]; then
    if [ -f "../13-parallel-claude-robust/input.md" ]; then
        cp ../13-parallel-claude-robust/input.md ./
    else
        echo "❌ Error: input.md not found"
        echo "   Please provide an input.md file to analyze"
        exit 1
    fi
fi

# Initialize state
if [ ! -f "state/iteration-count.txt" ]; then
    echo "0" > state/iteration-count.txt
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
        
        # Run final synthesis if not done
        if [ ! -f "state/final-report.md" ]; then
            echo
            echo "📊 Generating final report..."
            ./strategies/synthesis.sh
        fi
        break
    fi
    
    # Execution phase
    echo
    echo "⚙️  Phase 2: Executing $STRATEGY"
    echo "----------------------------"
    
    EXEC_START=$(date +%s)
    
    case $STRATEGY in
        PARALLEL_EXPLORE|GAP_FILL)
            ./strategies/parallel-explore.sh
            ;;
        DEEP_DIVE)
            ./strategies/deep-dive.sh 2>/dev/null || ./strategies/parallel-explore.sh
            ;;
        SYNTHESIS)
            ./strategies/synthesis.sh
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
    
    // Load current history
    let history = [];
    if (fs.existsSync('state/analysis-history.json')) {
        history = JSON.parse(fs.readFileSync('state/analysis-history.json', 'utf8'));
    }
    
    // Add this execution
    history.push({
        iteration: $ITERATION,
        strategy: '$STRATEGY',
        duration: $EXEC_DURATION,
        timestamp: new Date().toISOString()
    });
    
    fs.writeFileSync('state/analysis-history.json', JSON.stringify(history, null, 2));
    console.log('✓ State updated');
    "
    
    # Show current progress
    if [ -f "outputs/all-findings.json" ]; then
        FINDING_COUNT=$(node -e "console.log(require('./outputs/all-findings.json').length)")
        echo "✓ Total findings: $FINDING_COUNT"
    fi
    
    # Brief pause
    sleep 2
done

# Final summary
echo
echo "═══════════════════════════════════════"
echo "📊 FINAL SUMMARY"
echo "═══════════════════════════════════════"

TOTAL_TIME=$(($(date +%s) - START_TIME))
echo "⏱️  Total time: $((TOTAL_TIME / 60))m $((TOTAL_TIME % 60))s"
echo "🔄 Iterations completed: $((ITERATION))"

if [ -f "state/final-stats.json" ]; then
    node -e "
    const stats = require('./state/final-stats.json');
    console.log(\`📝 Total findings: \${stats.totalFindings}\`);
    console.log(\`   - Critical: \${stats.bySeverity.critical}\`);
    console.log(\`   - Major: \${stats.bySeverity.major}\`);
    console.log(\`   - Minor: \${stats.bySeverity.minor}\`);
    "
fi

if [ -f "state/final-report.md" ]; then
    echo
    echo "✅ Final report: state/final-report.md"
else
    echo
    echo "⚠️  No final report generated"
fi

echo
echo "📂 All outputs saved in:"
echo "   - outputs/ (task outputs by iteration)"
echo "   - state/ (final report and statistics)"