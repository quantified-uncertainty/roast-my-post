# Quick Wins - High Impact, Lower Effort Improvements

## Priority: Implement These First

### 1. Expand Fallacy Detection (1-2 days)

**Current:** 5-6 main fallacy types
**Target:** 15-20 fallacy types

**Add to prompt:**

```typescript
const EXPANDED_FALLACIES = `
**Additional Fallacies to Detect:**

7. **Scope Insensitivity**
   - Example: "Save 2,000 birds!" (vs 200,000 - same response = scope insensitivity)
   - Look for: Numbers without context, emotional appeal ignoring magnitude

8. **Confounding Variables**
   - Example: "Ice cream causes drowning" (both caused by summer)
   - Look for: X correlates with Y → X causes Y (without controlling for confounders)

9. **Reverse Causation**
   - Example: "Successful people wake early → waking early causes success"
   - Look for: Could causation go the other way?

10. **Appeal to Nature**
    - Example: "It's natural, so it must be safe" (arsenic is natural!)
    - Look for: "Natural", "organic", "chemical-free" as justification

11. **Anecdotal Evidence**
    - Example: "My uncle smoked and lived to 90, so smoking is fine"
    - Look for: Personal stories treated as data

12. **False Equivalence**
    - Example: "Both sides exaggerate" (when one side objectively worse)
    - Look for: "Both sides" when magnitude differs greatly

13. **Whataboutism**
    - Example: "What about when you did X?" (deflecting criticism)
    - Look for: "What about", "but you also" in response to criticism

14. **Moving Goalposts**
    - Example: Changing success criteria when challenged
    - Look for: Shifting definitions or thresholds

15. **Hindsight Bias**
    - Example: "It was obvious this would happen" (after the fact)
    - Look for: Claims of predictability after outcome known
`;
```

**Effort:** Low - Just expand the system prompt
**Impact:** High - Catch more issues immediately

---

### 2. Confidence Scores (0.5 days)

**Add confidence to each issue:**

```typescript
interface ExtractedEpistemicIssue {
  // ... existing fields
  confidence: number; // 0-100: How sure we are this IS the fallacy
  confidenceReasoning: string;
}
```

**In prompt:**
```
For each issue, also provide:
- **Confidence** (0-100): How sure are you this is the fallacy?
  - 90-100: Textbook example, multiple clear markers
  - 70-89: Strong indicators, likely the fallacy
  - 50-69: Moderate confidence, could be innocent
  - 30-49: Weak confidence, borderline case
  - 0-29: Very uncertain, might be wrong
```

**Benefits:**
- Users know which issues to trust
- Can filter by confidence threshold
- Helps identify areas for improvement

**Effort:** Low - Add to schema and prompt
**Impact:** Medium-High - Better user trust

---

### 3. Related Issue Grouping (1 day)

**Group related issues together:**

```typescript
interface IssueGroup {
  pattern: 'survivorship-bias-pattern' | 'cherry-picking-pattern' | 'bias-pattern';
  issues: EpistemicIssue[];
  overallSeverity: number;
  groupDescription: string;
}

// Example grouping
const groups = {
  'survivorship-bias-pattern': [
    issue1, // "90% of millionaires"
    issue5, // "95% of users satisfied"
    issue9  // "Typical user achieved 5x"
  ],
  overallSeverity: 90, // Higher because it's a pattern
  groupDescription: 'Document systematically excludes negative outcomes across multiple claims'
};
```

**Display:**
```markdown
## ⚠️ Pattern Detected: Systematic Survivorship Bias

Found 3 instances of survivorship bias in this document:
1. Line 17: "90% of millionaires used strategy"
2. Line 45: "95% of users satisfied"
3. Line 68: "Typical user achieved 5x returns"

**Why this matters:**
Finding the same fallacy multiple times suggests intentional manipulation rather than innocent error.

**Combined Severity:** 90/100 (higher than individual issues)
```

