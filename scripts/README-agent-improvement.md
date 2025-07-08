# Agent Improvement System

This system automatically improves agents through iterative experiments with Claude oversight.

## Quick Start

### Dry Run (Testing)
```bash
npx tsx scripts/improve-agent.ts --config scripts/epistemic-agent-config.json --dry-run
```

### Real Experiments (Creates experiments visible at http://localhost:4000/experiments)

**Option 1: Direct Run (may timeout)**
```bash
export ROAST_MY_POST_API_KEY="rmp_your_api_key_here"
npx tsx scripts/improve-agent.ts --config scripts/epistemic-agent-config.json
```

**Option 2: Extended Timeout (Recommended)**
```bash
# Run with 30-minute timeout instead of 2 minutes
./scripts/run-agent-improvement.sh --config scripts/epistemic-agent-config.json --timeout 30m
```

**Option 3: Background Mode with Progress Saving**
```bash
# Run in background, saves progress to resume if interrupted
./scripts/run-agent-improvement.sh --background --timeout 60m

# Monitor progress in another terminal
npx tsx scripts/monitor-progress.ts
# Or watch continuously
watch -n 5 'npx tsx scripts/monitor-progress.ts'
```

## What It Does

1. **Creates Ephemeral Experiments**: Each iteration creates a new ephemeral agent visible in `/experiments`
2. **Runs Evaluations**: Tests the agent against configured documents
3. **Analyzes Results**: Checks if requirements are met (catchy titles, analysis blocks, etc.)
4. **Gets Claude's Decision**: Claude reviews changes and decides KEEP/REVERT/MODIFY/STOP
5. **Iterates**: Continues until success threshold is reached or Claude says stop

## Configuration

Edit `scripts/epistemic-agent-config.json` to:
- Change test documents
- Adjust requirements and violations
- Modify comment type expectations
- Set success thresholds

## Claude Oversight

Each iteration, Claude reviews:
- Performance metrics vs previous iterations
- Sample evaluations from the experiment
- Agent diff showing exact changes
- Historical trends and context

Claude then decides whether to keep, revert, modify, or stop improvements.

## Example Output

```
🚀 Starting agent improvement process with Claude oversight...

📊 Iteration 1/10
🔬 Creating real experiment...
📊 Experiment created: http://localhost:3000/experiments/agent-improvement-1234-iter1
⏳ Waiting for jobs to complete...
Jobs: 3/3 complete (0 failed)
📋 Retrieved 3 evaluations
📈 Current score: 0.742 (Previous: 0.000)
🤔 Asking Claude for oversight...
🎯 Claude Decision: KEEP (Confidence: 0.85)
💭 Reasoning: Changes improve catchy titles and analysis block usage without compromising quality...
⚠️ Risk: LOW | Quality Trend: IMPROVING
✅ Keeping changes
```

## Files

- `improve-agent.ts` - Main improvement script
- `epistemic-agent-config.json` - Configuration for epistemic agent improvement
- `test-analysis.ts` - Test script for analyzing evaluations
- `get-test-documents.ts` - Helper to find suitable test documents