#!/bin/bash

echo "🚀 Executing PARALLEL_EXPLORE strategy"

# Load decision
DECISION=$(cat state/current-decision.json)
TASKS=$(echo "$DECISION" | node -e "
const decision = JSON.parse(require('fs').readFileSync(0, 'utf8'));
console.log(JSON.stringify(decision.tasks || []));
")

# Create output directory for this iteration
ITERATION=$(cat state/iteration-count.txt)
OUTPUT_DIR="outputs/iteration-${ITERATION}-parallel"
mkdir -p "$OUTPUT_DIR"

# Function to run a task
run_exploration_task() {
    local TASK_NUM=$1
    local TASK_DESC=$2
    local OUTPUT_DIR="${OUTPUT_DIR:-outputs/iteration-1-parallel}"  # Fallback if not set
    local OUTPUT_FILE="$OUTPUT_DIR/task-${TASK_NUM}.md"
    
    echo "[Task $TASK_NUM] Starting: $TASK_DESC"
    
    local PROMPT="Analyze the document at input.md for this specific task:

$TASK_DESC

Instructions:
- Be specific and thorough
- Include line numbers for all findings
- Focus only on this task
- Complete within 3 minutes

Start now."
    
    # Run with 4-minute timeout
    local START=$(date +%s)
    
    if command -v gtimeout &> /dev/null; then
        TIMEOUT_CMD="gtimeout 240"
    else
        TIMEOUT_CMD="timeout 240"
    fi
    
    $TIMEOUT_CMD claude -p "$PROMPT" --max-turns 8 --allowedTools Read > "$OUTPUT_FILE" 2>/dev/null
    local EXIT_CODE=$?
    
    local DURATION=$(($(date +%s) - START))
    
    if [ $EXIT_CODE -eq 0 ] && [ -s "$OUTPUT_FILE" ]; then
        echo "[Task $TASK_NUM] ✅ Completed in ${DURATION}s"
        return 0
    else
        echo "[Task $TASK_NUM] ❌ Failed"
        return 1
    fi
}

export -f run_exploration_task
export OUTPUT_DIR
export ITERATION

# Parse tasks and run in parallel
echo "$TASKS" | node -e "
const input = require('fs').readFileSync(0, 'utf8').trim();
let tasks = [];
try {
    tasks = JSON.parse(input);
} catch (e) {
    // Fallback tasks if parsing fails
    tasks = [
        'Check for spelling and grammar errors',
        'Verify factual claims',
        'Analyze logical consistency',
        'Evaluate clarity'
    ];
}
tasks.forEach((task, i) => {
    console.log(\`\${i + 1}§§§\${task}\`);
});
" | parallel -j 4 --colsep '§§§' run_exploration_task {1} {2}

# Collect results and update findings
echo
echo "📊 Collecting results..."

OUTPUT_DIR="$OUTPUT_DIR" ITERATION="$ITERATION" node -e "
const fs = require('fs');
const path = require('path');

// Load current findings
let findings = [];
const findingsPath = path.join('state', 'current-findings.json');
if (fs.existsSync(findingsPath)) {
    findings = JSON.parse(fs.readFileSync(findingsPath, 'utf8'));
}

// Process new outputs
const outputDir = process.env.OUTPUT_DIR || 'outputs/iteration-1-parallel';
const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.md'));

files.forEach(file => {
    try {
        const content = fs.readFileSync(path.join(outputDir, file), 'utf8');
        
        // Simple parser for findings (would be more sophisticated in real use)
        const lines = content.split('\\n');
        lines.forEach(line => {
            if (line.match(/line \\d+/i) || line.match(/error|issue|problem|incorrect/i)) {
                findings.push({
                    source: file,
                    iteration: ${ITERATION:-1},
                    category: 'general',
                    finding: line.trim(),
                    timestamp: new Date().toISOString()
                });
            }
        });
    } catch (e) {
        console.error('Error processing', file, e.message);
    }
});

// Save updated findings
fs.writeFileSync(findingsPath, JSON.stringify(findings, null, 2));

// Update coverage map
let coverage = {};
const coveragePath = path.join('state', 'coverage-map.json');
if (fs.existsSync(coveragePath)) {
    coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
}

const tasks = ${TASKS};
tasks.forEach(task => {
    coverage[task] = true;
});

fs.writeFileSync(coveragePath, JSON.stringify(coverage, null, 2));

console.log(\`✓ Added \${files.length} task outputs to findings\`);
console.log(\`✓ Total findings: \${findings.length}\`);
"

echo "✅ PARALLEL_EXPLORE complete"