# Experiment 13: Parallel Claude Code Execution (ROBUST)

## Overview
This is a **hardened version** of experiment 12, designed to handle failures gracefully and provide better monitoring of parallel execution.

## Robustness Features

### 1. **Retry Logic**
- Task decomposition: Up to 3 attempts with validation
- Falls back to predefined tasks if Claude fails

### 2. **Validation Checks**
- Validates JSON files before proceeding
- Checks task count matches expectations
- Ensures sufficient outputs before consolidation

### 3. **Timeout Protection**  
- 10-minute timeout per parallel task
- 5-minute timeout for consolidation
- Prevents hanging processes

### 4. **Progress Monitoring**
- Real-time progress counter during parallel execution
- Status tracking for each task (success/failed/timeout/empty)
- Detailed logging at every step

### 5. **Failure Handling**
- Continues with partial results if some tasks fail
- Requires minimum 3/6 successful tasks to proceed
- Saves raw outputs if consolidation fails

### 6. **Enhanced Logging**
- All output saved to timestamped log files
- Individual task logs in `outputs/`
- Error messages captured separately

## Usage

### Full Run (Recommended)
```bash
./run-all.sh
```
This runs all phases with logging and validation.

### Individual Phases (For Debugging)
```bash
# 1. Task decomposition with retries
node 01-decompose-task.js

# 2. Parallel execution with monitoring
./02-run-parallel.sh

# 3. Consolidation with fallbacks
node 03-consolidate.js
```

## Expected Behavior

### Success Path
1. Decomposes into 6 tasks (or uses fallback)
2. Runs tasks in parallel (max 4 concurrent)
3. Shows real-time progress
4. Consolidates successful results
5. Completes in 5-10 minutes

### Partial Success
- If 3-5 tasks succeed: Continues with available results
- If <3 tasks succeed: Saves raw outputs, exits gracefully
- If consolidation times out: Saves unconsolidated results

### Complete Failure
- Clear error messages at each step
- Logs preserved for debugging
- No hanging processes

## File Structure
```
13-parallel-claude-robust/
├── run-all.sh              # Main orchestrator with logging
├── 01-decompose-task.js    # Robust task decomposition
├── 02-run-parallel.sh      # Parallel execution with monitoring
├── 03-consolidate.js       # Consolidation with fallbacks
├── run-logs/               # Timestamped experiment logs
├── outputs/                # Task outputs and status files
│   ├── task-N.md          # Task output
│   ├── task-N.log         # Task execution log
│   ├── task-N.error       # Error messages
│   └── task-N.status      # Status (success/failed/timeout)
└── [generated files]       # Results and summaries
```

## Key Differences from Experiment 12

1. **Fixed task count** (always 6) for predictability
2. **Timeout protection** on all operations
3. **Progress monitoring** during parallel execution
4. **Fallback strategies** at each phase
5. **Comprehensive logging** for debugging

## Monitoring

During execution, you'll see:
- Attempt counters for retries
- Real-time progress updates
- Status summaries after each phase
- Clear success/failure indicators

## Troubleshooting

If tasks fail:
1. Check `outputs/task-N.error` for error messages
2. Review `outputs/task-N.log` for execution details
3. Check `run-logs/` for complete experiment log
4. Verify Claude Code is working: `claude -p "hello"`

The robust design ensures you get useful output even when things go wrong!