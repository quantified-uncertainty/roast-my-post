# Domain Specialization - Context-Aware Analysis

## Philosophy
**Different document types need different epistemic standards**

## Document Type Detection

```typescript
enum DocumentType {
  SCIENTIFIC_PAPER = 'scientific-paper',
  OPINION_PIECE = 'opinion-piece',
  NEWS_ARTICLE = 'news-article',
  MARKETING_COPY = 'marketing-copy',
  INVESTMENT_ADVICE = 'investment-advice',
  MEDICAL_ADVICE = 'medical-advice',
  POLITICAL_ANALYSIS = 'political-analysis',
  TECHNICAL_DOCS = 'technical-docs',
  BLOG_POST = 'blog-post',
  SOCIAL_MEDIA = 'social-media',
  LEGAL_DOCUMENT = 'legal-document',
  EDUCATIONAL = 'educational'
}

class DocumentTypeDetector {
  detect(text: string, metadata?: DocumentMetadata): DocumentType {
    // Check metadata first
    if (metadata?.type) return metadata.type;

    // Pattern matching
    if (this.hasScientificStructure(text)) return DocumentType.SCIENTIFIC_PAPER;
    if (this.hasInvestmentLanguage(text)) return DocumentType.INVESTMENT_ADVICE;
    if (this.hasMedicalLanguage(text)) return DocumentType.MEDICAL_ADVICE;
    if (this.hasMarketingLanguage(text)) return DocumentType.MARKETING_COPY;
    if (this.hasOpinionMarkers(text)) return DocumentType.OPINION_PIECE;

    return DocumentType.BLOG_POST; // Default
  }

  private hasScientificStructure(text: string): boolean {
    const scientificMarkers = [
      /abstract/i,
      /methods/i,
      /results/i,
      /discussion/i,
      /peer[- ]review/i,
      /p\s*<\s*0\.\d+/,
      /n\s*=\s*\d+/i,
      /statistical significance/i
    ];

    return scientificMarkers.filter(m => m.test(text)).length >= 3;
  }

  private hasInvestmentLanguage(text: string): boolean {
    const investmentMarkers = [
      /ROI|return on investment/i,
      /\d+%\s*(annual|yearly|monthly)?\s*return/i,
      /portfolio/i,
      /invest(ment|ing|or)/i,
      /SEC|securities/i,
      /stocks?|bonds?|fund/i
    ];

    return investmentMarkers.filter(m => m.test(text)).length >= 2;
  }

  private hasMarketingLanguage(text: string): boolean {
    const marketingMarkers = [
      /revolutionary|game-changing|breakthrough/i,
      /limited time offer|act now/i,
      /testimonial|success stor(y|ies)/i,
      /guarantee|proven results/i,
      /\d+%\s*of\s*(our\s*)?customers/i,
      /(buy|shop|order) now/i
    ];

    const hypeWords = ['amazing', 'incredible', 'unbelievable', 'revolutionary', 'game-changing'];
    const hypeCount = hypeWords.filter(w => new RegExp(w, 'i').test(text)).length;

    return marketingMarkers.filter(m => m.test(text)).length >= 2 || hypeCount >= 3;
  }
}
```

---

## Domain-Specific Standards

### 1. Scientific Papers

**Highest Standards - Academic Rigor Expected**

```typescript
const SCIENTIFIC_PAPER_STANDARDS = {
  evidence: {
    required: true,
    quality: 'peer-reviewed',
    methodology: 'must-be-explicit',
    replication: 'encouraged'
  },

  citations: {
    required: 'always',
    style: 'formal-academic',
    primarySources: 'strongly-preferred'
  },

  uncertainty: {
    required: 'explicit',
    confidenceIntervals: 'required',
    limitations: 'must-acknowledge'
  },

  rhetorical: {
    emotionalLanguage: 'avoid',
    definitiveClaims: 'discouraged',
    hedging: 'appropriate',
    speculation: 'clearly-labeled'
  },

  // Extra scrutiny
  extraChecks: [
    'p-hacking indicators',
    'HARKing (hypothesizing after results known)',
    'cherry-picked results',
    'conflict of interest',
    'replication crisis awareness'
  ]
};
```

**Specific Fallacies to Prioritize:**
- P-value misinterpretation
- P-hacking / forking paths
- HARKing
- Publication bias
- Effect size neglect
- Conflating correlation and causation
- Ignoring confounders
- Simpson's paradox

