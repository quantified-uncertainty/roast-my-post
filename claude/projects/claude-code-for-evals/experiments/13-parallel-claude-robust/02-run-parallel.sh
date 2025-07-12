#!/bin/bash

echo "🚀 Phase 2: Parallel Execution (ROBUST)"
echo

# Validation: Check prerequisites
if [ ! -f "tasks.json" ]; then
    echo "❌ Error: tasks.json not found. Run 01-decompose-task.js first."
    exit 1
fi

# Validate tasks.json is valid JSON
if ! node -e "require('./tasks.json')" 2>/dev/null; then
    echo "❌ Error: tasks.json is not valid JSON"
    exit 1
fi

# Extract and validate task count
TASK_COUNT=$(node -e "console.log(require('./tasks.json').tasks.length)")
if [ "$TASK_COUNT" -ne 6 ]; then
    echo "❌ Error: Expected 6 tasks but found $TASK_COUNT"
    exit 1
fi

echo "✅ Validated $TASK_COUNT tasks from tasks.json"

# Create output directory with cleanup
mkdir -p outputs
rm -f outputs/*.md outputs/*.log outputs/*.error

# Check if GNU parallel is installed
if ! command -v parallel &> /dev/null; then
    echo "⚠️  GNU parallel not found. Installing..."
    if command -v brew &> /dev/null; then
        brew install parallel 2>/dev/null || {
            echo "❌ Could not install GNU parallel via brew"
            echo "   Please install manually: brew install parallel"
            exit 1
        }
    else
        echo "❌ GNU parallel required but not found"
        echo "   Install with: brew install parallel (macOS) or apt-get install parallel (Linux)"
        exit 1
    fi
fi

# Record start time
START_TIME=$(date +%s)

# Create status tracking file
echo "0" > outputs/completed_count.txt

# Function to run a single task with robustness
run_task() {
    local TASK_NUM=$1
    local TASK_DESC=$2
    local OUTPUT_FILE="outputs/task-${TASK_NUM}.md"
    local LOG_FILE="outputs/task-${TASK_NUM}.log"
    local ERROR_FILE="outputs/task-${TASK_NUM}.error"
    local STATUS_FILE="outputs/task-${TASK_NUM}.status"
    
    # Initialize status
    echo "running" > "$STATUS_FILE"
    
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
- Aim for at least 3-5 specific findings

Start your analysis now."
    
    # Run Claude with timeout and error handling
    local TASK_START=$(date +%s)
    local MAX_TIME=600  # 10 minute timeout per task
    
    # Run with timeout
    timeout $MAX_TIME claude -p "$PROMPT" --max-turns 15 --allowedTools Read > "$OUTPUT_FILE" 2> "$ERROR_FILE"
    local EXIT_CODE=$?
    
    local TASK_END=$(date +%s)
    local TASK_DURATION=$((TASK_END - TASK_START))
    
    # Check exit code
    if [ $EXIT_CODE -eq 0 ]; then
        echo "[Task $TASK_NUM] ✅ Completed in ${TASK_DURATION}s" | tee -a $LOG_FILE
        echo "success" > "$STATUS_FILE"
        
        # Validate output exists and has content
        if [ -s "$OUTPUT_FILE" ]; then
            local LINE_COUNT=$(wc -l < "$OUTPUT_FILE")
            echo "[Task $TASK_NUM] Generated $LINE_COUNT lines of output" | tee -a $LOG_FILE
        else
            echo "[Task $TASK_NUM] ⚠️  Warning: Empty output file" | tee -a $LOG_FILE
            echo "empty" > "$STATUS_FILE"
        fi
    elif [ $EXIT_CODE -eq 124 ]; then
        echo "[Task $TASK_NUM] ⏱️  Timeout after ${MAX_TIME}s" | tee -a $LOG_FILE
        echo "timeout" > "$STATUS_FILE"
    else
        echo "[Task $TASK_NUM] ❌ Failed with exit code $EXIT_CODE" | tee -a $LOG_FILE
        echo "failed" > "$STATUS_FILE"
        if [ -s "$ERROR_FILE" ]; then
            echo "[Task $TASK_NUM] Error: $(head -n 3 $ERROR_FILE)" | tee -a $LOG_FILE
        fi
    fi
    
    # Update completed count (thread-safe)
    (
        flock -x 200
        COUNT=$(cat outputs/completed_count.txt)
        echo $((COUNT + 1)) > outputs/completed_count.txt
    ) 200>outputs/completed_count.lock
}

export -f run_task

# Extract tasks
TASKS=$(node -e "
const data = require('./tasks.json');
data.tasks.forEach((task, i) => console.log(task));
")

# Run all tasks in parallel with progress monitoring
echo
echo "🔄 Launching 6 tasks in parallel (max 4 concurrent)..."
echo "📊 Progress will be shown below:"
echo

# Start progress monitor in background
(
    while true; do
        COMPLETED=$(cat outputs/completed_count.txt 2>/dev/null || echo 0)
        printf "\r⏳ Progress: $COMPLETED/6 tasks completed"
        if [ "$COMPLETED" -eq 6 ]; then
            printf "\r✅ Progress: 6/6 tasks completed!    \n"
            break
        fi
        sleep 2
    done
) &
PROGRESS_PID=$!

# Run tasks with controlled parallelism
echo "$TASKS" | parallel -j 4 --line-buffer --timeout 700 run_task {#} {}

# Kill progress monitor
kill $PROGRESS_PID 2>/dev/null

# Calculate final timing
END_TIME=$(date +%s)
TOTAL_TIME=$((END_TIME - START_TIME))

echo
echo "⏱️  Total parallel execution time: ${TOTAL_TIME}s"
echo

# Check results and create summary
echo "📊 Checking task results..."
echo

SUCCESS_COUNT=0
FAILED_COUNT=0
TIMEOUT_COUNT=0
EMPTY_COUNT=0

for i in {1..6}; do
    STATUS=$(cat "outputs/task-${i}.status" 2>/dev/null || echo "missing")
    case $STATUS in
        success)
            ((SUCCESS_COUNT++))
            echo "  ✅ Task $i: Success"
            ;;
        timeout)
            ((TIMEOUT_COUNT++))
            echo "  ⏱️  Task $i: Timeout"
            ;;
        empty)
            ((EMPTY_COUNT++))
            echo "  ⚠️  Task $i: Empty output"
            ;;
        failed)
            ((FAILED_COUNT++))
            echo "  ❌ Task $i: Failed"
            ;;
        *)
            ((FAILED_COUNT++))
            echo "  ❓ Task $i: Unknown status"
            ;;
    esac
done

echo
echo "Summary: $SUCCESS_COUNT success, $FAILED_COUNT failed, $TIMEOUT_COUNT timeout, $EMPTY_COUNT empty"

# Create execution summary
node -e "
const fs = require('fs');
const tasks = require('./tasks.json').tasks;

const summary = {
  executionTime: ${TOTAL_TIME},
  tasksTotal: 6,
  tasksSuccess: ${SUCCESS_COUNT},
  tasksFailed: ${FAILED_COUNT},
  tasksTimeout: ${TIMEOUT_COUNT},
  tasksEmpty: ${EMPTY_COUNT},
  timestamp: new Date().toISOString(),
  outputs: tasks.map((task, i) => {
    const num = i + 1;
    const status = fs.existsSync(\`outputs/task-\${num}.status\`) 
      ? fs.readFileSync(\`outputs/task-\${num}.status\`, 'utf8').trim() 
      : 'missing';
    const size = fs.existsSync(\`outputs/task-\${num}.md\`) 
      ? fs.statSync(\`outputs/task-\${num}.md\`).size 
      : 0;
    return {
      taskNumber: num,
      description: task,
      status: status,
      outputFile: \`outputs/task-\${num}.md\`,
      logFile: \`outputs/task-\${num}.log\`,
      size: size
    };
  })
};

fs.writeFileSync('parallel-execution-summary.json', JSON.stringify(summary, null, 2));
"

echo
echo "📄 Execution summary saved to parallel-execution-summary.json"

# Decide if we can proceed
if [ $SUCCESS_COUNT -lt 3 ]; then
    echo
    echo "❌ Insufficient successful tasks ($SUCCESS_COUNT/6). Cannot proceed to consolidation."
    echo "   Please check the logs in outputs/ for details."
    exit 1
else
    echo
    echo "✅ Sufficient tasks completed ($SUCCESS_COUNT/6). Ready for consolidation."
    echo "   Run ./03-consolidate.js to combine results."
fi

# Cleanup
rm -f outputs/completed_count.txt outputs/completed_count.lock