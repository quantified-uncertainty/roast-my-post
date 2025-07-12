# Experiment 14: Multi-Stage Short Tasks

## Overview
This experiment implements a multi-stage analysis system where each stage consists of short (2-4 minute) focused tasks that build upon previous results.

## Key Design Principles

1. **Short Task Duration**: Each task has a 4-minute timeout to ensure quick completion
2. **Multi-Stage Pipeline**: Analysis happens in sequential stages
3. **Progressive Enhancement**: Each stage builds on previous results
4. **Focused Scope**: Tasks are highly specific to complete quickly
5. **Parallel Within Stages**: Each stage runs multiple tasks in parallel

## Stage Structure

### Stage 1: Initial Surface Analysis (4 min/task)
- Quick spelling/grammar check (first 50%)
- Quick spelling/grammar check (last 50%)
- Basic fact check (claims only)
- Structure overview

### Stage 2: Deeper Analysis (4 min/task)
Based on Stage 1 findings:
- Investigate specific factual claims identified
- Analyze logical flow in problem sections
- Check technical accuracy of examples
- Review consistency of terminology

### Stage 3: Synthesis (4 min/task)
- Consolidate all findings
- Prioritize by severity
- Generate recommendations
- Create executive summary

## Benefits
- **Reliability**: Short tasks rarely timeout
- **Adaptability**: Later stages can focus on issues found earlier
- **Efficiency**: Total time ~12-15 minutes vs 16+ minutes
- **Granularity**: Can stop after any stage with useful results
- **Debuggability**: Clear what each task accomplished

## Usage

```bash
# Run all stages
./run-all-stages.sh

# Run individual stages
./stage-1-surface.sh
./stage-2-deep.sh  
./stage-3-synthesis.sh
```

## File Structure
```
14-multi-stage-short-tasks/
├── stages/
│   ├── stage-1-tasks.json
│   ├── stage-2-tasks.json
│   └── stage-3-tasks.json
├── outputs/
│   ├── stage-1/
│   ├── stage-2/
│   └── stage-3/
├── stage-1-surface.sh
├── stage-2-deep.sh
├── stage-3-synthesis.sh
├── run-all-stages.sh
└── input.md
```