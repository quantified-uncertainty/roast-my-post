# Agent Improvement Loop Project

This directory contains the key files for the programmatic agent improvement system.

## Overview

The agent improvement loop is an automated system that iteratively improves AI agents by:
1. Creating ephemeral experiments with test documents
2. Analyzing evaluation results against specific desiderata (requirements)
3. Generating targeted improvements to agent instructions
4. Using Claude oversight to make intelligent decisions about changes
5. Tracking progress and maintaining the best performing version

## Key Files

### Core Scripts
- **`improve-agent.ts`** - Main TypeScript implementation of the improvement loop
  - Handles experiment creation, monitoring, analysis, and Claude oversight
  - Supports progress saving/resuming for long-running processes
  - Implements weighted scoring based on desiderata

- **`debug-infrastructure.ts`** - Infrastructure health checking tool
  - Verifies evaluation pipeline is working correctly
  - Helps diagnose issues with job processing and data retrieval

### Configuration
- **`epistemic-agent-config.json`** - Configuration for the epistemic agent improvement
  - Defines requirements (catchy titles, analysis blocks, comment types)
  - Specifies violations to avoid (obvious observations, formatting issues)
  - Lists test document IDs and improvement parameters

### Agent Versions
- **`epistemic-agent-original.yaml`** - Starting agent configuration
- **`epistemic-agent-improved-v4.yaml`** - Iteration 4 with initial improvements
- **`epistemic-agent-improved-v8.yaml`** - Iteration 8 with further refinements

### Supporting Files
- **`run-agent-improvement.sh`** - Wrapper script for extended timeouts (30-60 minutes)
- **`infrastructure-improvement-plan.md`** - Plan for multi-layer improvement system
- **`2025-01-08-01-programmatic-agent-improvement.md`** - Original ideation document

## Usage

### Basic Usage
```bash
# Run agent improvement with configuration
tsx improve-agent.ts --config epistemic-agent-config.json

# Dry run mode (mock data, no real experiments)
tsx improve-agent.ts --config epistemic-agent-config.json --dry-run

# With extended timeout wrapper
./run-agent-improvement.sh --config epistemic-agent-config.json
```

### Infrastructure Debugging
```bash
# Check if evaluation pipeline is working
tsx debug-infrastructure.ts
```

### Configuration Options
- `--api-url` - API endpoint (default: http://localhost:4000)
- `--api-key` - Authentication key (or set ROAST_MY_POST_API_KEY)
- `--progress-file` - Save/resume progress (default: ./agent-improvement-progress.json)
- `--background` - Run in background mode with progress saving

## Architecture

### Desiderata System
The system evaluates agents based on:
1. **Requirements** - Things the agent should do (weighted)
   - Catchy comment titles with emojis
   - Proper use of analysis blocks
   - Coverage of all comment types
   
2. **Violations** - Things to avoid (weighted)
   - Obvious observations
   - Surface-level formatting issues
   - Generic advice

### Claude Oversight
Each iteration includes Claude review that decides:
- **KEEP** - Changes improved performance
- **REVERT** - Changes degraded quality
- **MODIFY** - Needs specific adjustments
- **STOP** - Optimal performance reached

### Scoring Formula
```
Score = 0.4 * requirements_met + 
        0.3 * violations_avoided + 
        0.2 * comment_types_coverage + 
        0.1 * analysis_block_quality
```

## Future Enhancements

See `infrastructure-improvement-plan.md` for multi-layer system that can improve:
- Agent YAML configurations
- Infrastructure code (documentAnalysis, API endpoints)
- Database queries and job processing
- End-to-end pipeline reliability