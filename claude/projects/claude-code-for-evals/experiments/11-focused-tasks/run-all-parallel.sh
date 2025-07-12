#!/bin/bash

echo "=== PARALLEL FOCUSED TASK ANALYSIS ==="
echo "Starting all three focused analyses in parallel..."
echo "Start time: $(date)"
echo

# Clear combined log
> combined-analysis.log

# Record start time
START_TIME=$(date +%s)

# Run all three scripts in parallel
node find-math-errors.js &
PID1=$!

node find-typos.js &
PID2=$!

node find-contradictions.js &
PID3=$!

echo "Launched three parallel processes:"
echo "  - Math errors (PID: $PID1)"
echo "  - Typos (PID: $PID2)"
echo "  - Contradictions (PID: $PID3)"
echo
echo "Waiting for all processes to complete..."

# Wait for all background processes
wait $PID1
MATH_EXIT=$?

wait $PID2
TYPO_EXIT=$?

wait $PID3
CONTRA_EXIT=$?

# Record end time
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo
echo "=== ALL ANALYSES COMPLETE ==="
echo "Total execution time: ${DURATION} seconds"
echo
echo "Exit codes:"
echo "  - Math errors: $MATH_EXIT"
echo "  - Typos: $TYPO_EXIT"
echo "  - Contradictions: $CONTRA_EXIT"
echo
echo "Individual reports:"
echo "  - math-errors-report.md"
echo "  - typos-report.md"
echo "  - contradictions-report.md"
echo
echo "Combined log: combined-analysis.log"

# Create summary
cat > parallel-summary.md << EOF
# Parallel Focused Analysis Summary

**Total execution time**: ${DURATION} seconds

## Process Status
- Math error detection: Exit code $MATH_EXIT
- Typo detection: Exit code $TYPO_EXIT
- Contradiction detection: Exit code $CONTRA_EXIT

## Output Files
- \`math-errors-report.md\` - Mathematical and logical errors
- \`typos-report.md\` - Spelling and grammar errors
- \`contradictions-report.md\` - Contradictions and inconsistencies
- \`combined-analysis.log\` - Combined output from all analyses

## Benefits of Parallel Focused Analysis
1. Each task has a single, clear objective
2. Parallel execution reduces total time
3. Specialized prompts for each error type
4. Easy to add/remove specific checks
5. Failures are isolated to specific tasks
EOF

echo
echo "Summary written to parallel-summary.md"