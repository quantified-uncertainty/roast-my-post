# Epistemic Critic - Unique Value Proposition

## What Other Plugins Already Do (AVOID DUPLICATION)

### Fact Check Plugin
- Verifies specific factual claims
- Checks if statements are true/false
- Uses research to confirm/refute claims
- Example: "The population is 8 billion" → Verify this number

### Math Plugin
- Verifies calculations
- Checks mathematical equations
- Validates numerical reasoning
- Example: "2+2=5" → Flag as incorrect

### Forecast Plugin
- Evaluates predictions
- Checks forecasting methodology
- Assesses prediction quality
- Example: "90% chance of rain" → Evaluate forecast

### Spelling/Grammar Plugin
- Language errors
- Grammar mistakes
- Writing quality

## What Epistemic Critic SHOULD Focus On (UNIQUE VALUE)

### 1. 🎯 Argumentation Structure & Logic
**Not just "is it true?" but "is the reasoning sound?"**

Examples:
- **False dichotomy**: "Either we adopt this policy or the economy collapses"
- **Circular reasoning**: Using the conclusion as a premise
- **Non sequitur**: Conclusion doesn't follow from premises
- **Begging the question**: Assuming what needs to be proven
- **Hasty generalization**: Drawing broad conclusions from limited evidence

### 2. 📊 Statistical Reasoning Quality
**Beyond checking if numbers are right - is the statistical thinking sound?**

Examples:
- **Base rate neglect**: Ignoring prior probabilities
- **Simpson's paradox**: Trend reverses when data is aggregated
- **Regression to mean**: Mistaking natural variation for causation
- **Survivorship bias**: Only examining successful cases
- **Selection bias**: Non-random sample treated as representative
- **P-hacking**: Cherry-picking significant results
- **Ecological fallacy**: Applying group statistics to individuals

### 3. 🎭 Framing & Rhetorical Manipulation
**How is information presented to manipulate perception?**

Examples:
- **Anchoring**: Providing reference points to skew judgment
- **Loss framing vs gain framing**: Same info, different emotional impact
- **Absolute vs relative risk**: "50% increase" sounds worse than "from 2% to 3%"
- **Denominator neglect**: "10 deaths" vs "10 deaths out of 1 million"
- **Availability cascade**: Repeating claims to make them seem true
- **Loaded language**: Emotionally charged words masking weak arguments

### 4. 🧠 Confidence Calibration & Epistemic Humility
**Is uncertainty appropriately communicated?**

Examples:
- **Overconfidence**: Claiming certainty where evidence is weak
- **False precision**: "Exactly 47.3%" when methodology supports only rough estimates
- **Ignoring error bars**: Point estimates without ranges
- **Conflating correlation with causation**
- **Treating models as reality**: "The model says X" → "X is true"
- **Motte and bailey**: Defending weak claim by retreating to strong one

### 5. 🔍 Missing Crucial Context
**What's being left out that changes everything?**

Examples:
- **Cherry-picked time periods**: "Stock up 50% this year" (after 80% drop last year)
- **Missing comparison group**: "Our treatment worked" (vs what?)
- **Undisclosed conflicts of interest**: Study funded by interested party
- **Selective citation**: Only citing supporting studies
- **Missing counterfactuals**: What would have happened anyway?
- **Ignoring opportunity costs**: Costs not just money spent

### 6. 🎪 Rhetorical Tricks & Manipulation
**Sophistry and argumentative sleight of hand**

Examples:
- **Gish gallop**: Overwhelming with many weak arguments
- **Motte and bailey**: Conflating modest and extreme claims
- **Equivocation**: Using same word with different meanings
- **Appeal to nature**: "Natural therefore good"
- **Nirvana fallacy**: Comparing with impossible ideal
- **Moving goalposts**: Changing criteria when challenged

### 7. 🏛️ Steelmanning & Good Faith Engagement
**Are opposing views represented fairly?**

