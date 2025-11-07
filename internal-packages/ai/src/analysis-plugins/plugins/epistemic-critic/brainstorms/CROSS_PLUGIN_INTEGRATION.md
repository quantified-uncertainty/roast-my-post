# Cross-Plugin Integration & Synthesis

## Philosophy
**Plugins should complement each other, not duplicate work**

## Current Plugin Landscape

### Existing Plugins & Their Domains

```typescript
const PLUGIN_DOMAINS = {
  'fact-check': {
    focus: 'Verifying specific factual claims',
    strengths: ['Perplexity research', 'Source verification', 'Truth value'],
    weaknesses: ['Doesn't analyze reasoning', 'Misses structural issues'],
    examples: [
      'Is the population of X really Y?',
      'Did this event happen on this date?',
      'Is this statistic accurate?'
    ]
  },

  'math': {
    focus: 'Mathematical correctness',
    strengths: ['Calculation verification', 'Formula checking'],
    weaknesses: ['Doesn't catch misleading true math', 'No context evaluation'],
    examples: [
      '2+2=5 → Wrong',
      'Compound interest formula',
      'Statistical calculations'
    ]
  },

  'forecast': {
    focus: 'Prediction quality',
    strengths: ['Calibration', 'Base rate usage', 'Forecast methodology'],
    weaknesses: ['Limited to explicit predictions'],
    examples: [
      '80% chance of rain',
      'Stock market predictions',
      'Election forecasts'
    ]
  },

  'spelling': {
    focus: 'Language correctness',
    strengths: ['Grammar', 'Spelling', 'Style'],
    weaknesses: ['Surface-level', 'Doesn't catch semantic issues'],
    examples: [
      'Typos',
      'Grammar errors',
      'Style improvements'
    ]
  },

  'epistemic-critic': {
    focus: 'Reasoning quality & argumentation',
    strengths: ['Fallacy detection', 'Structural analysis', 'Rhetorical manipulation'],
    weaknesses: ['Doesn\'t verify facts', 'Doesn\'t check math'],
    examples: [
      'Survivorship bias',
      'Cherry-picked timeframes',
      'False dichotomies',
      'Strawman arguments'
    ]
  }
};
```

## Integration Patterns

### Pattern 1: Handoff (Epistemic → Fact Check)

**Scenario:** Epistemic Critic finds reasoning issue that requires fact-checking

```typescript
interface EpistemicToFactCheckHandoff {
  triggeredBy: 'epistemic-critic';
  targetPlugin: 'fact-check';

  issue: {
    type: 'survivorship-bias' | 'cherry-picking' | 'vague-claim';
    location: TextLocation;
    originalClaim: string;

    // What needs to be fact-checked
    factualQuestion: string;
    researchQuery: string;
    expectedSourceTypes: string[];

    // Why this matters
    epistemicImplication: string;
    priority: 'critical' | 'high' | 'medium';
  };
}
```

**Example:**

```typescript
{
  triggeredBy: 'epistemic-critic',
  targetPlugin: 'fact-check',

  issue: {
    type: 'survivorship-bias',
    location: { startLine: 17, endLine: 18 },
    originalClaim: '90% of millionaires used our strategy',

    factualQuestion: 'What percentage of people who used this strategy became millionaires?',
    researchQuery: '[Company Name] client success rate SEC filings',
    expectedSourceTypes: ['SEC filings', 'independent audits', 'regulatory disclosures'],

    epistemicImplication: 'Claim only shows P(strategy|millionaire), need P(millionaire|strategy). If fact-check finds no denominator data, this confirms suspicious reasoning.',
    priority: 'high'
  }
}
```

### Pattern 2: Synthesis (Multiple Plugins → Combined Assessment)

**Scenario:** Multiple plugins analyze same claim, synthesize findings

