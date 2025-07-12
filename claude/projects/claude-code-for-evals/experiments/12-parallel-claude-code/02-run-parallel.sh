#!/bin/bash

echo "🚀 Phase 2: Parallel Execution"
echo

# Check if tasks.json exists
if [ ! -f "tasks.json" ]; then
    echo "❌ Error: tasks.json not found. Run 01-decompose-task.js first."
    exit 1
fi

# Extract tasks from JSON (using node for cross-platform compatibility)
TASKS=$(node -e "
const data = require('./tasks.json');
data.tasks.forEach((task, i) => console.log(task));
")

# Create output directory
mkdir -p outputs
rm -f outputs/*.md outputs/*.log

# Count tasks
TASK_COUNT=$(node -e "console.log(require('./tasks.json').tasks.length)")
echo "📋 Found $TASK_COUNT tasks to run in parallel"
echo

# Check if GNU parallel is installed
if ! command -v parallel &> /dev/null; then
    echo "⚠️  GNU parallel not found. Installing..."
    brew install parallel 2>/dev/null || {
        echo "❌ Could not install GNU parallel. Please install manually:"
        echo "   brew install parallel"
        exit 1
    }
fi

# Record start time
START_TIME=$(date +%s)

# Function to run a single task
run_task() {
    local TASK_NUM=$1
    local TASK_DESC=$2
    local OUTPUT_FILE="outputs/task-${TASK_NUM}.md"
    local LOG_FILE="outputs/task-${TASK_NUM}.log"
    
    echo "[Task $TASK_NUM] Starting: $TASK_DESC" | tee -a $LOG_FILE
    
    # Create prompt for this specific task
    local PROMPT="Analyze the document at input.md for the following specific task:

$TASK_DESC

Instructions:
- Read the document carefully
- Focus ONLY on the assigned task
- Find specific issues with exact line numbers and quotes
- Be thorough but stay within scope
- Output your findings in a clear, structured format

Start your analysis now."
    
    # Run Claude for this task
    local TASK_START=$(date +%s)
    
    claude -p "$PROMPT" --max-turns 15 --allowedTools Read > "$OUTPUT_FILE" 2>> "$LOG_FILE"
    
    local TASK_END=$(date +%s)
    local TASK_DURATION=$((TASK_END - TASK_START))
    
    echo "[Task $TASK_NUM] Completed in ${TASK_DURATION}s" | tee -a $LOG_FILE
}

export -f run_task

# Run all tasks in parallel
echo "🔄 Launching all tasks in parallel..."
echo "$TASKS" | parallel -j 5 --line-buffer run_task {#} {}

# Wait for completion and calculate timing
END_TIME=$(date +%s)
TOTAL_TIME=$((END_TIME - START_TIME))

echo
echo "✅ All tasks completed!"
echo "⏱️  Total parallel execution time: ${TOTAL_TIME}s"

# Create summary
echo
echo "📊 Creating execution summary..."

node -e "
const fs = require('fs');
const tasks = require('./tasks.json').tasks;

const summary = {
  executionTime: ${TOTAL_TIME},
  tasksCompleted: tasks.length,
  timestamp: new Date().toISOString(),
  outputs: tasks.map((task, i) => ({
    taskNumber: i + 1,
    description: task,
    outputFile: \`outputs/task-\${i + 1}.md\`,
    logFile: \`outputs/task-\${i + 1}.log\`,
    size: fs.existsSync(\`outputs/task-\${i + 1}.md\`) 
      ? fs.statSync(\`outputs/task-\${i + 1}.md\`).size 
      : 0
  }))
};

fs.writeFileSync('parallel-execution-summary.json', JSON.stringify(summary, null, 2));
"

echo "📄 Summary saved to parallel-execution-summary.json"
echo
echo "Next step: Run ./03-consolidate.js to combine all results"