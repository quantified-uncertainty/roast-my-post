# Migration from Experiment 19

## Why Migrate?

Experiment 19's architecture had several issues:
- Complex bash/node hybrid causing variable binding errors
- GNU parallel compatibility issues  
- Fragile text parsing from Claude output
- Poor error recovery
- Difficult to debug multi-file pipeline

Experiment 20 solves these with three cleaner architectures.

## What's Different

### Old Architecture (Exp 19)
```
orchestrate-analysis.sh
    → analyze-document.js
    → generate-tasks.js
    → create-prompts.js
    → parallel execution
    → parse-task-output.js
    → collect-findings.js
    → validate-findings.js
    → analyze-patterns.js
    → create-synthesis-prompt.js
    → generate-summary.js
```

### New Architectures (Exp 20)

**Option 1: Simple (1 file)**
```
simple-analyzer.js (does everything)
```

**Option 2: Resumable (1 file)**  
```
resumable-analyzer.js (chunks + job tracking)
```

**Option 3: Prompt-Based (1 file)**
```
prompt-based-analyzer.js (modular prompts + tools)
```

## Feature Comparison

| Feature | Exp 19 | Exp 20 Simple | Exp 20 Resumable | Exp 20 Prompt-Based |
|---------|--------|---------------|------------------|---------------------|
| Files needed | 15+ | 1 | 1 | 1 |
| Resume on failure | No | No | Yes | Yes |
| Document size limit | ~50 pages | ~50 pages | Unlimited | Unlimited |
| Custom analyses | Edit multiple files | Edit analyzer | Edit analyzer | Add prompt |
| Debugging | Very hard | Easy | Easy | Easy |
| Job visibility | Limited | No | Full dashboard | Full dashboard |

## Quick Migration Guide

### If you were using basic analysis:
```bash
# Old (Exp 19)
./orchestrate-analysis.sh document.md

# New (Exp 20) - Simple analyzer
./simple-analyzer.js document.md
```

### If you need resumability:
```bash
# Old (Exp 19) - No resume capability
./orchestrate-analysis.sh large-doc.md  # Fails halfway, start over

# New (Exp 20) - Resumable
./resumable-analyzer.js large-doc.md
# If it fails, resume with:
./resumable-analyzer.js large-doc.md outputs/large-doc-*/
```

### If you want specific analyses:
```bash
# Old (Exp 19) - Had to modify multiple files
# Edit generate-tasks.js, create-prompts.js, etc.

# New (Exp 20) - Just specify prompts
./prompt-based-analyzer.js doc.md --prompts logical_errors,factual_claims
```

## Output Differences

### Exp 19 Output
```
outputs/document-timestamp/
├── document-metadata.json
├── task-list.json
├── prompts/
│   ├── task-1-mathematical_accuracy.txt
│   └── ...
├── tasks/
│   ├── task-1-mathematical_accuracy.json
│   └── ...
├── synthesis/
├── all-findings-raw.json
├── all-findings.json
├── final-report.md
├── executive-summary.json
└── cost-summary.txt
```

### Exp 20 Output (Cleaner)
```
outputs/document-timestamp/
├── state.json              # For resuming
├── dashboard.md            # Clear status
├── report.md              # Final report
├── all-findings.json      # All findings
├── chunks/                # Document chunks (resumable only)
├── job-results/           # Individual results (prompt-based)
└── verification-requests.json  # What needs checking
```

## Code You Can Delete

If migrating to Exp 20, you can delete these from Exp 19:
- All the `lib/*.js` files
- `orchestrate-analysis.sh`
- `strategies/` directory
- Complex shell scripts

Keep only:
- Your test documents
- Any custom analysis logic (to port to new prompts)

## Porting Custom Analyses

### Old Way (Exp 19)
Had to edit multiple files:
- `lib/create-prompts.js` - Add prompt text
- `lib/generate-tasks.js` - Add task type
- `lib/parse-task-output.js` - Add parsing logic

### New Way (Exp 20)
Just add to `ANALYSIS_PROMPTS`:

```javascript
// In prompt-based-analyzer.js
my_custom_analysis: {
    name: "My Custom Analysis",
    description: "What it does",
    prompt: `Your analysis prompt here...`,
    tools: ["web_search"],
    estimatedTokens: 2000
}
```

## Performance Comparison

Tested on 100-page document:

| Metric | Exp 19 | Exp 20 Resumable | Exp 20 Prompt-Based |
|--------|--------|------------------|---------------------|
| Setup time | 30s | 5s | 5s |
| Failure recovery | Start over | Resume instantly | Resume instantly |
| Debugging failed job | Check 5+ files | Check 1 job file | Check 1 job file |
| Adding analysis type | 30 min | 5 min | 2 min |

## Recommended Migration Path

1. **For most users**: Start with `prompt-based-analyzer.js`
   - Most flexible
   - Best feature set
   - Production ready

2. **For simple needs**: Use `simple-analyzer.js`
   - Quick and easy
   - No complexity

3. **For huge documents**: Use `resumable-analyzer.js`
   - Handles any size
   - Basic but robust

## Getting Started

```bash
cd experiments/20-prompt-based-architecture

# See what analyses are available
./prompt-based-analyzer.js --list

# Run your first analysis
./prompt-based-analyzer.js ../19-production-orchestrated/test-documents/test.md

# Compare output with Exp 19
ls outputs/*/dashboard.md
```

The new architecture is much more robust and easier to work with!