# Experiment 05: JavaScript Iterative Evaluation

**Type**: JavaScript-based iterative evaluation with background processing  
**Purpose**: Demonstrate working iterative evaluation without timeout issues

## Files
- `iterative-evaluator-v2.js` - Clean JS implementation of iterative evaluator
- `input.md` - Test blog post "Why the tails fall apart"
- `working_document.md` - 107-line working document showing iterative progress
- `output.md` - Final evaluation (structured with strengths/weaknesses/recommendations)
- `evaluation.log` - Full execution log showing both iterations

## Results
- **Duration**: 1196 seconds (~20 minutes)
- **Iterations**: 2 completed successfully
  - Iteration 1: Extracted and categorized key claims
  - Iteration 2: Fact-checked claims (NBA ✓, tennis ✓, IQ ~, Gates ✗)
- **Output quality**: Professional evaluation with balanced critique
- **Estimated cost**: ~$0.20-0.30

## Key Improvements
1. **No timeout issues** - Background process approach worked perfectly
2. **Clean JavaScript** - Much better than bash scripts
3. **Trackable progress** - Log file shows each step
4. **Modular design** - Can be imported and reused

## Known Issues
- Minor bug at end: "ReferenceError: i is not defined" (after completion)
- Should be fixed in production version

## Usage
```bash
# Run directly
./iterative-evaluator-v2.js input.md --iterations 2 --output eval.md

# Or run in background
node iterative-evaluator-v2.js input.md --iterations 3 &
```