**Example Analysis:**

```markdown
## Scientific Paper Analysis

**Standards Applied:** Academic rigor (highest)

**Issue Found:** P-value misinterpretation
Location: Line 145 - "p < 0.05, therefore our hypothesis is true"

**Why this is serious in scientific context:**
- Scientific papers should know better (higher standard than blog posts)
- This specific error undermines entire result interpretation
- P-value only tells you P(data|null hypothesis), NOT P(hypothesis|data)
- Should report: effect size, confidence intervals, statistical power

**Severity:** 90/100 (high because this is a scientific paper)
```

---

### 2. Investment/Financial Advice

**Very High Standards - High Stakes, Regulated Domain**

```typescript
const INVESTMENT_ADVICE_STANDARDS = {
  evidence: {
    required: true,
    quality: 'SEC-filings-or-audited',
    backups: 'regulatory-required'
  },

  disclosures: {
    risks: 'mandatory',
    fees: 'mandatory',
    conflicts: 'mandatory',
    pastPerformance: 'must-include-disclaimer'
  },

  claims: {
    returnProjections: 'forbidden-without-disclaimer',
    comparisons: 'must-use-appropriate-benchmarks',
    timeframes: 'must-not-cherry-pick',
    guarantees: 'forbidden'
  },

  // Regulatory requirements
  regulatory: {
    registration: 'should-be-verifiable',
    fiduciary: 'clarify-duty',
    suitability: 'must-assess'
  },

  // Red flags specific to investment fraud
  fraudMarkers: [
    'guaranteed returns',
    'no risk',
    'too good to be true returns',
    'urgency/pressure tactics',
    'unregistered with SEC',
    'survivorship bias in success stories'
  ]
};
```

**Specific Fallacies to Prioritize:**
- Survivorship bias (very common!)
- Cherry-picked timeframes (especially starting 2020)
- Selection bias in client surveys
- Relative vs absolute returns
- Ignoring risk-adjusted returns
- Comparison to inappropriate benchmarks
- Undisclosed fees/costs

**Example Analysis:**

```markdown
## Investment Advice Analysis

**Standards Applied:** Financial advice (very high) - Regulated domain

**Issue Found:** Survivorship bias + No SEC registration
Location: Line 23 - "90% of our millionaire clients achieved wealth in 5 years"

**Why this is critical in investment context:**
1. **Survivorship bias:** Only counts successful clients, ignores failures
2. **No regulatory oversight:** No SEC filings found (researched)
3. **High stakes:** People could lose life savings
4. **Pattern:** Document has 5 similar red flags

**Severity:** 95/100 (critical - high stakes domain + multiple red flags)

**Regulatory note:** This type of claim without proper disclosures may violate SEC regulations. Consider reporting to SEC.gov/tcr
```

---

### 3. Medical/Health Advice

**Very High Standards - Health Consequences**

```typescript
const MEDICAL_ADVICE_STANDARDS = {
  evidence: {
    required: true,
    quality: 'peer-reviewed-RCT-preferred',
    replication: 'important',
    metaAnalyses: 'best'
  },

  claims: {
    efficacy: 'must-cite-studies',
    safety: 'must-discuss-risks',
    alternatives: 'should-mention',
    limitations: 'must-acknowledge'
  },

  conflicts: {
    funding: 'must-disclose',
    financial: 'must-disclose',
    consulting: 'should-disclose'
  },

  contraindications: {
    required: true,
    whenToSeekHelp: 'should-include'
  },

  // Hierarchy of evidence
  evidenceHierarchy: [
    'meta-analysis',
    'systematic-review',
    'RCT',
    'cohort-study',
    'case-control',
    'case-series',
    'expert-opinion',
    'anecdote'
  ],

  // Red flags for medical quackery
  quackeryMarkers: [
    'miracle cure',
    'big pharma doesn\'t want you to know',
    'natural therefore safe',
    'toxins',
    'detox',
    'ancient remedy',
    'one weird trick'
  ]
};
```

**Specific Fallacies to Prioritize:**
- Anecdotal evidence ("worked for me")
- Appeal to nature ("natural = safe")
- Relative vs absolute risk
- Number needed to treat (NNT) missing
- Lead time bias
- Survivorship bias
- Conflicts of interest