**Effort:** Low-Medium - Post-processing step
**Impact:** High - Shows systematic issues

---

### 4. Suspicious Number Detection (1 day)

**Flag numbers that are "too good to be true":**

```typescript
class SuspiciousNumberDetector {
  check(number: number, context: string): SuspiciousNumberAnalysis {
    const flags: string[] = [];

    // Too close to 100%
    if (number >= 98 && number <= 100) {
      flags.push('Suspiciously high (98-100%)');
    }

    // Too close to 100
    if (number >= 99 && number <= 101 && !context.includes('temperature')) {
      flags.push('Suspiciously close to 100');
    }

    // False precision
    if (this.hasFalsePrecision(number, context)) {
      flags.push(`False precision (${number} suggests unwarranted exactness)`);
    }

    // Too round for the context
    if (this.suspiciouslyRound(number, context)) {
      flags.push('Suspiciously round number');
    }

    return {
      suspicious: flags.length > 0,
      flags,
      recommendation: this.getRecommendation(flags)
    };
  }

  private hasFalsePrecision(num: number, context: string): boolean {
    // 47.3% in "internal study" = suspicious precision
    const decimalPlaces = (num.toString().split('.')[1] || '').length;

    if (decimalPlaces >= 2 && context.includes('internal study')) {
      return true; // Claiming more precision than methodology warrants
    }

    if (decimalPlaces >= 1 && context.includes('approximately')) {
      return true; // "Approximately 47.3%" is contradictory
    }

    return false;
  }

  private suspiciouslyRound(num: number, context: string): boolean {
    // Perfect multiples in contexts where they shouldn't be
    const suspiciousRoundness = [
      num === 50 && context.includes('exactly'),
      num % 10 === 0 && num >= 90 && context.includes('success rate'),
      num === 100 && !context.includes('percent') // 100 of something
    ];

    return suspiciousRoundness.some(s => s);
  }
}
```

**Effort:** Low-Medium
**Impact:** Medium - Catches manipulation tactics

---

### 5. Temporal Analysis (Cherry-picked Timeframes) (1 day)

**Automatically flag suspicious dates:**

```typescript
const SUSPICIOUS_START_DATES = {
  '2020-03': 'COVID market bottom - everything grew from here',
  '2009-03': 'Financial crisis bottom',
  '2000-03': 'Dot-com bubble burst',
  '2008-10': 'Financial crisis low'
};

class TemporalAnalyzer {
  analyzeTimeframe(startDate: Date, endDate: Date, context: 'market' | 'business'): Analysis {
    const startKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;

    if (SUSPICIOUS_START_DATES[startKey]) {
      return {
        suspicious: true,
        reason: SUSPICIOUS_START_DATES[startKey],
        severity: 80,
        recommendation: `Show performance from multiple start dates, including before ${startKey}`
      };
    }

    // Check if timeframe is suspiciously short
    const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    if (duration < 2 && context === 'market') {
      return {
        suspicious: true,
        reason: 'Timeframe too short for market performance (<2 years)',
        severity: 60,
        recommendation: 'Show at least 5-10 year performance for market claims'
      };
    }

    return { suspicious: false };
  }
}
```

**Effort:** Low
**Impact:** High - Catches very common manipulation

---

### 6. Issue Deduplication Improvements (0.5 days)

**Current:** Basic text similarity
**Better:** Semantic similarity

```typescript
class ImprovedDeduplicator {
  deduplicate(issues: EpistemicIssue[]): EpistemicIssue[] {
    const clusters = this.clusterSimilarIssues(issues);

    return clusters.map(cluster => {
      if (cluster.length === 1) return cluster[0];

      // Multiple similar issues - combine them
      return this.combineIssues(cluster);
    });
  }

  private combineIssues(issues: EpistemicIssue[]): EpistemicIssue {
    return {
      ...issues[0], // Base issue
      exactText: issues.map(i => i.exactText).join(' ... '), // Combine text
      reasoning: `Found ${issues.length} instances of this pattern:\n` +
                 issues.map((i, idx) => `${idx + 1}. ${i.exactText.substring(0, 100)}...`).join('\n'),
      severityScore: Math.min(100, issues[0].severityScore + (issues.length - 1) * 5), // Boost for pattern
      importanceScore: Math.max(...issues.map(i => i.importanceScore))
    };
  }
}
```

