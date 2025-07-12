# Claude Code for Evaluations

Experiments in using Claude Code for iterative document evaluation.

## Directory Structure

### `/core-implementation/`
Reusable implementations and utilities:
- `iterative-evaluator-v2.js` - Fixed JS implementation with CLI support
- `run-evaluation.js` - Background process runner (no timeout issues)
- `check-evaluation.js` - Monitor evaluation progress
- `simple-test.js` - Quick single-call test
- TypeScript versions for reference

### `/experiments/`
Progressive experiments showing evolution of the approach:

1. **01-demo-simulation** - Simulated iterative evaluation (no API calls)
2. **02-direct-evaluation** - Single Claude Code call baseline
3. **03-iterative-evaluation** - Basic iterative approach with bash
4. **04-detailed-iterative** - Aggressive 1000+ word attempts
5. **05-js-iterative-evaluation** - **Working solution** with JS + background processing
6. **06-error-hunter** - **Focused error-finding** with web search (4-6 iterations)

### `/documentation/`
- Cost analyses comparing approaches
- Working document templates
- Implementation guides

## Key Findings

| Approach | Cost | Quality | Implementation |
|----------|------|---------|----------------|
| Current RoastMyPost | $0.02-0.05 | Good | Python scripts |
| Single Claude Code | $0.10-0.15 | Good | Simple but limited |
| Iterative (6 iter) | $0.70 | Excellent | Too expensive |
| **Iterative (2-3 iter)** | **$0.20-0.30** | **Very Good** | **Sweet spot** |

## Recommended Approach

Use the JavaScript iterative evaluator (`iterative-evaluator-v2.js`) with 2-3 iterations:
- Avoids timeout issues with background processing
- Clean modular code
- Good balance of cost and quality
- Extensible with more tools as needed

## Usage

```bash
# Quick test
./core-implementation/simple-test.js

# Run evaluation (won't timeout)
./core-implementation/run-evaluation.js

# Direct usage
./core-implementation/iterative-evaluator-v2.js article.md --iterations 2
```

## Next Steps

1. Implement prompt caching to reduce costs further
2. Add MCP tool integration for storing evaluations
3. Create production-ready error handling
4. Build cost tracking into the system