**Example Analysis:**

```markdown
## Medical Advice Analysis

**Standards Applied:** Health advice (very high) - Safety critical

**Issue Found:** Anecdotal evidence + Appeal to nature
Location: Line 67 - "This natural remedy cured my arthritis. Unlike dangerous pharmaceuticals, it has no side effects."

**Why this is dangerous in medical context:**
1. **Anecdote ≠ evidence:** One person's experience doesn't establish efficacy
2. **Appeal to nature fallacy:** "Natural" doesn't mean safe (arsenic is natural)
3. **False dichotomy:** Natural vs pharmaceutical is false choice
4. **No safety data:** All substances have potential side effects
5. **Could delay effective treatment:** Time is critical for many conditions

**Evidence quality:** None - personal anecdote, no studies cited
**Should have:** RCTs, safety studies, comparison to standard treatment

**Severity:** 90/100 (critical - health advice without evidence)

**Safety note:** Recommend consulting healthcare provider before trying unproven remedies.
```

---

### 4. Marketing Copy

**High Scrutiny But Different Standards**

```typescript
const MARKETING_COPY_STANDARDS = {
  // Marketing IS persuasion, but should be honest persuasion
  evidence: {
    required: 'for-factual-claims',
    quality: 'depends-on-claim',
    methodology: 'should-be-available'
  },

  claims: {
    specific: 'must-be-substantiated',
    vague: 'acceptable-if-not-misleading',
    superlatives: 'should-be-defensible',
    comparisons: 'must-be-fair'
  },

  rhetorical: {
    emotionalLanguage: 'expected',
    hyperbole: 'common-but-flag-if-misleading',
    socialProof: 'acceptable-if-real',
    urgency: 'acceptable-unless-false'
  },

  // FTC guidelines
  ftcGuidelines: {
    testimonials: 'must-be-genuine',
    typicalResults: 'must-be-disclosed',
    endorsements: 'must-disclose-compensation',
    guarantees: 'must-honor-terms'
  },

  // Red flags even for marketing
  unacceptableEven ForMarketing: [
    'false factual claims',
    'fake testimonials',
    'fabricated studies',
    'deceptive comparisons',
    'hidden fine print contradicting claims'
  ]
};
```

**Different Approach:**
- Don't flag emotional language (expected in marketing)
- DO flag deceptive factual claims
- DO flag manipulative tactics that cross ethical lines
- Focus on honesty, not persuasiveness

**Example Analysis:**

```markdown
## Marketing Copy Analysis

**Standards Applied:** Marketing copy (high scrutiny, but appropriate for genre)

**Not Flagged:** Emotional language, superlatives (expected in marketing)

**Issue Found:** Deceptive comparison
Location: Line 34 - "50% better than leading competitor"

**Why this is problematic even for marketing:**
1. **Vague comparison:** Better at what? By what metric?
2. **Unverifiable:** Which competitor? What data supports this?
3. **Likely cherry-picked:** 50% better on one metric, worse on others?
4. **FTC concern:** May violate comparative advertising rules

**Acceptable marketing version:**
"In a 2024 lab test of 100 users, our product scored 50% higher on metric X than Product Y (full study at link)"

**Severity:** 75/100 (high - deceptive comparison in marketing context)
```

---

### 5. Opinion Pieces / Editorial

**Lower Standards - Opinion Is Allowed**

```typescript
const OPINION_PIECE_STANDARDS = {
  evidence: {
    required: 'for-factual-claims-only',
    quality: 'reasonable',
    methodology: 'not-required'
  },

  citations: {
    required: 'for-facts-not-opinions',
    style: 'informal-acceptable'
  },

  uncertainty: {
    required: 'implicit-okay',
    hedging: 'optional'
  },

  rhetorical: {
    emotionalLanguage: 'acceptable',
    strongPositions: 'expected',
    persuasion: 'inherent-to-genre'
  },

  // What to check even in opinion pieces
  stillCheck: [
    'factual accuracy (for facts stated)',
    'logical fallacies (in reasoning)',
    'fairness (steelmanning vs strawmanning)',
    'intellectual honesty'
  ],

  // What NOT to flag
  dontFlag: [
    'subjective opinions',
    'value judgments',
    'emotional language',
    'strong positions',
    'predictions (if labeled as opinion)'
  ]
};
```

