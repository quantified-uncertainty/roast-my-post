# Error Hunter v2 - Improvements

## Issues with v1 (Experiment 06)
1. **File naming mismatch**: Log mentions files that don't exist
2. **Poor iteration visibility**: Hard to see what each iteration found
3. **Template placeholders**: Never get filled in properly
4. **No cost tracking**: No idea how expensive each run is
5. **Confusing output**: Multiple partial files instead of one clear output
6. **Limited logging**: Can't see intermediate progress

## Improvements for v2

### 1. Clear File Structure
```
07-error-hunter-improved/
├── input.md              # Document to analyze
├── error-hunter-v2.js    # Main evaluator
├── run.js               # Simple runner script
├── logs/
│   ├── run.log         # Main execution log
│   └── iterations/     # Per-iteration logs
│       ├── iter-1.log
│       ├── iter-2.log
│       └── ...
├── working/
│   ├── errors.json     # Structured error data
│   └── working.md      # Human-readable working doc
└── output/
    ├── report.md       # Final formatted report
    └── summary.json    # Summary with stats & cost
```

### 2. Better Logging System
- **Structured logs** with timestamps and clear sections
- **Per-iteration logs** to see exactly what each iteration did
- **Progress indicators** showing current task and findings
- **Token/cost tracking** after each Claude call

### 3. Improved Working Document
- **Single source of truth**: One working document that actually gets updated
- **Structured format**: Clear sections that get filled progressively
- **JSON backing**: Store errors in structured format for better processing

### 4. Task Management
- **Clear task queue**: Show which tasks are pending/complete
- **Iteration summaries**: What was found in each iteration
- **Running totals**: Track errors found so far

### 5. Cost Tracking
- **Token counting**: Estimate tokens for each Claude call
- **Running cost total**: Show accumulated cost
- **Cost per error**: Calculate efficiency metric
- **Final cost report**: Total cost in summary

### 6. Better Error Categorization
- **Error severity levels**: Critical, Major, Minor
- **Confidence scores**: How certain about each error
- **Fix suggestions**: Proposed corrections where applicable
- **Line number accuracy**: Exact line references

### 7. Improved Output
- **Single comprehensive report**: All findings in one place
- **Executive summary**: Key issues at the top
- **Detailed findings**: Full context for each error
- **Actionable format**: Ready for author to address