```typescript
interface MultiPluginSynthesis {
  claim: string;
  location: TextLocation;

  findings: {
    'epistemic-critic': {
      issue: 'Selection bias - only surveys current users',
      severity: 85,
      reasoning: 'Excludes dissatisfied users who left'
    },

    'fact-check': {
      verified: false,
      finding: 'No independent verification found. Company has no SEC filings.',
      sources: []
    },

    'math': {
      calculationCorrect: true,
      note: 'Math is technically accurate (95% of current users satisfied)'
    }
  };

  synthesis: {
    overallAssessment: 'high-confidence-misleading',
    reasoning: 'Mathematically correct but epistemically flawed and unverifiable',
    combinedSeverity: 95, // Higher than any individual

    explanation: `
      This claim has three layers of problems:
      1. Selection bias (epistemic) - only asks people still using service
      2. Unverifiable (fact-check) - no independent confirmation
      3. Technically accurate math (math) - which makes it more deceptive

      The combination suggests intentional manipulation: using technically
      correct statistics in a maximally misleading way.
    `
  };
}
```

### Pattern 3: Division of Labor (Complementary Analysis)

**Scenario:** Clear boundaries, each plugin handles its domain

```typescript
// Document: "Water freezes at 0°C. Studies show 90% of millionaires wake early."

const PLUGIN_RESPONSIBILITIES = {
  'epistemic-critic': {
    claim1: null, // Basic fact, not epistemic issue
    claim2: 'Flag correlation vs causation, missing base rate'
  },

  'fact-check': {
    claim1: 'Verify temperature (correct with caveat about pressure)',
    claim2: 'Verify if the study exists and says this'
  },

  'math': {
    claim1: null, // No calculation to check
    claim2: null // Percentage is given, not calculated
  }
};
```

## Specific Integration Scenarios

### Scenario 1: Investment Claims

**Document:** "Our strategy returned 47.3% annually based on internal study of 1,000 users."

**Epistemic Critic:**
```typescript
{
  issues: [
    {
      type: 'selection-bias',
      text: 'internal study of 1,000 users',
      severity: 85,
      reasoning: 'Which 1,000? Current users? Excludes those who left?',
      handoffTo: 'fact-check',
      researchQuery: '[Company] SEC filing performance data'
    },
    {
      type: 'false-precision',
      text: '47.3% annually',
      severity: 70,
      reasoning: 'Excessive precision suggests hiding uncertainty'
    }
  ]
}
```

**Fact Check (receives handoff):**
```typescript
{
  research: {
    query: '[Company] SEC filing performance data',
    findings: 'No SEC filings found. Company not registered as investment advisor.',
    verdict: 'Cannot verify claim - no regulatory oversight',
    severity: 95
  }
}
```

**Math:**
```typescript
{
  analysis: 'No calculation to verify - percentage is stated, not derived',
  note: 'If this is compound annual return over multiple years, formula may be incorrect'
}
```

**Synthesis:**
```typescript
{
  combined: {
    verdict: 'highly-suspicious',
    reasoning: `
      - Epistemic: Selection bias + false precision
      - Fact-check: Unverifiable, no SEC registration
      - Math: Can't verify calculation method

      Overall: Classic investment scam markers. Mathematical appearance
      of rigor combined with epistemically flawed methodology and
      regulatory evasion.
    `,
    severity: 95,
    recommendation: '🚨 Strong warning to users'
  }
}
```

---

### Scenario 2: Scientific Claims

**Document:** "Our treatment reduces symptoms by 50% according to our study."

**Epistemic Critic:**
```typescript
{
  issues: [
    {
      type: 'vague-claim',
      text: 'our study',
      severity: 60,
      reasoning: 'No specific citation, self-funded, potential conflict of interest',
      handoffTo: 'fact-check',
      researchQuery: '[Company] [Treatment] randomized controlled trial'
    },
    {
      type: 'relative-absolute-confusion',
      text: '50% reduction',
      severity: 70,
      reasoning: '50% of what baseline? Relative or absolute?'
    }
  ]
}
```

**Fact Check:**
```typescript
{
  research: {
    query: '[Company] [Treatment] randomized controlled trial',
    findings: 'Found preprint on company website. Not peer-reviewed. N=50. No control group.',
    verdict: 'Exists but low quality evidence',
    severity: 80
  }
}
```

**Math:**
```typescript
{
  analysis: 'If baseline is 10 and treatment is 5, that's 50% reduction (relative)',
  note: 'Could also mean absolute reduction of 50 percentage points. Ambiguous.',
  recommendation: 'Clarify: relative vs absolute, provide baseline'
}
```