**Effort:** Low
**Impact:** Medium - Cleaner output, shows patterns

---

### 7. Before/After Examples in Comments (0.5 days)

**Add improvement suggestions:**

```typescript
interface CommentImprovement {
  original: string;
  improved: string;
  whyBetter: string;
}

function generateImprovement(issue: EpistemicIssue): CommentImprovement | null {
  if (issue.issueType === 'survivorship-bias') {
    return {
      original: issue.exactText,
      improved: improveText(issue.exactText),
      whyBetter: 'Provides denominator, clarifies actual success rate, doesn\'t hide failures'
    };
  }

  // ... other issue types
}

function improveText(text: string): string {
  // "90% of millionaires used our strategy"
  if (/\d+%.*millionaires.*strategy/i.test(text)) {
    return 'Of 10,000 clients who used our strategy over 5 years, 900 (9%) became millionaires. ' +
           'For comparison, the general population millionaire rate is approximately 3%.';
  }

  // Add more patterns...
}
```

**Comment format:**
```markdown
**Issue:** Survivorship Bias

**Current text:**
"90% of millionaires who used our strategy achieved wealth"

**Better version:**
"Of 10,000 clients over 5 years, 900 (9%) became millionaires"

**Why better:**
- Provides total users (denominator)
- Clear success rate (9%, not misleading 90%)
- Doesn't hide the 9,100 who didn't become millionaires
```

**Effort:** Medium
**Impact:** High - Very actionable feedback

---

### 8. Document-Level Summary Stats (0.5 days)

**Add overall assessment:**

```typescript
interface DocumentEpistemicHealth {
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';

  breakdown: {
    totalIssues: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };

  patterns: {
    systematicBias: boolean;
    multipleRedFlags: boolean;
    intentionalManipulation: 'likely' | 'possible' | 'unlikely';
  };

  comparisons: {
    similarTo: string[]; // "Investment scams", "Quality journalism", etc.
    notSimilarTo: string[];
  };

  recommendation: string;
}
```

**Display:**
```markdown
## 📊 Epistemic Health Score: 35/100 (F)

**Breakdown:**
- 🚨 5 critical issues
- ⚠️ 6 high-severity issues
- 💡 4 medium issues

**Patterns Detected:**
- ✓ Systematic survivorship bias (3 instances)
- ✓ Cherry-picked timeframes
- ✓ Multiple red flags suggest intentional manipulation

**Similar to:**
- Investment scam marketing
- Multi-level marketing pitches

**Not similar to:**
- Academic research (would score 80-95)
- Quality journalism (would score 75-90)

**Overall Assessment:**
Document shows multiple sophisticated manipulation tactics. Strong recommendation to verify all claims independently before trusting any advice.
```

**Effort:** Low-Medium
**Impact:** High - Clear overall signal

---

### 9. Red Flag Dictionary in Comments (0.5 days)

**Add context for common patterns:**

```markdown
## Issue: Survivorship Bias

**What you found:** Only examines millionaires who used strategy, ignores all who tried and failed.

**🚩 Why this is a red flag:**
Survivorship bias is one of the most common tactics in:
- Investment scams (you'll see this in almost every scheme)
- Success gurus ("all successful people do X")
- Weight loss marketing ("average user lost 50 lbs")

**🎓 Learn more:**
- When you see "X% of successful people", immediately ask: "What % of people who tried succeeded?"
- Always ask: "Who are you NOT showing me?"

**🔍 Check:**
- [ ] Does the document provide total # who tried?
- [ ] Are failures mentioned anywhere?
- [ ] Is this part of a pattern? (Check other claims)
```

