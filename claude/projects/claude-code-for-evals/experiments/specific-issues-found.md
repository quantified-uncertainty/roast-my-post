# Specific, Concrete Issues Found in "Why the tails fall apart"

## Clear Errors

### 1. **"crossing crossing"** (Line 23)
- Obvious typo/duplication
- Found by: Experiments 03 and verified in original

### 2. **R vs R-squared Confusion** (Lines 71-75)
- Line 71: "The R-square measure of correlation"
- Line 75: "an R-square of 0.5"
- **Issue**: Conflates R (correlation coefficient) with R² (coefficient of determination)
- **Why it matters**: R = 0.5 is very different from R² = 0.5
- Found by: Experiment 03

### 3. **Population Frequency Errors** (Lines 59-61)
- Claims: "10 people at +4SD" and "500 at +3SD"
- **Reality**: 
  - +4SD = ~30 per 500,000 (not 10)
  - +3SD = ~1,350 per 500,000 (not 500)
- **Why it matters**: Undermines the quantitative argument about relative population sizes
- Found by: Experiment 03

### 4. **Self-Contradiction in EA Section** (Lines 77-83)
- Says: "spread funds sooner" 
- Also says: "your best bet remains your estimate"
- **Issue**: These recommendations contradict each other
- Found by: Experiment 02

### 5. **Grammatical Error** (Line 15)
- "Maybe although having a faster serve is better all things being equal, but focusing..."
- **Issue**: Sentence structure broken ("Maybe although...but")
- Found by: Experiment 03

## Methodological Problems

### 6. **"Grabbed off Google"** (Lines 23, 27)
- Admits to convenience sampling scatter plots from Google
- No systematic selection criteria
- Undermines scientific credibility
- Found by: Multiple experiments

### 7. **Bill Gates +4SD Claim**
- Presented as fact without evidence
- Pure speculation
- Found by: Experiment 05 (fact-checked as ✗)

## Which Evaluation Found These Best?

1. **Experiment 03 (Iterative Bash)** - Found most specific errors:
   - R/R² confusion
   - Population calculation errors
   - Grammatical issues
   - Line-by-line problems

2. **Experiment 05 (JS Iterative)** - Best fact-checking:
   - Verified NBA height ✓
   - Verified tennis pattern ✓
   - Flagged Bill Gates as speculation ✗
   - Noted outdated sources

3. **Experiment 02 (Direct)** - Found logical issues:
   - EA section contradiction
   - Toy model oversimplification

## Conclusion

The iterative approaches (03 and 05) found more specific, actionable issues than the single-shot approach. Experiment 03 was particularly good at finding mathematical/technical errors, while Experiment 05 excelled at fact-checking.