**Synthesis:**
```typescript
{
  combined: {
    verdict: 'low-quality-evidence',
    reasoning: `
      - Epistemic: Vague citation + framing ambiguity
      - Fact-check: Study exists but not peer-reviewed, small N, no control
      - Math: Ambiguous whether relative or absolute reduction

      Overall: Real study but too weak to support strong claims. Multiple
      layers of ambiguity allow maximum marketing flexibility while
      maintaining technical defensibility.
    `,
    severity: 75,
    recommendation: 'Require: peer review, larger N, control group, clarify framing'
  }
}
```

---

### Scenario 3: Historical Claims

**Document:** "The company was founded in 2020. Within 2 years, we achieved 500% growth."

**Epistemic Critic:**
```typescript
{
  issues: [
    {
      type: 'cherry-picked-timeframe',
      text: 'founded in 2020',
      severity: 80,
      reasoning: '2020 was COVID market bottom. Almost everything showed extreme growth 2020-2022.',
      handoffTo: null, // No need for fact-check, reasoning issue
      suggestedFix: 'Show performance across multiple timeframes, including recent years'
    }
  ]
}
```

**Fact Check:**
```typescript
{
  research: {
    query: '[Company] founded 2020 growth rate',
    findings: 'Company incorporation date: March 2020 confirmed. Growth rate unverified.',
    verdict: 'Founded date accurate, but growth rate needs verification',
    severity: 60
  }
}
```

**Math:**
```typescript
{
  analysis: '500% growth = 6x increase (if additive) or 5x increase (if multiplicative)',
  note: 'Over 2 years: CAGR = (6^(1/2) - 1) ≈ 145% annually if 6x',
  recommendation: 'Clarify: 500% increase (6x) or 500% of original (5x)?'
}
```

**Synthesis:**
```typescript
{
  combined: {
    verdict: 'misleading-context',
    reasoning: `
      - Epistemic: Starting from March 2020 (market bottom) makes any growth look impressive
      - Fact-check: Company founding confirmed, but growth not independently verified
      - Math: 500% is ambiguous (5x or 6x?), either way impressive if true

      Overall: Technically accurate founding date used strategically to show
      growth from most favorable possible starting point. Growth rate impressive
      but unverified and presented without context of broader market growth.
    `,
    severity: 70,
    recommendation: 'Compare to market growth in same period. Verify growth rate.'
  }
}
```

---

## Implementation Architecture

### Plugin Communication Protocol

```typescript
interface PluginMessage {
  from: PluginType;
  to: PluginType;
  messageType: 'handoff' | 'inquiry' | 'result';

  content: {
    claim: string;
    location: TextLocation;
    context: string;

    // What the sender wants
    request: string;
    priority: 'critical' | 'high' | 'medium' | 'low';

    // What the sender found
    findings?: any;

    // How to do the work
    researchHint?: {
      queries: string[];
      expectedSources: string[];
      redFlags: string[];
    };
  };
}

class PluginCommunicationHub {
  // Route messages between plugins
  routeMessage(message: PluginMessage): void;

  // Collect results from multiple plugins
  synthesizeResults(claim: string): MultiPluginSynthesis;

  // Determine which plugins should analyze what
  assignResponsibilities(document: string): Map<PluginType, TextSpan[]>;
}
```

### Synthesis Engine

