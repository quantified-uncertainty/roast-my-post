# Advanced Fallacy Detection - Deep Dive

## Quantitative Reasoning Fallacies (Beyond Basic Stats)

### Scope Insensitivity / Scale Neglect
**What it is:** People assign similar value/concern to problems regardless of magnitude

**Examples:**
```
- "Would you donate $50 to save 2,000 birds? 200,000 birds?"
  → Most people give same answer despite 100x difference

- "We saved 100 lives with this policy!"
  → 100 out of how many? 100M population vs 1K population is very different

- "This kills 40,000 people per year"
  → Sounds bad, but context: what's the population? What's the rate?
```

**Detection strategy:**
- Look for numbers presented without denominators
- Check if emotional response being primed without proportionality
- Flag when large/small numbers used without context of scale

**Severity:** High - leads to catastrophically bad prioritization decisions

---

### Simpson's Paradox
**What it is:** Trend appears in subgroups but reverses when groups combined

**Real example:**
```
Treatment X success rate:
- Hospital A: 90% success (treated severe cases)
- Hospital B: 80% success (treated mild cases)
- Combined: Treatment X worse than Treatment Y

But within each hospital, X > Y. This is Simpson's Paradox.
```

**Detection strategy:**
- Look for aggregated statistics that might hide subgroup differences
- Flag claims about "overall" performance without stratification
- Check if comparing groups that differ on confounders

**Severity:** Very high - fundamental to causal reasoning

---

### The Hot Hand Fallacy (and its reverse)
**What it is:** Seeing patterns in randomness OR denying patterns that exist

**Examples:**
```
"I'm on a streak!" - Gambler's fallacy, seeing pattern in random outcomes
"Past performance doesn't predict future" - Sometimes it does! (skill-based domains)
```

**Detection strategy:**
- Flag extreme confidence about streaks in random domains (gambling, short-term stocks)
- Also flag blanket dismissal of predictive value in skill-based domains (sports, investing)
- Context matters: Coin flips vs skilled performance

---

### Berkson's Paradox (Collider Bias)
**What it is:** Negative correlation in selected sample when none exists in population

**Classic example:**
```
"Talented people are jerks" - But you only meet talented people who got jobs despite being jerks
In full population: No correlation between talent and jerkiness
In hired population: Negative correlation (being a jerk is obstacle, so hired jerks must be extra talented)
```

**Medical example:**
```
Hospital study shows: "Disease A protects against Disease B"
Reality: Both diseases cause hospitalization. In hospital sample, having A means less likely to have B (because diagnosis already explains hospitalization)
```

**Detection strategy:**
- Look for correlations found in selected/filtered samples
- Check if conclusions drawn from "convenient" populations (hospital studies, college students)
- Flag when selection process could create spurious correlations

---

### Prosecutor's Fallacy
**What it is:** Confusing P(evidence|innocent) with P(innocent|evidence)

**Classic example:**
```
"DNA match is 1 in 1 million. Therefore 99.9999% chance defendant is guilty."

Wrong! Need base rate:
- If testing 10 million people, expect 10 matches even if all innocent
- True probability depends on prior probability and population size
```

**Detection strategy:**
- Look for conditional probabilities being reversed
- Flag when someone says "X% match" or "Y% accuracy" without considering base rates
- Check if Bayes theorem being ignored

---

### Duration Neglect / Peak-End Rule
**What it is:** Judging experiences by peak intensity and ending, ignoring duration

**Examples:**
```
"Vacation A: 7 amazing days
 Vacation B: 7 amazing days + 2 mediocre days"

People rate Vacation A better even though B is strictly superior (same good + more days)
Reason: B ends on a down note
```

**Detection strategy:**
- Look for comparisons that emphasize peak moments or endings
- Check if duration of positive/negative experiences being ignored
- Flag cherry-picked "highlight reel" style arguments

---

### Reference Class Forecasting Neglect
**What it is:** Ignoring base rate of similar projects/claims when making predictions

