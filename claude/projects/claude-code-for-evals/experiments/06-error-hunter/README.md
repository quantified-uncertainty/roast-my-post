# Experiment 06: Error Hunter Evaluation

**Type**: Focused error-finding with 4-6 iterations and web search  
**Purpose**: Find specific, concrete errors (not vague criticisms)

## Files
- `error-hunter-evaluator.js` - Specialized evaluator for finding concrete errors
- `input.md` - Test blog post "Why the tails fall apart"
- `working_document.md` - Working document showing errors found
- `error_hunter.log` - Execution log showing progress
- Test scripts for running the evaluation

## Key Features
1. **8 specialized error-finding tasks**:
   - Typos and grammar
   - Numerical claim verification (with web search)
   - Mathematical accuracy checks
   - Logical contradictions
   - Fact-checking people/organizations
   - Citation verification
   - Terminology consistency
   - Unsupported assertions

2. **Minimum 4 iterations** to ensure thoroughness

3. **Web search integration** for fact-checking

4. **Specific error format**:
   - Line number
   - Exact quote
   - Clear explanation
   - Correction if applicable

## Results So Far
From first iteration, found 13+ specific errors including:
- **"crossing crossing"** - Repeated word (Line 23)
- **"baseball pitchers hand"** - Missing apostrophe 
- **R vs R-squared confusion** - Mathematical error (Line 75)
- **"you can by R-squared"** - Missing word (Line 99)
- **Bill Gates wealth claim** - Factual error to verify
- **Inconsistent notation** - Formatting issues

## Status
Currently running iterations 2-6 with web search verification

## Why This Approach Works
- Focuses on **actionable issues** not general critique
- Each iteration has a **specific error-hunting task**
- Requires **exact quotes and line numbers**
- Uses **web search to verify claims**
- Produces a report of **concrete fixes needed**