```typescript
class PluginSynthesisEngine {
  /**
   * Combine findings from multiple plugins into coherent assessment
   */
  synthesize(claim: string, findings: Map<PluginType, Finding>): Synthesis {
    // 1. Check for contradictions
    const contradictions = this.findContradictions(findings);

    // 2. Find complementary insights
    const complement = this.findComplementaryFindings(findings);

    // 3. Calculate combined severity
    const severity = this.calculateCombinedSeverity(findings);

    // 4. Generate integrated explanation
    const explanation = this.generateSynthesis(findings, contradictions, complement);

    return {
      overallVerdict: this.determineVerdict(findings),
      combinedSeverity: severity,
      explanation,
      pluginFindings: findings,
      contradictions,
      complementaryInsights: complement
    };
  }

  /**
   * Example: Math says calculation is correct, but Epistemic says it's misleading
   * These complement rather than contradict
   */
  private findComplementaryFindings(findings: Map<PluginType, Finding>): Insight[] {
    const insights: Insight[] = [];

    // Math correct + Epistemic misleading = Deceptive but defensible
    if (findings.get('math')?.correct && findings.get('epistemic-critic')?.misleading) {
      insights.push({
        type: 'deceptive-accuracy',
        description: 'Technically correct numbers used in misleading way',
        severity: 'high',
        implication: 'Suggests intentional manipulation rather than innocent error'
      });
    }

    // Fact-check can't verify + Epistemic flagged reasoning = Likely fabricated
    if (!findings.get('fact-check')?.verified && findings.get('epistemic-critic')?.suspicious) {
      insights.push({
        type: 'unverifiable-suspicious',
        description: 'Cannot verify AND reasoning is flawed',
        severity: 'critical',
        implication: 'High confidence this is misleading or false'
      });
    }

    return insights;
  }

  /**
   * Combined severity is often higher than individual
   * Multiple independent red flags increase confidence
   */
  private calculateCombinedSeverity(findings: Map<PluginType, Finding>): number {
    const severities = Array.from(findings.values()).map(f => f.severity);
    const maxSeverity = Math.max(...severities);

    // If multiple plugins flag issue, boost severity
    if (severities.length >= 2) {
      return Math.min(100, maxSeverity + 10 * (severities.length - 1));
    }

    return maxSeverity;
  }
}
```

---

## User Experience: Showing Synthesis

### Integrated View

```markdown
## Analysis: "90% of users are satisfied"

### 🔍 Multiple Issues Detected

**Epistemic Critic** 🧠
🚨 Error: Selection Bias (Severity: 85)
Only surveys current users, excludes those who left (likely dissatisfied)

**Fact Check** ✓
⚠️ Warning: Cannot Verify (Severity: 70)
No independent verification found. Company claims not substantiated.

**Math** ➗
✓ No Issues
Calculation is technically correct if sample data is as stated.

---

### 🎯 Combined Assessment

**Overall Verdict:** 🚨 High Confidence Misleading

**Why This Matters:**
The combination of issues is more serious than any single one:

1. **Sampling is biased** (epistemic) - systematically excludes negative experiences
2. **Claims are unverified** (fact-check) - no independent confirmation
3. **Math is correct** (math) - which makes it more deceptive, not less

This pattern suggests **intentional manipulation**: using technically accurate
statistics (so claims are defensible) in maximally misleading way (so claims
appear strong).

**Combined Severity:** 95/100 (↑ from individual: 85, 70, 0)

**Why severity increased:**
Multiple independent red flags increase confidence this is intentional rather
than innocent error.

---

### 💡 What This Teaches

This is a masterclass in statistical manipulation:
- Pick the right sample → Get the answer you want
- Use real math → Make it look rigorous
- Avoid independent verification → Maintain flexibility

Classic pattern in: Investment marketing, supplement claims, success stories

**How to protect yourself:**
- Always ask: "Who did they NOT survey?"
- Demand: Independent verification
- Remember: Accurate math ≠ honest claim
```

---

## Plugin Coordination Strategies

### Strategy 1: Sequential (Handoff Chain)

```
Epistemic → Fact Check → Math → Synthesis
   ↓           ↓          ↓
 Found     Researched  Verified
 issue     claim       calc
```

**Pros:** Clear responsibility, builds on previous findings
**Cons:** Slower (sequential), earlier plugins can't use later findings

### Strategy 2: Parallel (Independent Then Synthesize)

```
        ┌─ Epistemic ─┐
Text ───┼─ Fact Check ─┼─→ Synthesis
        └─ Math ───────┘
```

**Pros:** Faster (parallel), no bias from other plugins
**Cons:** No communication, might duplicate work

### Strategy 3: Hybrid (Parallel + Handoffs)

```
Text ───┬─ Epistemic ────┐
        │                 ├─→ Synthesis
        └─ Fact Check ←───┘
                ↑
            (handoff if needed)
```

**Pros:** Fast AND coordinated
**Cons:** More complex implementation

**Recommendation:** Use Strategy 3 (Hybrid)

---

## Configuration

### Per-Document Settings

