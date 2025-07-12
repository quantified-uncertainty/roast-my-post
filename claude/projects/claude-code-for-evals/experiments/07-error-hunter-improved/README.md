# Experiment 07: Error Hunter v2 (Improved)

## Overview
This is an improved version of the error hunter from experiment 06, with better logging, cost tracking, and file organization.

## Key Improvements

### 1. **Clear File Organization**
```
logs/
├── run.log              # Main execution log with timestamps
└── iterations/          # Detailed logs for each iteration
    ├── iter-1.log
    ├── iter-2.log
    └── ...

working/
├── errors.json          # Structured error data
└── working.md           # Human-readable working document

output/
├── report.md            # Final comprehensive report
└── summary.json         # Statistics and cost summary
```

### 2. **Better Logging**
- Timestamps on every log entry
- Separate iteration logs for debugging
- Progress indicators with cost tracking
- Clear error messages when things fail

### 3. **Cost Tracking**
- Estimates tokens used per iteration
- Tracks cumulative cost
- Shows cost per error found
- Stops early if cost exceeds $1.50

### 4. **Improved Error Detection**
- Parses errors from working document
- Categorizes by severity (Critical/Major/Minor)
- Tracks which iteration found each error
- Structured JSON format for programmatic access

### 5. **Better Output**
- Executive summary with key metrics
- Errors grouped by severity and category
- Performance metrics per iteration
- All findings in one comprehensive report

## Usage

### Quick Test (1 iteration)
```bash
node test-single-iteration.js
```

### Full Run (6 iterations)
```bash
node run.js
```

### Custom Run
```javascript
const ErrorHunterV2 = require('./error-hunter-v2');

const hunter = new ErrorHunterV2({
  inputFile: 'path/to/document.md',
  maxIterations: 4,
  maxTurns: 12
});

await hunter.run();
```

## Expected Outputs

1. **logs/run.log** - Main execution log showing progress
2. **working/working.md** - Progressively updated document with all errors
3. **output/report.md** - Final formatted report for humans
4. **output/summary.json** - Structured data with costs and statistics

## Cost Estimates
- Each iteration: ~$0.10-0.20
- Full 6-iteration run: ~$0.80-1.20
- Stops early if cost exceeds $3.00 or 25+ errors found