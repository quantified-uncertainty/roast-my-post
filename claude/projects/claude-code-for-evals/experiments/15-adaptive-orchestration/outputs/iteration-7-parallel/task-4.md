## Analysis: Missing Discussion of Alternative Correlation Measures

After thoroughly analyzing the document, I can confirm that **the document does not discuss alternative correlation measures** like Spearman or Kendall correlation that might behave differently in tails.

### Key Findings:

1. **Correlation measures used**: The document exclusively uses:
   - **R-squared** (lines 27, 39, 71, 75, 98, 99) - mentioned as the primary correlation measure
   - **Pearson correlation** (implied throughout, as R-squared is derived from Pearson's r)

2. **Missing alternative measures**:
   - **No mention of Spearman rank correlation** - which would be particularly relevant since it measures monotonic relationships and could behave differently for extreme values
   - **No mention of Kendall's tau** - another rank-based correlation measure
   - **No discussion of rank-based or non-parametric correlation methods**

3. **Relevant passages where alternative measures could enhance the analysis**:

   - **Line 87**: "Given income isn't normally distributed, using SDs might be misleading. But non-parametric ranking to get a similar picture..."
     - The author acknowledges non-normal distributions but doesn't discuss non-parametric correlation measures

   - **Lines 71-75**: The geometric explanation assumes linear correlation (Pearson)
     - Rank correlations might show different patterns in the tails

   - **Lines 23-37**: Multiple scatter plot examples
     - These visualizations assume linear relationships; rank correlations might reveal different tail behaviors

4. **Why this omission matters**:
   - Spearman and Kendall correlations are **rank-based** and less sensitive to extreme outliers
   - They might show **stronger preservation of correlation in the tails** compared to Pearson correlation
   - For non-normally distributed variables (like income, mentioned in line 87), rank correlations would be more appropriate
   - The entire "tails coming apart" phenomenon might be **partially an artifact of using Pearson correlation** on non-normal distributions

This is a significant gap in the analysis, as alternative correlation measures could provide different insights into tail behavior and potentially challenge or refine the main thesis.