```typescript
interface CrossPluginConfig {
  // Which plugins to run
  enabledPlugins: PluginType[];

  // How they coordinate
  coordinationStrategy: 'sequential' | 'parallel' | 'hybrid';

  // Handoff settings
  handoffs: {
    enabled: boolean;
    maxHandoffs: number; // Prevent infinite loops
    priorityThreshold: number; // Only handoff if severity >= this
  };

  // Synthesis settings
  synthesis: {
    enabled: boolean;
    minimumPlugins: number; // Need at least N plugins to synthesize
    showIndividual: boolean; // Show individual findings or only synthesis?
  };

  // Priority assignment (if resources limited)
  pluginPriority: {
    primary: PluginType[]; // Always run these
    secondary: PluginType[]; // Run if resources available
  };
}
```

### Smart Resource Allocation

```typescript
class ResourceAllocator {
  /**
   * Decide which plugins to run based on document type and budget
   */
  allocatePlugins(
    document: string,
    availableTokens: number,
    timeoutMs: number
  ): ExecutionPlan {

    const documentType = this.detectDocumentType(document);
    const criticalPlugins = this.getCriticalPlugins(documentType);

    // Always run critical plugins
    const plan: ExecutionPlan = {
      parallel: criticalPlugins,
      sequential: [],
      handoffs: []
    };

    // Estimate cost of critical plugins
    const criticalCost = this.estimateCost(criticalPlugins, document);
    const remainingTokens = availableTokens - criticalCost;

    // Use remaining budget for secondary plugins
    if (remainingTokens > 1000) {
      const secondaryPlugins = this.getSecondaryPlugins(documentType);
      plan.parallel.push(...this.fitInBudget(secondaryPlugins, remainingTokens));
    }

    return plan;
  }

  private getCriticalPlugins(docType: DocumentType): PluginType[] {
    const CRITICAL_BY_TYPE: Record<DocumentType, PluginType[]> = {
      'investment-advice': ['epistemic-critic', 'fact-check'], // High stakes
      'scientific-paper': ['fact-check', 'math'], // Evidence quality
      'opinion-piece': ['epistemic-critic'], // Reasoning quality
      'marketing-copy': ['epistemic-critic', 'fact-check'], // Manipulation risk
      'news-article': ['fact-check'], // Accuracy critical
    };

    return CRITICAL_BY_TYPE[docType] || ['epistemic-critic'];
  }
}
```

---

## Testing Cross-Plugin Integration

### Integration Test Cases

```typescript
describe('Cross-Plugin Integration', () => {
  it('should handoff from epistemic to fact-check', async () => {
    const document = '90% of millionaires used our strategy';

    const epistemic = await runEpistemicCritic(document);
    expect(epistemic.handoffs).toHaveLength(1);
    expect(epistemic.handoffs[0].targetPlugin).toBe('fact-check');

    const factCheck = await runFactCheck(document, epistemic.handoffs[0]);
    expect(factCheck.result).toContain('cannot verify');
  });

  it('should synthesize multiple plugin findings', async () => {
    const document = 'Our internal study of 1,000 users showed 47.3% returns';

    const findings = await runAllPlugins(document);
    const synthesis = await synthesizeFindings(findings);

    expect(synthesis.verdict).toBe('highly-suspicious');
    expect(synthesis.severity).toBeGreaterThan(
      Math.max(...Object.values(findings).map(f => f.severity))
    );
  });

  it('should avoid duplicate work', async () => {
    const document = 'Water freezes at 0°C';

    const epistemic = await runEpistemicCritic(document);
    const factCheck = await runFactCheck(document);

    // Epistemic should not flag basic fact
    expect(epistemic.issues).toHaveLength(0);

    // Fact-check should verify it
    expect(factCheck.verified).toBe(true);
  });
});
```

---

## Future Enhancements

### Machine Learning for Synthesis

Train model on:
- Patterns where multiple plugins find issues
- Types of issues that commonly co-occur
- Severity adjustments based on combinations

### Reputation System

Track which plugin combinations are most valuable:
```typescript
{
  combination: ['epistemic-critic', 'fact-check'],
  documentsAnalyzed: 1000,
  userFeedback: {
    helpful: 850,
    notHelpful: 150
  },
  averageConfidence: 0.92
}
```

Use to prioritize plugin combinations in resource-constrained scenarios.
