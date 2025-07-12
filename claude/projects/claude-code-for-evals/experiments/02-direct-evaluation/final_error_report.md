# Final Error Report: "Why the tails fall apart"

## Summary
This report documents 21 specific errors found in the article through systematic error hunting. The errors fall into three main categories: mathematical errors, logical contradictions, and citation/reference issues.

## Mathematical Errors (6 errors)

1. **Persistent confusion between R and R-squared throughout the article**
   - Line 27: Claims "R-square is > 0.8" for a scatter plot (should be R > 0.8)
   - Line 71: States "R-square...is the same as the cosine" (R equals cosine, not R-squared)
   - Line 75: Says "R-square of 0.5 (corresponding to angle of sixty degrees)" (R = 0.5 corresponds to 60°, not R-squared)
   - Line 99: Claims to "multiply by R-squared" for z-scores (should multiply by R)

2. **Incorrect angle-correlation calculations**
   - Line 75: Claims R-squared = 0.5 corresponds to 60° angle
   - Actual: If R-squared = 0.5, then R ≈ 0.707, angle ≈ 45°
   - If angle = 60°, then R = 0.5, R-squared = 0.25

3. **Variance explanation contradiction**
   - Line 75: Claims both 60° angle AND 50% variance explained
   - These are mutually exclusive: 60° angle means 25% variance, not 50%

## Logical Contradictions (6 contradictions)

1. **Trade-off hypothesis contradiction** (Lines 15-17)
   - First suggests hidden trade-offs are common
   - Then dismisses this as implausible without clear reasoning

2. **Independence assumption flaw** (Lines 56-59)
   - Model assumes intelligence and conscientiousness are independent
   - In reality, these traits often correlate
   - Undermines the toy model's applicability

3. **Sample size confusion** (Lines 47, 91-93)
   - Claims tighter correlations need larger samples to see divergence
   - Then shows Old Faithful (tight correlation) as converging to a point
   - Self-contradictory example

4. **Practical relevance contradiction** (Lines 81-83)
   - Claims findings have "limited practical relevance"
   - Immediately suggests changing funding allocation strategies
   - Can't be both irrelevant and action-guiding

## Citation and Reference Errors (15 issues)

1. **Broken/malformed links**
   - Line 7: Wikipedia URL uses commas instead of underscores
   - Line 57: Links to comment sections rather than sources

2. **Non-academic sources for scientific claims**
   - Uses blog posts for IQ-income correlation claims
   - Cites high-IQ society websites for mental health statistics
   - No peer-reviewed sources for core statistical concepts

3. **Outdated references**
   - Most citations from 2008-2014 (10-16 years old)
   - Medical claim based on single 2001 BMJ article
   - Pre-2020 sources for evolving fields

4. **Missing attributions**
   - Multiple images "grabbed off google" without credits
   - No verification of data accuracy in borrowed graphs
   - Copyright violations

5. **Lack of statistical sources**
   - Makes numerous mathematical claims without citing statistics textbooks
   - Geometric interpretation lacks proper mathematical references
   - No authoritative sources for R-squared/correlation relationships

## Most Critical Issues

The three most serious problems that undermine the article's credibility:

1. **Fundamental mathematical error**: Confusing R and R-squared throughout, leading to incorrect calculations and interpretations

2. **Self-contradictory examples**: Using Old Faithful to support a claim it actually refutes about sample sizes and correlation

3. **Academic integrity**: Using unattributed images and non-peer-reviewed sources for scientific claims

## Conclusion

The article contains 21 documented errors across mathematical concepts, logical reasoning, and academic citation standards. The persistent confusion between correlation coefficient (R) and coefficient of determination (R-squared) represents a fundamental misunderstanding that pervades the entire analysis. Combined with poor citation practices and logical contradictions, these errors significantly undermine the article's arguments and conclusions.