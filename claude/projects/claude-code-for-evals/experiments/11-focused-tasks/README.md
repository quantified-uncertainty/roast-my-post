# Experiment 11: Focused Single Tasks

This experiment tests running multiple specialized error-detection tasks in parallel, each focused on finding one specific type of error.

## Purpose

To explore whether specialized, focused prompts running in parallel can:
1. Find more errors by being laser-focused on specific types
2. Complete faster through parallelization
3. Provide clearer, more actionable results
4. Be more maintainable and extensible

## Task Breakdown

Three specialized scripts, each with a single focus:
1. **find-math-errors.js** - Mathematical and logical errors only
2. **find-typos.js** - Spelling and grammar errors only
3. **find-contradictions.js** - Contradictions and inconsistencies only

## How to Run

1. Set your API key:
   ```bash
   export ANTHROPIC_API_KEY="your-key-here"
   ```

2. Run all tasks in parallel:
   ```bash
   ./run-all-parallel.sh
   ```

   Or run individual tasks:
   ```bash
   node find-math-errors.js
   node find-typos.js
   node find-contradictions.js
   ```

## Parallel Execution

The `run-all-parallel.sh` script:
- Launches all three Node.js processes simultaneously
- Tracks their PIDs for monitoring
- Waits for all to complete
- Reports total execution time
- Creates a summary of results

## Output Files

Each task creates its own report:
- `math-errors-report.md` - Mathematical/logical errors found
- `typos-report.md` - Spelling/grammar errors found
- `contradictions-report.md` - Contradictions found
- `combined-analysis.log` - All findings in one file
- `parallel-summary.md` - Execution summary

## Benefits of This Approach

1. **Specialization**: Each prompt is optimized for one task
2. **Speed**: True parallel execution (3x theoretical speedup)
3. **Clarity**: No mixed results - each report has one focus
4. **Modularity**: Easy to add new error types or disable specific checks
5. **Failure Isolation**: If one task fails, others still complete

## Trade-offs

1. **Multiple API Calls**: More requests = higher cost
2. **No Cross-Validation**: Tasks can't build on each other's findings
3. **Potential Overlap**: Some issues might be caught by multiple tasks
4. **Coordination Overhead**: Need to manage multiple processes

## Comparison Metrics

Compare with single comprehensive analysis:
- Total execution time (should be ~1/3 of sequential)
- Total number of unique errors found
- Quality/specificity of error descriptions
- Total cost (will be higher due to repeated document sending)

## Extending the System

To add a new error type:
1. Create a new `find-[error-type].js` script
2. Add it to `run-all-parallel.sh`
3. Focus the prompt on that specific error type
4. Keep the same output format for consistency