**Example:**
```
"Our startup will revolutionize transportation!"

Reference class: Transportation startups
Base rate: 90% fail within 5 years

Should temper confidence with: "Like most transportation startups, we'll probably fail, but here's why we might be different..."
```

**Detection strategy:**
- Look for confident predictions without reference to similar cases
- Flag claims of exceptionalism without evidence
- Check if base rates mentioned when discussing "this time is different"

---

### Ludic Fallacy
**What it is:** Treating real-world uncertainty like casino/dice (known probabilities)

**Example:**
```
"The model predicts 2.3% chance of crisis"
→ Implies precision and known probability distribution
→ Reality: Unknown unknowns, fat tails, model uncertainty

Better: "Models like ours historically miss major crises ~40% of the time"
```

**Detection strategy:**
- Flag false precision in probability estimates for unprecedented events
- Look for overconfidence in models without acknowledging model uncertainty
- Check if treating uncertainty as risk (known probabilities vs unknown)

---

## Causal Reasoning Fallacies (Advanced)

### Confounding Bias
**What it is:** Third variable causes both X and Y, but claim X causes Y

**Example:**
```
"Ice cream sales cause drowning deaths" (both caused by summer heat)
"Cities with more fire trucks have more fires" (both caused by city size)
```

**Detection strategy:**
- Look for correlational claims presented as causal
- Check if obvious confounders discussed
- Flag X → Y claims without "controlling for" language

---

### Reverse Causation
**What it is:** Getting direction of causation backwards

**Example:**
```
"Successful people wake up early, therefore waking early causes success"
Could be: Success → flexible schedule → can wake early

"Depressed people take antidepressants, antidepressants cause depression"
Obvious reverse causation
```

**Detection strategy:**
- Look for X correlates with Y, claim X causes Y, but reverse equally plausible
- Check if temporal ordering established
- Flag advice based on correlation without causal evidence

---

### Mediation vs Confounding Confusion (Table 2 Fallacy)
**What it is:** Controlling for mediators when estimating total effect

**Example:**
```
"Does education cause higher income?"

Path: Education → Skills → Income

Bad analysis: "Control for skills"
→ Blocks the main causal path!
→ Finds small effect and concludes education doesn't matter

Correct: Don't control for mediators when estimating total effect
```

**Detection strategy:**
- Look for studies "controlling for" things that are on the causal path
- Flag analyses that control for outcomes/mediators
- Check if distinguishing confounders from mediators

---

### Collider Bias
**What it is:** Conditioning on effect of both X and Y creates spurious correlation

**Example:**
```
Study: "Among hospitalized patients, obesity protects against mortality"

Why wrong: Hospitalization is collider (caused by both obesity complications AND other severe illnesses)
In hospital: If obese, less likely to have other severe illness (explains admission)
In hospital sample: Appears obesity is protective
In full population: Obesity increases mortality
```

**Detection strategy:**
- Look for surprising correlations in selected samples
- Check if selection variable is caused by both variables being studied
- Flag conclusions from convenience samples without discussing collider bias

---

## Temporal Reasoning Fallacies

### Hindsight Bias
**What it is:** "I knew it all along" - outcome seems obvious after the fact

**Example:**
```
After 2008 crash: "Obviously housing prices couldn't keep rising forever"
→ But very few predicted it before
→ Outcome seems inevitable in retrospect

After startup success: "Obviously Airbnb would succeed"
→ Ignores how sketchy it seemed at the time
```

**Detection strategy:**
- Look for claims that something was "obvious" or "predictable" after the fact
- Check if author predicted it beforehand or just explaining after
- Flag "of course" language about past events

---

### Presentism
**What it is:** Judging past decisions by present knowledge/values

**Example:**
```
"They were idiots for not seeing the housing bubble!"
→ Ignores information available at the time
→ Easy to criticize with outcome knowledge

"Historical figure was wrong about X"
→ Judging by modern standards/knowledge unfair
```

**Detection strategy:**
- Look for harsh judgment of past decisions
- Check if accounting for information/norms at the time
- Flag anachronistic application of modern knowledge

---

### Time Discounting Errors
**What it is:** Hyperbolic vs exponential discounting, present bias

