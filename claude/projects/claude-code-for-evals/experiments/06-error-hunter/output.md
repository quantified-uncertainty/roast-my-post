# Error Hunting Report: Why the tails come apart

## Summary
- Total specific errors found: 28
- Most serious issues: 
  1. Pervasive mathematical confusion between R and R-squared throughout the article
  2. Incorrect geometric interpretation claiming R-squared = 0.5 corresponds to 60° angle
  3. Poor citation quality with blogs, broken links, and missing attributions

## Specific Errors by Category

### Typos and Grammar
1. **Line 99**: "by R-squared" should be "multiply by R-squared" (missing word "multiply")

### Numerical Errors
1. **Line 27**: Claims "R-square is > 0.8" for scatter plot, likely means R > 0.8 (not R-squared)
2. **Line 75**: States "R-square of 0.5 (corresponding to an angle of sixty degrees)" - wrong angle. If R-squared = 0.5, then R = 0.707 and angle = 45°, not 60°
3. **Line 75**: Claims R-squared = 0.5 accounts for "half the variance" while also claiming 60° angle, but 60° gives R = 0.5 and R-squared = 0.25 (only 25% variance)

### Mathematical Mistakes
1. **Line 71**: "The R-square measure of correlation... is the same as the cosine of the angle" - Incorrect. R (not R-squared) equals the cosine
2. **Line 75**: "the inverse cosine equal the R-squared" - Should be "inverse cosine equals R"
3. **Line 99**: Claims to "multiply by R-squared to move between z-scores" - Should multiply by R, not R-squared
4. **General**: Confuses R and R-squared throughout, creating cascading mathematical errors

### Logical Contradictions
1. **Lines 15-17**: First suggests "hidden trade-offs" are common, then immediately dismisses this as "weird" without clear reasoning
2. **Lines 56-59**: Assumes intelligence and conscientiousness are independent in toy model, contradicting real-world correlations
3. **Lines 47, 91-93**: Claims tighter correlations need larger samples for tail divergence, then shows Old Faithful (tight correlation) as having clear pattern
4. **Lines 81-83**: Claims findings have "limited practical relevance" then immediately suggests changing charity funding strategies
5. **Line 75**: Simultaneously claims R-squared = 0.5 means both 60° angle and 50% variance explained (mathematically impossible)

### Unverified Claims
1. **Line 7**: NBA average height claim with broken Wikipedia link
2. **Line 7**: IQ-income correlation cited from 2008 sociology blog, not peer-reviewed source
3. **Line 7**: IQ-imprisonment link goes to textbook supplement, not primary research
4. **Line 7**: IQ-lifespan claim based on single 2001 BMJ article
5. **Line 9**: High earners' intelligence cited from 2009 personal blog
6. **Line 15**: Mental illness rates in high-IQ individuals cited from Prometheus Society website

### Other Issues
1. **Multiple images**: "grabbed off google" without attribution or source verification
2. **Line 71**: Self-referential LessWrong links instead of authoritative sources
3. **General**: No statistics textbooks or peer-reviewed math sources for mathematical claims
4. **Citations**: Mix of broken links, outdated sources (2008-2014), and non-academic references
5. **Line 93**: Old Faithful data image used without context or verification
6. **Copyright**: Potential violations from unattributed images

## Recommendations
1. **Replace all instances of "R-squared" with "R"** where discussing correlation coefficients and angles (lines 27, 71, 75, 99)
2. **Fix the 60° example**: Either use R = 0.5 (60° angle, 25% variance) OR R = 0.707 (45° angle, 50% variance), not both
3. **Add proper academic citations**: Replace blog posts and society websites with peer-reviewed sources
4. **Attribute all images** with sources and verify data accuracy
5. **Clarify the mathematical relationship**: State clearly that R = cos(θ) and R² = proportion of variance explained
6. **Fix broken Wikipedia link** for NBA height data
7. **Add publication dates** to all citations for transparency about age of claims