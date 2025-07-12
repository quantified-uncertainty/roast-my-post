#!/bin/bash

echo "🚀 Executing PARALLEL_EXPLORE strategy (FIXED)"

# Load decision
if [ ! -f "state/current-decision.json" ]; then
    echo "❌ No decision file found"
    exit 1
fi

# Get tasks from decision
TASKS=$(cat state/current-decision.json | node -e "
const decision = JSON.parse(require('fs').readFileSync(0, 'utf8'));
const tasks = decision.tasks || [
    'Check for spelling errors, typos, and grammatical mistakes',
    'Verify factual accuracy of claims and statistics',
    'Analyze logical consistency and contradictions',
    'Evaluate clarity and readability'
];
console.log(JSON.stringify(tasks));
")

# Get iteration number
ITERATION=$(cat state/iteration-count.txt 2>/dev/null || echo "1")
OUTPUT_DIR="outputs/iteration-${ITERATION}-parallel"

# Create output directory
mkdir -p "$OUTPUT_DIR"
echo "📁 Output directory: $OUTPUT_DIR"

# Write tasks to file for parallel processing
echo "$TASKS" | node -e "
const tasks = JSON.parse(require('fs').readFileSync(0, 'utf8'));
tasks.forEach((task, i) => {
    console.log(JSON.stringify({
        num: i + 1,
        task: task,
        outputDir: '$OUTPUT_DIR'
    }));
});
" > "$OUTPUT_DIR/tasks.jsonl"

# Function to run a single task
run_task() {
    local TASK_JSON=$1
    local TASK_NUM=$(echo "$TASK_JSON" | node -e "console.log(JSON.parse(require('fs').readFileSync(0, 'utf8')).num)")
    local TASK_DESC=$(echo "$TASK_JSON" | node -e "console.log(JSON.parse(require('fs').readFileSync(0, 'utf8')).task)")
    local OUT_DIR=$(echo "$TASK_JSON" | node -e "console.log(JSON.parse(require('fs').readFileSync(0, 'utf8')).outputDir)")
    
    echo "[Task $TASK_NUM] Starting: $TASK_DESC"
    
    # Create task-specific output file
    local OUTPUT_FILE="$OUT_DIR/task-${TASK_NUM}.json"
    local LOG_FILE="$OUT_DIR/task-${TASK_NUM}.log"
    
    # Create prompt
    local PROMPT="Analyze the document at input.md for this specific task:

$TASK_DESC

Instructions:
- Find specific issues with exact line numbers and quotes
- Be thorough but focused on this task only
- Structure your findings clearly
- For each finding, specify:
  - Line number(s)
  - Exact quote
  - Description of the issue
  - Severity (critical/major/minor)

Format your response as a numbered list of findings."
    
    # Run Claude with timeout
    local START_TIME=$(date +%s)
    
    if command -v gtimeout &> /dev/null; then
        TIMEOUT_CMD="gtimeout 240"
    else
        TIMEOUT_CMD="timeout 240"
    fi
    
    # Run and capture output
    local CLAUDE_OUTPUT=$($TIMEOUT_CMD claude -p "$PROMPT" --max-turns 8 --allowedTools Read 2>"$LOG_FILE")
    local EXIT_CODE=$?
    local END_TIME=$(date +%s)
    local DURATION=$((END_TIME - START_TIME))
    
    # Create structured output
    if [ $EXIT_CODE -eq 0 ] && [ -n "$CLAUDE_OUTPUT" ]; then
        echo "[Task $TASK_NUM] ✅ Completed in ${DURATION}s"
        
        # Save structured output
        node -e "
        const output = {
            taskNum: $TASK_NUM,
            taskDesc: '$TASK_DESC',
            duration: $DURATION,
            status: 'success',
            rawOutput: \`$CLAUDE_OUTPUT\`,
            timestamp: new Date().toISOString()
        };
        require('fs').writeFileSync('$OUTPUT_FILE', JSON.stringify(output, null, 2));
        "
    else
        echo "[Task $TASK_NUM] ❌ Failed (exit: $EXIT_CODE)"
        
        # Save error output
        node -e "
        const output = {
            taskNum: $TASK_NUM,
            taskDesc: '$TASK_DESC',
            duration: $DURATION,
            status: 'failed',
            exitCode: $EXIT_CODE,
            timestamp: new Date().toISOString()
        };
        require('fs').writeFileSync('$OUTPUT_FILE', JSON.stringify(output, null, 2));
        "
    fi
}

export -f run_task

# Run tasks in parallel
echo
echo "🔄 Running ${ITERATION} tasks in parallel..."
cat "$OUTPUT_DIR/tasks.jsonl" | parallel -j 4 run_task {}

# Collect and parse results
echo
echo "📊 Parsing results..."

node lib/findings-parser.js "$OUTPUT_DIR" > "$OUTPUT_DIR/parsed-findings.json"

# Update state with new findings
node -e "
const fs = require('fs');
const path = require('path');

// Load current findings
let allFindings = [];
if (fs.existsSync('state/current-findings.json')) {
    allFindings = JSON.parse(fs.readFileSync('state/current-findings.json', 'utf8'));
}

// Load new parsed findings
const newFindings = JSON.parse(fs.readFileSync('$OUTPUT_DIR/parsed-findings.json', 'utf8'));

// Add new findings
allFindings = allFindings.concat(newFindings.findings);

// Save updated findings
fs.writeFileSync('state/current-findings.json', JSON.stringify(allFindings, null, 2));

// Update coverage map
let coverage = {};
if (fs.existsSync('state/coverage-map.json')) {
    coverage = JSON.parse(fs.readFileSync('state/coverage-map.json', 'utf8'));
}

// Mark tasks as covered
const tasks = $TASKS;
tasks.forEach(task => {
    coverage[task] = true;
});

fs.writeFileSync('state/coverage-map.json', JSON.stringify(coverage, null, 2));

console.log(\`✅ Added \${newFindings.findings.length} new findings\`);
console.log(\`📈 Total findings: \${allFindings.length}\`);
"

echo "✅ PARALLEL_EXPLORE complete"