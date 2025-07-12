# Experiment 15: Adaptive Orchestration

## Overview
An intelligent, adaptive system where Claude acts as a project manager, dynamically deciding what analysis steps to take based on the current state.

## Key Innovation
Instead of a fixed pipeline (decompose → parallel → consolidate), Claude repeatedly:
1. **Assesses** the current state of analysis
2. **Decides** what to do next
3. **Executes** the chosen strategy
4. **Loops** back to assessment

## Decision Types

Claude can choose from several strategies:

### 1. **Parallel Exploration** 
"We need broad coverage - let's run 3-5 parallel tasks to explore different aspects"

### 2. **Deep Sequential Dive**
"We found something interesting in the previous analysis - let's investigate deeper"

### 3. **Synthesis**
"We have enough raw findings - time to consolidate and prioritize"

### 4. **Targeted Follow-up**
"Previous tasks missed something - let's fill specific gaps"

### 5. **Completion**
"The analysis is comprehensive enough - we're done"

## How It Works

```
┌─────────────┐
│   START     │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌──────────────┐
│  Planning   │────▶│ Read State   │
│   Phase     │     │ Files        │
└──────┬──────┘     └──────────────┘
       │
       ▼
┌─────────────┐
│   Decide    │
│  Strategy   │
└──────┬──────┘
       │
   ┌───┴───┬───────┬────────┬─────────┐
   ▼       ▼       ▼        ▼         ▼
Parallel  Deep   Synthesis  Gap    Complete
Tasks     Dive             Fill
   │       │       │        │         │
   └───────┴───────┴────────┴─────────┘
                   │
                   ▼
            ┌─────────────┐
            │   Execute   │
            │  Strategy   │
            └──────┬──────┘
                   │
                   ▼
            ┌─────────────┐
            │Update State │
            └──────┬──────┘
                   │
                   └──────▶ (Loop to Planning)
```

## State Management

The system maintains state in `state/`:
- `current-findings.json` - All findings so far
- `analysis-history.json` - What strategies have been tried
- `coverage-map.json` - What aspects have been analyzed
- `decision-log.json` - Claude's reasoning for each decision

## Benefits

1. **Adaptive**: Responds to what it finds rather than following rigid steps
2. **Efficient**: Can stop early if sufficient findings exist
3. **Thorough**: Can dig deeper into interesting areas
4. **Intelligent**: Makes reasoned decisions about resource allocation
5. **Transparent**: Logs reasoning for each decision

## Example Flow

1. **Iteration 1**: "I see we have a document to analyze. Let me start with broad parallel exploration of spelling, facts, logic, and clarity."
2. **Iteration 2**: "I found several statistical claims. Let me do a deep dive to verify these specific numbers."
3. **Iteration 3**: "The statistics check revealed calculation errors. Let me search for similar calculation issues throughout."
4. **Iteration 4**: "I have comprehensive findings across multiple categories. Time to synthesize into a final report."
5. **Iteration 5**: "The analysis is complete with 47 specific issues found and prioritized."

## Usage

```bash
# Start the adaptive orchestration
./orchestrator.sh

# Optional: Set max iterations (default: 10)
./orchestrator.sh --max-iterations 5

# Optional: Set time budget (default: 20 min)
./orchestrator.sh --time-budget 600
```

## Key Files

- `orchestrator.sh` - Main loop controller
- `planning-agent.js` - Claude decides what to do next
- `execute-strategy.sh` - Runs the chosen strategy
- `state/` - Maintains analysis state between iterations