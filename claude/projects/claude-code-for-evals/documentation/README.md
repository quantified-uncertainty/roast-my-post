# Claude Code for Evaluations - Iterative Document Pattern

This directory contains a simple experiment for using Claude Code in an iterative pattern for document evaluations.

## Core Concept

Instead of one long Claude Code session that might "give up" or lose context, we use multiple short sessions that communicate through a shared markdown document.

## Files

- `iterative-evaluator.ts` - Main TypeScript class for orchestrating evaluations
- `minimal-example.ts` - Simplest possible implementation (20 lines)
- `experiment.ts` - Runner for tracking experiments with metrics
- `working-doc-template.md` - Template for the shared working document

## How It Works

1. **Initialize**: First Claude call creates a working document with tasks
2. **Iterate**: Each Claude call reads doc, does one task, updates doc
3. **Complete**: When all tasks done, extract final evaluation

## Cost Savings

With prompt caching:
- Traditional approach: $0.175 per evaluation
- Iterative with caching: ~$0.01-0.02 per evaluation (10x cheaper)

## Running an Experiment

```bash
# Simple test
npx ts-node minimal-example.ts

# Full experiment with metrics
npx ts-node experiment.ts
```

## Why This Works

- Each iteration is short (5-10 turns) so Claude doesn't "give up"
- Document serves as persistent memory between calls
- Can resume from any point if interrupted
- Easy to debug - just read the markdown file

## Next Steps

1. Test on real RoastMyPost articles
2. Compare quality vs direct approach
3. Optimize prompts for each iteration type
4. Add parallel section processing