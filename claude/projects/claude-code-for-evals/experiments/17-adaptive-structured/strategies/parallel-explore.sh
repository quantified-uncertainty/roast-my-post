#!/bin/bash

echo "🚀 Executing PARALLEL_EXPLORE with structured outputs"
echo

# Load required modules
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Get iteration number
ITERATION=$(cat state/iteration-count.txt 2>/dev/null || echo "1")
OUTPUT_DIR="outputs/iteration-${ITERATION}-parallel"

# Create output directory
mkdir -p "$OUTPUT_DIR"
echo "📁 Output directory: $OUTPUT_DIR"

# Get tasks from current decision or use defaults
if [ -f "state/current-decision.json" ]; then
    TASK_TYPES=$(cat state/current-decision.json | node -e "
    const decision = JSON.parse(require('fs').readFileSync(0, 'utf8'));
    const taskTypes = decision.taskTypes || ['spelling_grammar', 'mathematical_accuracy', 'logical_consistency'];
    console.log(JSON.stringify(taskTypes));
    ")
else
    TASK_TYPES='["spelling_grammar", "mathematical_accuracy", "logical_consistency", "factual_verification"]'
fi

echo "📋 Task types: $TASK_TYPES"
echo

# Function to run a single task
run_structured_task() {
    local TASK_NUM=$1
    local TASK_TYPE=$2
    local TASK_ID="task-${TASK_NUM}-${TASK_TYPE}"
    
    echo "[Task $TASK_NUM] Starting: $TASK_TYPE"
    
    # Get task template
    local TASK_PROMPT=$(node -e "
    const { taskTemplates } = require('$PROJECT_DIR/lib/task-templates.js');
    const template = taskTemplates['$TASK_TYPE'];
    if (template) {
        console.log(template.prompt);
    } else {
        console.error('Unknown task type: $TASK_TYPE');
        process.exit(1);
    }
    ")
    
    if [ -z "$TASK_PROMPT" ]; then
        echo "[Task $TASK_NUM] ❌ Failed: Invalid task type"
        return 1
    fi
    
    # Create output file paths
    local OUTPUT_FILE="$OUTPUT_DIR/task-${TASK_NUM}.json"
    local LOG_FILE="$OUTPUT_DIR/task-${TASK_NUM}.log"
    
    # Run Claude with structured prompt
    local START_TIME=$(date +%s)
    
    # Use timeout command
    if command -v gtimeout &> /dev/null; then
        TIMEOUT_CMD="gtimeout 180"
    else
        TIMEOUT_CMD="timeout 180"
    fi
    
    # Execute Claude
    local CLAUDE_OUTPUT=$($TIMEOUT_CMD claude -p "$TASK_PROMPT" --max-turns 10 --allowedTools Read 2>"$LOG_FILE")
    local EXIT_CODE=$?
    
    local END_TIME=$(date +%s)
    local DURATION=$((END_TIME - START_TIME))
    
    # Save task output
    if [ $EXIT_CODE -eq 0 ] && [ -n "$CLAUDE_OUTPUT" ]; then
        echo "[Task $TASK_NUM] ✅ Completed in ${DURATION}s"
        
        # Count findings in output
        local FINDING_COUNT=$(echo "$CLAUDE_OUTPUT" | grep -c "\[FINDING\]")
        echo "[Task $TASK_NUM] 📊 Found $FINDING_COUNT findings"
        
        # Save as JSON
        node -e "
        const output = {
            taskId: '$TASK_ID',
            taskNum: $TASK_NUM,
            taskType: '$TASK_TYPE',
            status: 'success',
            duration: $DURATION,
            findingCount: $FINDING_COUNT,
            output: \`$CLAUDE_OUTPUT\`,
            timestamp: new Date().toISOString()
        };
        require('fs').writeFileSync('$OUTPUT_FILE', JSON.stringify(output, null, 2));
        "
    else
        echo "[Task $TASK_NUM] ❌ Failed (exit: $EXIT_CODE)"
        
        # Save error output
        node -e "
        const output = {
            taskId: '$TASK_ID',
            taskNum: $TASK_NUM,
            taskType: '$TASK_TYPE',
            status: 'failed',
            duration: $DURATION,
            exitCode: $EXIT_CODE,
            timestamp: new Date().toISOString()
        };
        require('fs').writeFileSync('$OUTPUT_FILE', JSON.stringify(output, null, 2));
        "
    fi
}

export -f run_structured_task
export OUTPUT_DIR PROJECT_DIR

# Create task list
TASK_NUM=1
echo "$TASK_TYPES" | node -e "
const taskTypes = JSON.parse(require('fs').readFileSync(0, 'utf8'));
taskTypes.forEach((type, i) => {
    console.log(\`\${i + 1} \${type}\`);
});
" > "$OUTPUT_DIR/task-list.txt"

# Run tasks in parallel
echo "🔄 Running ${ITERATION} tasks in parallel..."
cat "$OUTPUT_DIR/task-list.txt" | parallel -j 4 --colsep ' ' run_structured_task {1} {2}

# Parse structured findings
echo
echo "📊 Parsing structured findings..."

node "$PROJECT_DIR/lib/structured-parser.js" "$OUTPUT_DIR" > "$OUTPUT_DIR/parsed-results.json"

# Update global findings
node -e "
const fs = require('fs');
const path = require('path');

// Load parsed results
const results = JSON.parse(fs.readFileSync('$OUTPUT_DIR/parsed-results.json', 'utf8'));

// Load or initialize all findings
let allFindings = [];
const allFindingsPath = 'outputs/all-findings.json';
if (fs.existsSync(allFindingsPath)) {
    allFindings = JSON.parse(fs.readFileSync(allFindingsPath, 'utf8'));
}

// Add new findings with iteration info
const newFindings = results.findings.map(f => ({
    ...f,
    iteration: $ITERATION,
    strategy: 'parallel_explore'
}));

allFindings.push(...newFindings);

// Save updated findings
fs.writeFileSync(allFindingsPath, JSON.stringify(allFindings, null, 2));

// Update current findings in state
fs.writeFileSync('state/current-findings.json', JSON.stringify(allFindings, null, 2));

// Update coverage map
let coverage = {};
if (fs.existsSync('state/coverage-map.json')) {
    coverage = JSON.parse(fs.readFileSync('state/coverage-map.json', 'utf8'));
}

// Mark task types as covered
const taskTypes = $TASK_TYPES;
taskTypes.forEach(type => {
    coverage[type] = true;
});

fs.writeFileSync('state/coverage-map.json', JSON.stringify(coverage, null, 2));

// Print summary
console.log(\`✅ Added \${results.findings.length} structured findings\`);
console.log(\`📈 Total findings: \${allFindings.length}\`);
console.log(\`   - Critical: \${results.stats.bySeverity.critical}\`);
console.log(\`   - Major: \${results.stats.bySeverity.major}\`);
console.log(\`   - Minor: \${results.stats.bySeverity.minor}\`);
"

echo
echo "✅ PARALLEL_EXPLORE complete"