**Example:**
```
"Would you rather $100 today or $110 tomorrow?" → Many pick today
"Would you rather $100 in year or $110 in year+1day?" → Most pick $110

Inconsistent time preferences reveal present bias
```

**Detection strategy:**
- Look for inconsistent attitudes toward near vs far future
- Flag arguments exploiting present bias
- Check if urging immediate action without justified urgency

---

## Information Theory / Belief Updating Fallacies

### Confirmation Bias (Beyond Basic)
**What it is:** Not just seeking confirming evidence, but asymmetric standards

**Examples:**
```
Belief I like: Accept weak evidence
Belief I dislike: Demand impossible standards

Study supports my view: "This proves it"
Study contradicts my view: "This study is flawed because..."
```

**Detection strategy:**
- Look for asymmetric skepticism
- Check if author dismisses contradicting evidence with excuses
- Flag if accepting favorable evidence uncritically

---

### Conservatism Bias
**What it is:** Insufficient updating on new evidence

**Example:**
```
Prior belief: 50% chance of rain
See dark clouds (strong evidence): Update to only 55%

Should update much more dramatically given strength of evidence
```

**Detection strategy:**
- Look for minimal belief changes despite strong evidence
- Check if author acknowledges evidence but doesn't change conclusion
- Flag "interesting point, but I still think..." patterns

---

### Base Rate Neglect
**What it is:** Ignoring prior probabilities

**Example:**
```
"Test is 99% accurate. You tested positive. 99% chance you have disease."

Wrong if disease is rare! If 1 in 10,000 has disease:
- 10,000 people tested
- 1 true positive (has disease, tests positive)
- 100 false positives (don't have disease, test positive)
- Actual probability: 1/101 ≈ 1%
```

**Detection strategy:**
- Look for probability judgments without mentioning base rates
- Flag "accuracy" claims without prior probability context
- Check if using conditional probabilities correctly

---

## Comparative Fallacies

### False Equivalence
**What it is:** "Both sides" when one is clearly worse

**Example:**
```
"Politician A told 500 documented lies, Politician B told 3"
Media: "Both candidates have issues with honesty"

True, but wildly misleading equivalence
```

**Detection strategy:**
- Look for "both sides" framing with vastly different magnitudes
- Check if differences in degree treated as differences in kind
- Flag artificial balance

---

### Whataboutism / Tu Quoque
**What it is:** Deflecting criticism by pointing to others

**Example:**
```
Critic: "Your company pollutes"
Response: "What about Company X? They pollute too!"

Doesn't address whether the criticism is valid
```

**Detection strategy:**
- Look for "what about" patterns in response to criticism
- Check if original criticism being addressed
- Flag deflection tactics

---

### Relative Privation
**What it is:** "Others have it worse" to dismiss concerns

**Example:**
```
"Why worry about local poverty? People in Country X have it much worse!"
"Why complain about your problems? Cancer patients have real problems!"
```

**Detection strategy:**
- Look for "first world problems" style dismissals
- Check if using suffering elsewhere to invalidate local concerns
- Flag zero-sum framing of attention/concern

---

## Implementation Notes

### Priority Order
1. **Survivorship bias** - Currently detect, but could enhance
2. **Simpson's paradox** - Not currently detecting
3. **Base rate neglect** - Mentioned in prompt, could detect better
4. **Confounding** - Critical for causal claims
5. **Reverse causation** - Easy to detect, high impact

### Technical Approach
```typescript
interface AdvancedFallacyDetector {
  // Pattern matching
  detectByLinguisticMarkers(): FallacyCandidate[];

  // Statistical analysis
  detectSuspiciousNumbers(): QuantitativeIssue[];

  // Structural analysis
  detectArgumentStructure(): LogicalIssue[];

  // Contextual analysis
  detectByDocumentType(): ContextualIssue[];
}
```

### Testing Strategy
- Create test corpus with clear examples of each
- Measure precision/recall per fallacy type
- Start with easiest to detect, expand coverage
- A/B test prompt variations for each fallacy type