**Effort:** Low - Template in comment builder
**Impact:** Medium - Educational value

---

### 10. Issue Importance Boosting (0.5 days)

**Adjust importance based on context:**

```typescript
class ImportanceBooster {
  boost(issue: EpistemicIssue, documentContext: DocumentContext): EpistemicIssue {
    let boost = 0;

    // High stakes domains
    if (documentContext.domain === 'investment' || documentContext.domain === 'medical') {
      boost += 15;
    }

    // Central to document's main claim
    if (issue.affectsMainClaim) {
      boost += 20;
    }

    // Part of systematic pattern
    if (issue.partOfPattern && issue.patternCount >= 3) {
      boost += 15;
    }

    // Has regulatory implications
    if (issue.regulatoryViolation) {
      boost += 20;
    }

    return {
      ...issue,
      importanceScore: Math.min(100, issue.importanceScore + boost),
      boostReasoning: this.explainBoost(boost)
    };
  }
}
```

**Effort:** Low
**Impact:** Medium - Better prioritization

---

## Implementation Priority Matrix

```
Impact →     Low        Medium      High
Effort ↓
──────────────────────────────────────────
Low         #6         #2, #9, #10  #5
            Dedup      Confidence   Temporal
                       Red flags
                       Importance

Medium      -          #4, #7, #8   #1, #3
                       Numbers      Fallacies
                       Before/After Groups
                       Summary

High        -          -            -
```

## Recommended Implementation Order

### Week 1: Quick wins
1. ✅ Expand fallacy detection (#1) - 2 days
2. ✅ Cherry-picked timeframe detection (#5) - 1 day
3. ✅ Confidence scores (#2) - 0.5 days
4. ✅ Red flag dictionary (#9) - 0.5 days

**Result:** Catch more issues, with confidence levels, temporal analysis, and better explanations

### Week 2: Quality improvements
5. ✅ Issue grouping (#3) - 1 day
6. ✅ Document summary stats (#8) - 0.5 days
7. ✅ Before/after examples (#7) - 1 day
8. ✅ Improved deduplication (#6) - 0.5 days

**Result:** Cleaner output, pattern detection, actionable feedback

### Week 3: Polish
9. ✅ Suspicious number detection (#4) - 1 day
10. ✅ Importance boosting (#10) - 0.5 days
11. Testing and refinement - remaining time

**Result:** Production-ready with sophisticated detection

---

## Testing Each Improvement

For each feature, test with:

```typescript
const TEST_CASES = {
  'expand-fallacies': {
    text: 'Ice cream sales cause drowning deaths',
    shouldDetect: 'confounding-variables'
  },

  'confidence-scores': {
    text: '90% of successful entrepreneurs are college dropouts',
    expectedConfidence: 95, // Very clear survivorship bias
  },

  'temporal-analysis': {
    text: 'Since starting in March 2020, we\'ve seen 500% growth',
    shouldFlag: true,
    reason: 'COVID market bottom'
  },

  'suspicious-numbers': {
    text: 'Our internal study of 1,000 users showed exactly 47.3% returns',
    shouldFlag: 'false-precision'
  },

  // etc.
};
```

---

## Success Metrics

Track improvements:

```typescript
interface PerformanceMetrics {
  before: {
    averageIssuesPerDocument: 10,
    userSatisfaction: 0.75,
    falsePositiveRate: 0.15
  },

  after: {
    averageIssuesPerDocument: 15, // More comprehensive
    userSatisfaction: 0.85, // Better explanations
    falsePositiveRate: 0.10 // Better confidence filtering
  }
}
```

**Target improvements:**
- 50% more issues detected (from new fallacies)
- 25% fewer false positives (from confidence scores)
- 30% higher user satisfaction (from better explanations)