**Focus On:**
- Are FACTS accurate (opinions can be wrong but not false)
- Is reasoning logically sound
- Are opposing views fairly represented
- Is bad faith argumentation used

**Example Analysis:**

```markdown
## Opinion Piece Analysis

**Standards Applied:** Opinion/editorial (lower standards - genre-appropriate)

**Not Flagged:**
- Strong opinions (expected)
- Emotional language (appropriate for opinion)
- Lack of citations for opinion claims (okay)

**Issue Found:** Strawman argument
Location: Line 45 - "My opponents want to completely eliminate all regulations"

**Why this matters even in opinion:**
1. **Misrepresentation:** Unlikely opponents hold such extreme view
2. **Bad faith:** Makes opposing view easier to attack
3. **Undermines discourse:** Prevents engaging with real arguments
4. **Intellectual dishonesty:** Even opinions should represent others fairly

**Better version:**
"My opponents favor reducing regulations in X domain, arguing that Y..."

**Severity:** 65/100 (medium - bad faith argumentation even in opinion context)
```

---

### 6. News Articles

**High Standards - Journalism Ethics**

```typescript
const NEWS_ARTICLE_STANDARDS = {
  evidence: {
    required: true,
    quality: 'primary-sources-preferred',
    verification: 'two-source-rule'
  },

  citations: {
    required: 'always',
    sources: 'should-be-named-when-possible',
    anonymous: 'explain-why-anonymous'
  },

  balance: {
    required: 'for-controversial-topics',
    multipleViewpoints: 'present-fairly',
    noFalseEquivalence: true
  },

  uncertainty: {
    required: 'explicit',
    speculative: 'clearly-labeled',
    unknowns: 'acknowledge'
  },

  // Journalism ethics
  journalisticStandards: [
    'verify before publishing',
    'seek truth and report it',
    'minimize harm',
    'act independently',
    'be accountable'
  ],

  // Red flags in news
  redFlags: [
    'single anonymous source',
    'unverified claims presented as fact',
    'opinion disguised as reporting',
    'missing context',
    'sensationalized headlines'
  ]
};
```

---

## Domain-Specific Fallacy Priorities

### Investment Domain

```typescript
const INVESTMENT_FALLACY_PRIORITIES = {
  critical: [
    'survivorship-bias',  // Very common in investment marketing
    'cherry-picked-timeframes',  // Starting from 2020, etc.
    'selection-bias',  // Only surveying current clients
    'missing-risk-disclosure',
    'no-regulatory-registration'
  ],

  high: [
    'relative-vs-absolute-returns',
    'inappropriate-benchmarks',
    'ignoring-fees',
    'past-performance-fallacy',
    'false-precision'
  ],

  medium: [
    'appeal-to-authority',
    'bandwagon',
    'scarcity/urgency'
  ]
};
```

### Medical Domain

```typescript
const MEDICAL_FALLACY_PRIORITIES = {
  critical: [
    'anecdotal-evidence',
    'appeal-to-nature',
    'relative-vs-absolute-risk',
    'ignoring-base-rates',
    'correlation-causation'
  ],

  high: [
    'cherry-picked-studies',
    'ignoring-side-effects',
    'false-dichotomy-treatment-options',
    'conspiracy-thinking-big-pharma'
  ],

  medium: [
    'appeal-to-antiquity',
    'appeal-to-authority',
    'hasty-generalization'
  ]
};
```

### Political Analysis Domain

```typescript
const POLITICAL_FALLACY_PRIORITIES = {
  critical: [
    'strawman',
    'false-equivalence',
    'cherry-picked-data',
    'quote-mining'
  ],

  high: [
    'false-dichotomy',
    'whataboutism',
    'ad-hominem',
    'genetic-fallacy',
    'moving-goalposts'
  ],

  medium: [
    'appeal-to-emotion',
    'slippery-slope',
    'hasty-generalization'
  ]
};
```

---

## Implementation

### Domain-Aware Analysis Engine

