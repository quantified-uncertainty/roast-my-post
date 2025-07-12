# Experiment 12: Parallel Claude Code Execution

## Overview
This experiment tests whether running multiple Claude Code instances in parallel can speed up comprehensive document analysis while maintaining quality.

## Hypothesis
By decomposing a complex analysis task into independent subtasks and running them in parallel, we can achieve significant speedup compared to sequential iteration (16 minutes baseline from experiment 07).

## Architecture

### Phase 1: Task Decomposition (Claude)
- Claude analyzes the task and breaks it into 5-7 independent subtasks
- No hints given about specific error types
- Tasks are saved to `tasks.json`

### Phase 2: Parallel Execution (GNU Parallel + Claude)
- Each task runs in its own Claude Code instance
- Maximum 5 parallel processes
- Each instance reads the document and focuses on its specific task
- Results saved to `outputs/task-N.md`

### Phase 3: Consolidation (Claude)
- All parallel outputs are combined
- Claude removes duplicates and organizes findings
- Creates final professional report

## Usage

### Quick Run (All Phases)
```bash
./run-all.sh
```

### Individual Phases
```bash
# 1. Decompose the task
node 01-decompose-task.js

# 2. Run tasks in parallel
./02-run-parallel.sh

# 3. Consolidate results
node 03-consolidate.js
```

## Expected Outcomes

### Success Metrics
- **Total time < 16 minutes** (baseline from exp 07)
- **Quality maintained** (25-30 errors found)
- **No duplicate work** between parallel tasks

### Potential Issues
- Task overlap (multiple tasks finding same errors)
- Consolidation overhead
- Rate limiting on parallel Claude instances

## Key Differences from Previous Experiments

1. **Claude decides the decomposition** - Not pre-programmed tasks
2. **True parallel execution** - Multiple Claude Code instances
3. **Claude consolidates** - Not simple concatenation
4. **No specific hints** - Natural discovery of all error types

## Files Structure
```
12-parallel-claude-code/
├── 01-decompose-task.js    # Phase 1: Ask Claude to break down task
├── 02-run-parallel.sh       # Phase 2: Run tasks in parallel
├── 03-consolidate.js        # Phase 3: Combine all results
├── run-all.sh              # Run complete experiment
├── input.md                # Document to analyze
├── tasks.json              # Decomposed tasks (generated)
├── outputs/                # Individual task outputs (generated)
│   ├── task-1.md
│   ├── task-2.md
│   └── ...
├── final-consolidated-report.md  # Final report (generated)
└── final-summary.json      # Timing and statistics (generated)
```

## Theory
This approach leverages:
- **Parallelism** for wall-clock speedup
- **Focused context** for each subtask
- **Claude's intelligence** for task decomposition and consolidation
- **Independent analysis** to avoid sequential dependencies