Examples:
- **Strawman**: Misrepresenting opposing arguments
- **Missing steelman**: Not addressing strongest counterarguments
- **False balance**: Treating unequal evidence equally
- **Tone policing**: Dismissing arguments due to tone
- **Ad hominem by proxy**: Dismissing ideas by association

### 8. 📐 Proportionality & Scope Sensitivity
**Is the response proportional to the claim?**

Examples:
- **Scope insensitivity**: Same response to "save 2,000 birds" vs "save 200,000 birds"
- **Catastrophizing**: Minor issues treated as existential
- **Minimizing**: Serious issues dismissed as trivial
- **Inconsistent standards**: Strict scrutiny for opponents, lax for allies

## Revised Focus Areas

### ❌ STOP Flagging (Other plugins handle this):
- Basic fact verification ("Water freezes at 0°C") → Fact Check handles
- Simple math errors ("2+2=5") → Math plugin handles
- Specific predictions ("80% chance") → Forecast plugin handles
- Grammar/spelling → Spelling plugin handles

### ✅ START Flagging (Unique epistemic value):
- **Sophisticated logical fallacies** (not just "appeal to authority")
- **Statistical reasoning errors** (base rate neglect, Simpson's paradox)
- **Framing effects** that mislead without lying
- **Overclaiming** (certainty where evidence is weak)
- **Missing crucial context** that changes interpretation
- **Rhetorical manipulation** (motte-bailey, equivocation)
- **Bad faith argumentation** (strawmanning, moving goalposts)
- **Proportionality issues** (response doesn't match claim)

## Examples of GOOD Epistemic Critic Catches

### Example 1: Base Rate Neglect
```
Text: "90% of successful entrepreneurs dropped out of college. Therefore,
dropping out increases your chances of success."

Issue: Base rate neglect + survivor bias
- Ignores: What % of dropouts become successful? (tiny)
- Only looks at: What % of successful people dropped out? (irrelevant)
- Missing: P(success|dropout) vs P(success|graduate)
```

### Example 2: Framing Effect
```
Text: "This policy will save 200 lives per year."

Issue: Absolute numbers without context
- Population size? (200 out of 300M vs 200 out of 100K very different)
- Compared to what? (Status quo? Alternative policies?)
- What's the cost per life saved?
- Are these actual lives or statistical lives?
```

### Example 3: Motte and Bailey
```
Text: "We need to teach critical race theory in schools."
[challenged]
Text: "Are you saying we shouldn't teach about racism in history?"

Issue: Motte-bailey fallacy
- Bailey (controversial): Specific pedagogical framework (CRT)
- Motte (defensible): Teaching history of racism
- Conflates the two when challenged
```

### Example 4: Misleading Statistical Framing
```
Text: "Risk increased by 50%! This is a massive health crisis!"

Issue: Relative vs absolute risk
- Missing: 50% increase from what baseline?
- If baseline is 0.01%, increase to 0.015% is trivial
- Sensationalist framing of small absolute change
```

### Example 5: False Dichotomy + Catastrophizing
```
Text: "Either we implement this regulation immediately, or we face
environmental catastrophe within a decade."

Issues:
- False dichotomy: Presents only two options
- Catastrophizing: Extreme predicted outcome
- Missing: Other policy options, gradual approaches, cost-benefit
```

## Implementation Strategy

1. **Update extraction prompt** to focus on these sophisticated issues
2. **Provide examples** of each fallacy type in prompt
3. **Deprioritize simple fact-checking** (let fact-check plugin handle)
4. **Focus on reasoning quality** not truth value
5. **Look for patterns** of manipulation across document
6. **Consider document purpose** (persuasive writing needs more scrutiny)

## Success Metrics

- Catches sophisticated fallacies other plugins miss
- Provides unique value beyond basic fact-checking
- Focuses on "how" information is presented, not just "what"
- Helps readers develop better epistemic hygiene
- Minimal overlap with other plugin domains