```typescript
class DomainSpecificAnalyzer {
  analyze(text: string, metadata?: DocumentMetadata): DomainAnalysisResult {
    // 1. Detect document type
    const docType = this.detectDocumentType(text, metadata);

    // 2. Load domain-specific standards
    const standards = this.getStandards(docType);

    // 3. Adjust fallacy priorities
    const priorities = this.getFallacyPriorities(docType);

    // 4. Run analysis with domain context
    const issues = await this.extractIssuesWithDomainContext(text, docType, priorities);

    // 5. Apply domain-specific severity adjustments
    const adjustedIssues = this.adjustSeverity(issues, standards);

    // 6. Add domain-specific guidance
    const enrichedIssues = this.addDomainGuidance(adjustedIssues, docType);

    return {
      documentType: docType,
      standards: standards,
      issues: enrichedIssues,
      domainSpecificNotes: this.generateDomainNotes(docType, issues)
    };
  }

  private adjustSeverity(
    issues: EpistemicIssue[],
    standards: DomainStandards
  ): EpistemicIssue[] {
    return issues.map(issue => {
      let adjustment = 0;

      // High-stakes domains: Increase severity
      if (standards.stakes === 'very-high') {
        adjustment += 15;
      }

      // Regulatory domains: Increase severity for violations
      if (standards.regulatory && this.isRegulatoryViolation(issue)) {
        adjustment += 20;
      }

      // Lower severity in appropriate contexts
      if (standards.allowOpinion && issue.type === 'subjective-claim') {
        adjustment -= 20;
      }

      return {
        ...issue,
        severityScore: Math.max(0, Math.min(100, issue.severityScore + adjustment)),
        domainAdjustment: adjustment,
        domainReasoning: this.explainAdjustment(adjustment, standards)
      };
    });
  }

  private generateDomainNotes(docType: DocumentType, issues: EpistemicIssue[]): string[] {
    const notes: string[] = [];

    if (docType === DocumentType.INVESTMENT_ADVICE) {
      notes.push('⚠️ Investment advice is regulated by SEC. Some issues may constitute violations.');
      notes.push('🔍 No SEC registration found - company may be operating without required licenses.');

      if (issues.some(i => i.type === 'survivorship-bias')) {
        notes.push('📊 Survivorship bias is particularly common in investment marketing.');
      }
    }

    if (docType === DocumentType.MEDICAL_ADVICE) {
      notes.push('⚠️ Health advice should be verified with healthcare provider.');
      notes.push('🔍 Check evidence quality - prefer peer-reviewed RCTs over anecdotes.');

      if (issues.some(i => i.type === 'anecdotal-evidence')) {
        notes.push('📊 Anecdotal evidence is insufficient for medical claims.');
      }
    }

    return notes;
  }
}
```

---

## User Experience: Showing Domain Context

```markdown
## Document Analysis

**Document Type Detected:** Investment Advice
**Applied Standards:** Very High (Regulated domain, high stakes)

ℹ️ **Why higher standards?**
Investment advice is regulated by the SEC and involves significant financial risk.
We apply stricter scrutiny to:
- Return claims (must be substantiated)
- Risk disclosures (must be explicit)
- Company registration (must be verifiable)
- Survivorship bias (very common in this domain)

---

**Found 8 issues (5 critical, 3 high-severity)**

🚨 **Domain-Specific Red Flags:**
- No SEC registration found
- Survivorship bias in success claims
- Cherry-picked timeframe (starting 2020)
- No risk disclosure
- Unverifiable return claims

**Regulatory Note:** Some of these issues may violate SEC marketing rules. Consider reporting to SEC.gov/tcr if you believe this is fraudulent advice.
```

---

## Future: Learning Domain Patterns

Track which fallacies are most common in which domains:

```typescript
const LEARNED_PATTERNS = {
  'investment-advice': {
    mostCommonFallacies: [
      { type: 'survivorship-bias', frequency: 0.73 },
      { type: 'cherry-picked-timeframe', frequency: 0.65 },
      { type: 'selection-bias', frequency: 0.58 }
    ],
    confidenceBoost: 'High confidence when multiple patterns co-occur'
  },

  'medical-advice': {
    mostCommonFallacies: [
      { type: 'anecdotal-evidence', frequency: 0.68 },
      { type: 'appeal-to-nature', frequency: 0.54 },
      { type: 'relative-absolute-risk', frequency: 0.47 }
    ]
  }
};
```

Use this to:
- Adjust priors when detecting fallacies
- Provide domain-specific warnings
- Educate users about common patterns in each domain
