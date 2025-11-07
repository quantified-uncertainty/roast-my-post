# Research & Verification Enhancements

## Current State

**What we do now:**
- Research high-severity issues (severity ≥ 60, researchability ≥ 50)
- Use Perplexity for web search
- Include research findings in comments

**Limitations:**
- Binary decision (research or don't)
- Single research pass (no iteration)
- No source quality assessment
- Can't verify negative claims
- No fact-check coordination

---

## Smart Research Prioritization

### Multi-Criteria Decision Tree

```typescript
interface ResearchDecision {
  shouldResearch: boolean;
  priority: 'critical' | 'high' | 'medium' | 'low' | 'skip';
  method: 'quick' | 'standard' | 'deep' | 'iterative';
  budget: {
    maxQueries: number;
    maxTokens: number;
    maxTimeMs: number;
  };
  reasoning: string;
}

class SmartResearchPrioritizer {
  decide(issue: EpistemicIssue, context: DocumentContext): ResearchDecision {
    // Critical: Could cause serious harm if wrong
    if (this.couldCauseHarm(issue)) {
      return {
        shouldResearch: true,
        priority: 'critical',
        method: 'deep',
        budget: { maxQueries: 10, maxTokens: 10000, maxTimeMs: 60000 },
        reasoning: 'Financial/health advice requires thorough verification'
      };
    }

    // High: Central to document's argument
    if (issue.importanceScore > 85 && issue.researchableScore > 70) {
      return {
        shouldResearch: true,
        priority: 'high',
        method: 'standard',
        budget: { maxQueries: 5, maxTokens: 5000, maxTimeMs: 30000 },
        reasoning: 'Key claim that is easily verifiable'
      };
    }

    // Pattern research: Multiple similar issues, research one example
    if (this.partOfPattern(issue) && !this.patternAlreadyResearched(issue)) {
      return {
        shouldResearch: true,
        priority: 'medium',
        method: 'quick',
        budget: { maxQueries: 2, maxTokens: 2000, maxTimeMs: 10000 },
        reasoning: 'Representative example of common pattern'
      };
    }

    // Controversial: Verify if this is actually disputed
    if (this.mightBeUncontroversial(issue)) {
      return {
        shouldResearch: true,
        priority: 'low',
        method: 'quick',
        budget: { maxQueries: 1, maxTokens: 1000, maxTimeMs: 5000 },
        reasoning: 'Check if this is actually disputed or settled'
      };
    }

    return {
      shouldResearch: false,
      priority: 'skip',
      method: 'quick',
      budget: { maxQueries: 0, maxTokens: 0, maxTimeMs: 0 },
      reasoning: 'Low priority given resource constraints'
    };
  }

  private couldCauseHarm(issue: EpistemicIssue): boolean {
    const HIGH_STAKES_DOMAINS = [
      'medical advice',
      'financial investment',
      'safety critical',
      'legal advice',
      'child welfare'
    ];

    return HIGH_STAKES_DOMAINS.some(domain =>
      issue.context.toLowerCase().includes(domain)
    );
  }

  private partOfPattern(issue: EpistemicIssue): boolean {
    // Check if this is one of multiple similar issues
    return issue.similarIssuesInDocument > 2;
  }
}
```

---

## Iterative Research (Multiple Passes)

### Research Strategy: Quick → Standard → Deep

```typescript
class IterativeResearcher {
  async research(issue: EpistemicIssue): Promise<ResearchResult> {
    // Pass 1: Quick search
    const quickResult = await this.quickResearch(issue);

    if (quickResult.quality === 'high' && quickResult.confidence > 0.8) {
      return quickResult; // Good enough!
    }

    // Pass 2: Standard search with refined query
    const standardResult = await this.standardResearch(issue, {
      refinedQuery: this.refineQuery(issue, quickResult),
      excludeDomains: quickResult.lowQualitySources
    });

    if (standardResult.quality === 'high' || quickResult.confidence > 0.6) {
      return this.combine(quickResult, standardResult);
    }

    // Pass 3: Deep search with multiple strategies
    const deepResult = await this.deepResearch(issue, {
      strategies: ['academic', 'regulatory', 'investigative'],
      previousAttempts: [quickResult, standardResult]
    });

    return this.combine(quickResult, standardResult, deepResult);
  }

  private async quickResearch(issue: EpistemicIssue): Promise<ResearchResult> {
    const query = this.generateSimpleQuery(issue);
    const results = await perplexity.search(query, { max_results: 5 });

    return {
      quality: this.assessQuality(results),
      confidence: this.assessConfidence(results),
      sources: results,
      findings: this.extractFindings(results),
      method: 'quick'
    };
  }

  private async standardResearch(
    issue: EpistemicIssue,
    options: { refinedQuery: string; excludeDomains: string[] }
  ): Promise<ResearchResult> {
    // Try multiple query formulations
    const queries = [
      options.refinedQuery,
      this.generateAcademicQuery(issue),
      this.generateRegulatoryQuery(issue)
    ];

    const results = await Promise.all(
      queries.map(q => perplexity.search(q, {
        max_results: 10,
        exclude_domains: options.excludeDomains
      }))
    );

    const combined = this.deduplicateAndRank(results.flat());

    return {
      quality: this.assessQuality(combined),
      confidence: this.assessConfidence(combined),
      sources: combined,
      findings: this.extractFindings(combined),
      method: 'standard'
    };
  }

  private async deepResearch(
    issue: EpistemicIssue,
    options: { strategies: string[]; previousAttempts: ResearchResult[] }
  ): Promise<ResearchResult> {
    // Try specialized search strategies
    const strategies = {
      academic: () => this.searchAcademic(issue),
      regulatory: () => this.searchRegulatory(issue),
      investigative: () => this.searchInvestigative(issue)
    };

    const results = await Promise.all(
      options.strategies.map(s => strategies[s]())
    );

    return {
      quality: 'deep',
      confidence: this.assessConfidence(results.flat()),
      sources: results.flat(),
      findings: this.synthesizeFindings(results.flat()),
      method: 'deep'
    };
  }

  private refineQuery(issue: EpistemicIssue, previousResult: ResearchResult): string {
    if (previousResult.sources.length === 0) {
      // No results: Make query broader
      return this.broaden(issue.researchQuery);
    }

    if (previousResult.quality === 'low') {
      // Low quality: Make query more specific, add quality filters
      return this.addQualityFilters(issue.researchQuery);
    }

    if (previousResult.findings.contradictory) {
      // Contradictory: Search for consensus or meta-analysis
      return `meta-analysis OR systematic review: ${issue.researchQuery}`;
    }

    return issue.researchQuery;
  }
}
```

---

## Source Quality Assessment

### Credibility Scoring

```typescript
interface SourceCredibility {
  url: string;
  domain: string;

  // Source characteristics
  type: 'peer-reviewed' | 'government' | 'news' | 'blog' | 'marketing' | 'unknown';
  authority: number; // 0-100
  recency: number; // 0-100 (how recent)
  relevance: number; // 0-100 (how relevant to query)

  // Content quality
  hasMethodology: boolean;
  citesSources: boolean;
  hasConflictDisclosure: boolean;

  // Trust signals
  isPaywalled: boolean; // Often indicates quality publication
  hasAuthor: boolean;
  hasPeerReview: boolean;
  isGovernmentSource: boolean;

  // Red flags
  isMarketing: boolean;
  hasCommercialBias: boolean;
  isOpinionPiece: boolean;

  // Overall
  credibilityScore: number; // 0-100
}

class SourceCredibilityAssessor {
  assess(source: SearchResult): SourceCredibility {
    const domain = this.extractDomain(source.url);
    const type = this.classifySourceType(domain, source.content);

    let score = 50; // Start neutral

    // Boost for quality signals
    if (type === 'peer-reviewed') score += 30;
    if (type === 'government') score += 25;
    if (this.hasMethodology(source.content)) score += 15;
    if (this.citesSources(source.content)) score += 10;
    if (this.hasConflictDisclosure(source.content)) score += 5;

    // Reduce for red flags
    if (this.isMarketing(source.content)) score -= 20;
    if (this.hasCommercialBias(source.url)) score -= 15;
    if (type === 'blog' && !this.isExpertBlog(domain)) score -= 10;

    return {
      url: source.url,
      domain,
      type,
      authority: this.getAuthorityScore(domain),
      recency: this.getRecencyScore(source.publishDate),
      relevance: source.relevanceScore,
      hasMethodology: this.hasMethodology(source.content),
      citesSources: this.citesSources(source.content),
      hasConflictDisclosure: this.hasConflictDisclosure(source.content),
      isPaywalled: this.isPaywalled(source.url),
      hasAuthor: this.hasAuthor(source.content),
      hasPeerReview: type === 'peer-reviewed',
      isGovernmentSource: type === 'government',
      isMarketing: this.isMarketing(source.content),
      hasCommercialBias: this.hasCommercialBias(source.url),
      isOpinionPiece: this.isOpinionPiece(source.content),
      credibilityScore: Math.max(0, Math.min(100, score))
    };
  }

  private classifySourceType(domain: string, content: string): SourceCredibility['type'] {
    // Academic journals
    if (this.isAcademicDomain(domain)) return 'peer-reviewed';

    // Government sources
    if (domain.endsWith('.gov') || domain.endsWith('.edu')) return 'government';

    // News organizations
    if (this.isNewsDomain(domain)) return 'news';

    // Marketing/commercial
    if (this.isMarketingDomain(domain)) return 'marketing';

    // Blogs
    if (this.isBlogDomain(domain)) return 'blog';

    return 'unknown';
  }

  private ACADEMIC_DOMAINS = new Set([
    'pubmed.gov', 'arxiv.org', 'scholar.google.com',
    'nature.com', 'science.org', 'cell.com',
    'wiley.com', 'springer.com', 'elsevier.com',
    'jstor.org', 'sciencedirect.com'
  ]);

  private NEWS_DOMAINS = new Set([
    'reuters.com', 'ap.org', 'bbc.com', 'npr.org',
    'wsj.com', 'nytimes.com', 'economist.com',
    'ft.com', 'bloomberg.com'
  ]);

  private MARKETING_DOMAINS_PATTERNS = [
    /advertise/i, /marketing/i, /promotion/i,
    /buy-now/i, /shop/i, /store/i
  ];
}
```

### Consensus Detection

```typescript
class ConsensusDetector {
  /**
   * Determine if sources agree, disagree, or present nuanced view
   */
  detectConsensus(sources: SourceCredibility[], findings: Finding[]): Consensus {
    // Group by position
    const positions = this.extractPositions(findings);

    // Weight by credibility
    const weighted = positions.map(pos => ({
      position: pos,
      weight: this.calculateWeight(pos.sources, sources),
      count: pos.sources.length
    }));

    // Determine consensus type
    if (this.strongConsensus(weighted)) {
      return {
        type: 'strong-consensus',
        position: weighted[0].position,
        confidence: 0.9,
        summary: `Strong consensus (${weighted[0].weight}% weighted support)`
      };
    }

    if (this.moderateConsensus(weighted)) {
      return {
        type: 'moderate-consensus',
        position: weighted[0].position,
        confidence: 0.7,
        summary: `Moderate consensus with some dissent`,
        caveats: this.extractCaveats(weighted.slice(1))
      };
    }

    if (this.genuineDisagreement(weighted)) {
      return {
        type: 'genuine-disagreement',
        positions: weighted.map(w => w.position),
        confidence: 0.5,
        summary: `Genuine disagreement among credible sources`,
        breakdown: this.summarizePositions(weighted)
      };
    }

    return {
      type: 'insufficient-evidence',
      confidence: 0.2,
      summary: 'Not enough credible sources to determine consensus'
    };
  }

  private calculateWeight(sourcesForPosition: string[], allSources: SourceCredibility[]): number {
    const relevantSources = allSources.filter(s =>
      sourcesForPosition.includes(s.url)
    );

    const totalCredibility = relevantSources.reduce(
      (sum, s) => sum + s.credibilityScore,
      0
    );

    const maxPossible = allSources.reduce(
      (sum, s) => sum + s.credibilityScore,
      0
    );

    return (totalCredibility / maxPossible) * 100;
  }
}
```

---

## Negative Claim Verification

**Challenge:** How to research "No evidence exists" claims?

```typescript
class NegativeClaimVerifier {
  /**
   * Verify claims like "No studies support X" or "Nobody has found Y"
   */
  async verifyNegativeClaim(claim: string): Promise<VerificationResult> {
    // Extract what should be absent
    const expected = this.extractExpectation(claim);

    // Search FOR it (should find nothing if claim is true)
    const searchResult = await this.comprehensiveSearch(expected);

    if (searchResult.found) {
      return {
        verdict: 'false',
        confidence: 0.9,
        reasoning: `Found ${searchResult.count} examples contradicting "no evidence" claim`,
        examples: searchResult.examples.slice(0, 3)
      };
    }

    // No evidence found, but is that because:
    // A) It truly doesn't exist (claim is true), or
    // B) Our search wasn't comprehensive enough?

    const searchQuality = await this.assessSearchComprehensiveness(expected);

    if (searchQuality.comprehensive) {
      return {
        verdict: 'likely-true',
        confidence: 0.7,
        reasoning: `Comprehensive search found no contradicting evidence`,
        caveats: ['Absence of evidence is not evidence of absence',
                  'Limited to indexed sources']
      };
    }

    return {
      verdict: 'uncertain',
      confidence: 0.3,
      reasoning: `No contradicting evidence found, but search may not be comprehensive`,
      caveats: [`Searched: ${searchQuality.domainsSearched.join(', ')}`,
                'May exist in non-indexed sources']
    };
  }

  private async comprehensiveSearch(expected: ExpectedEvidence): Promise<SearchResult> {
    // Search multiple sources
    const searches = [
      perplexity.search(expected.academicQuery),
      perplexity.search(expected.newsQuery),
      perplexity.search(expected.generalQuery),
      this.searchGoogleScholar(expected.academicQuery),
      this.searchPubMed(expected.medicalQuery),
      this.searchSEC(expected.financialQuery)
    ];

    const results = await Promise.allSettled(searches);

    return this.aggregateSearchResults(results);
  }
}
```

---

## Specialized Research Strategies

### Strategy 1: Regulatory Data Search

```typescript
class RegulatoryResearcher {
  async searchRegulatory(issue: EpistemicIssue): Promise<ResearchResult> {
    const companyName = this.extractCompanyName(issue.text);
    const domain = this.identifyDomain(issue);

    const sources = {
      'investment': async () => this.searchSEC(companyName),
      'medical': async () => this.searchFDA(companyName),
      'environmental': async () => this.searchEPA(companyName),
      'general': async () => this.searchFTC(companyName)
    };

    const results = await sources[domain]();

    return {
      sources: results,
      quality: 'high', // Regulatory data is high quality
      findings: this.extractRegulatoryFindings(results),
      redFlags: this.identifyRegulatoryRedFlags(results)
    };
  }

  private async searchSEC(companyName: string): Promise<RegulatoryResult> {
    // Search SEC EDGAR database
    const queries = [
      `site:sec.gov/edgar ${companyName} annual report`,
      `site:sec.gov ${companyName} enforcement action`,
      `site:sec.gov ${companyName} litigation`
    ];

    const results = await Promise.all(queries.map(q => perplexity.search(q)));

    return {
      type: 'SEC',
      found: results.some(r => r.sources.length > 0),
      filings: this.extractFilings(results[0]),
      enforcementActions: this.extractEnforcement(results[1]),
      litigation: this.extractLitigation(results[2])
    };
  }

  private identifyRegulatoryRedFlags(results: RegulatoryResult): RedFlag[] {
    const flags: RedFlag[] = [];

    if (!results.found) {
      flags.push({
        type: 'no-regulatory-presence',
        severity: 'high',
        description: 'No SEC filings found - company may not be registered'
      });
    }

    if (results.enforcementActions?.length > 0) {
      flags.push({
        type: 'enforcement-history',
        severity: 'critical',
        description: `${results.enforcementActions.length} SEC enforcement actions found`,
        details: results.enforcementActions
      });
    }

    return flags;
  }
}
```

### Strategy 2: Academic Literature Search

```typescript
class AcademicResearcher {
  async searchAcademic(issue: EpistemicIssue): Promise<ResearchResult> {
    const scientificClaim = this.extractScientificClaim(issue.text);

    // Search multiple academic databases
    const results = await Promise.all([
      this.searchGoogleScholar(scientificClaim),
      this.searchPubMed(scientificClaim),
      this.searchArxiv(scientificClaim),
      this.searchCochrane(scientificClaim) // For medical claims
    ]);

    const papers = results.flat();

    // Assess evidence quality
    const evidenceQuality = this.assessEvidenceQuality(papers);

    return {
      sources: papers,
      quality: 'high',
      findings: {
        numberOfStudies: papers.length,
        evidenceQuality,
        consensus: this.detectConsensus(papers),
        metaAnalyses: papers.filter(p => p.type === 'meta-analysis'),
        rcts: papers.filter(p => p.type === 'RCT')
      }
    };
  }

  private assessEvidenceQuality(papers: AcademicPaper[]): EvidenceQuality {
    const qualityLevels = {
      'meta-analysis': 5,
      'systematic-review': 4,
      'RCT': 3,
      'cohort-study': 2,
      'case-control': 2,
      'case-report': 1,
      'opinion': 0
    };

    const highest = Math.max(...papers.map(p => qualityLevels[p.type] || 0));
    const average = papers.reduce((sum, p) => sum + (qualityLevels[p.type] || 0), 0) / papers.length;

    return {
      highestLevel: this.levelName(highest),
      averageLevel: average,
      totalStudies: papers.length,
      assessment: this.assessmentText(highest, papers.length)
    };
  }

  private assessmentText(highest: number, count: number): string {
    if (highest >= 4 && count >= 3) {
      return 'Strong evidence: Multiple high-quality studies including meta-analyses';
    }
    if (highest >= 3 && count >= 5) {
      return 'Moderate evidence: Several RCTs available';
    }
    if (highest >= 2 && count >= 10) {
      return 'Weak evidence: Many observational studies but no RCTs';
    }
    return 'Insufficient evidence: Limited research available';
  }
}
```

### Strategy 3: Investigative Research

```typescript
class InvestigativeResearcher {
  /**
   * Dig deeper when initial results are suspicious
   */
  async investigate(issue: EpistemicIssue, initialResults: ResearchResult): Promise<InvestigativeResult> {
    // Look for red flags
    const redFlagSearches = [
      this.searchForScams(issue),
      this.searchForComplaints(issue),
      this.searchForLitigation(issue),
      this.searchForCriticism(issue),
      this.searchForDebunking(issue)
    ];

    const redFlags = await Promise.all(redFlagSearches);

    // Look for conflicts of interest
    const conflicts = await this.investigateConflictsOfInterest(issue);

    // Check related entities
    const relatedEntities = await this.findRelatedEntities(issue);
    const relatedHistory = await this.investigateRelatedHistory(relatedEntities);

    return {
      redFlags: redFlags.flat(),
      conflicts,
      relatedEntities,
      relatedHistory,
      overallAssessment: this.synthesizeInvestigativeFindings(redFlags, conflicts, relatedHistory)
    };
  }

  private async searchForScams(issue: EpistemicIssue): Promise<RedFlag[]> {
    const entityName = this.extractEntityName(issue.text);

    const queries = [
      `"${entityName}" scam OR fraud OR complaint`,
      `"${entityName}" FTC OR SEC OR lawsuit`,
      `"${entityName}" warning OR alert`,
      `"${entityName}" "stay away" OR "don't use" OR "avoid"`
    ];

    const results = await Promise.all(queries.map(q => perplexity.search(q)));

    return results
      .filter(r => r.sources.length > 0)
      .map(r => ({
        type: 'negative-mentions',
        severity: 'high',
        description: `Found ${r.sources.length} results warning about entity`,
        sources: r.sources
      }));
  }

  private async investigateConflictsOfInterest(issue: EpistemicIssue): Promise<ConflictAnalysis> {
    // Who funded the research?
    const funding = await this.searchFunding(issue);

    // Who profits from this claim?
    const beneficiaries = this.identifyBeneficiaries(issue);

    // Are there undisclosed relationships?
    const relationships = await this.searchRelationships(beneficiaries);

    return {
      funding,
      beneficiaries,
      relationships,
      hasConflict: funding.source === beneficiaries[0] || relationships.length > 0,
      severity: this.assessConflictSeverity(funding, beneficiaries, relationships)
    };
  }
}
```

---

## Research Results Synthesis

### Combining Multiple Research Passes

```typescript
class ResearchSynthesizer {
  synthesize(results: ResearchResult[]): SynthesizedResearch {
    // Deduplicate sources
    const allSources = this.deduplicateSources(results.flatMap(r => r.sources));

    // Assess quality distribution
    const qualityBreakdown = this.assessQualityDistribution(allSources);

    // Detect consensus or disagreement
    const consensus = this.detectConsensus(allSources, results.flatMap(r => r.findings));

    // Identify most credible sources
    const topSources = this.rankByCredibility(allSources).slice(0, 5);

    // Generate overall assessment
    const assessment = this.generateAssessment(qualityBreakdown, consensus, topSources);

    return {
      totalSources: allSources.length,
      qualityBreakdown,
      consensus,
      topSources,
      assessment,
      recommendedAction: this.recommendAction(assessment)
    };
  }

  private generateAssessment(
    quality: QualityBreakdown,
    consensus: Consensus,
    topSources: Source[]
  ): Assessment {
    let verdict: string;
    let confidence: number;

    if (consensus.type === 'strong-consensus' && quality.highQuality > 0.7) {
      verdict = consensus.position;
      confidence = 0.9;
    } else if (consensus.type === 'moderate-consensus' && quality.highQuality > 0.5) {
      verdict = consensus.position;
      confidence = 0.7;
    } else if (consensus.type === 'genuine-disagreement') {
      verdict = 'disputed';
      confidence = 0.5;
    } else {
      verdict = 'insufficient-evidence';
      confidence = 0.3;
    }

    return {
      verdict,
      confidence,
      explanation: this.explainAssessment(verdict, confidence, quality, consensus),
      topSources: topSources.map(s => `${s.title} (${s.domain})`)
    };
  }

  private recommendAction(assessment: Assessment): RecommendedAction {
    if (assessment.confidence > 0.8) {
      return {
        action: 'strong-conclusion',
        message: `High confidence: ${assessment.verdict}`,
        reasoning: 'Multiple high-quality sources agree'
      };
    }

    if (assessment.confidence > 0.6) {
      return {
        action: 'moderate-conclusion',
        message: `Moderate confidence: ${assessment.verdict}`,
        reasoning: 'Some quality sources support this, but evidence has limitations'
      };
    }

    if (assessment.verdict === 'disputed') {
      return {
        action: 'acknowledge-dispute',
        message: 'This is genuinely disputed among experts',
        reasoning: 'Credible sources disagree - present multiple perspectives'
      };
    }

    return {
      action: 'flag-uncertainty',
      message: 'Insufficient evidence to draw conclusion',
      reasoning: 'Limited high-quality sources available'
    };
  }
}
```

---

## Integration with Fact-Check Plugin

### Epistemic → Fact-Check Handoff

```typescript
interface ResearchHandoff {
  from: 'epistemic-critic';
  to: 'fact-check';

  epistemicIssue: {
    type: EpistemicIssueType;
    claim: string;
    reasoning: string;
  };

  researchGuidance: {
    // What to look for
    verificationTarget: string;

    // How to search
    suggestedQueries: string[];
    expectedSourceTypes: string[];

    // What would confirm/disconfirm epistemic issue
    wouldConfirm: string;
    wouldDisconfirm: string;

    // Context from epistemic analysis
    suspicionLevel: 'high' | 'medium' | 'low';
    patterns: string[]; // Other related issues found
  };
}

// Example handoff
const handoff: ResearchHandoff = {
  from: 'epistemic-critic',
  to: 'fact-check',

  epistemicIssue: {
    type: 'survivorship-bias',
    claim: '90% of millionaires used our strategy',
    reasoning: 'Only examines millionaires (successes), ignores all who tried strategy and failed'
  },

  researchGuidance: {
    verificationTarget: 'Denominator: How many total people used this strategy?',

    suggestedQueries: [
      '[Company Name] total clients',
      '[Company Name] SEC filings client count',
      '[Company Name] success rate'
    ],

    expectedSourceTypes: [
      'SEC filings',
      'Regulatory disclosures',
      'Independent audits',
      'Court documents'
    ],

    wouldConfirm: 'No denominator found + pattern of similar survivorship-biased claims = high confidence manipulation',
    wouldDisconfirm: 'Denominator provided elsewhere in materials + success rate is actually good',

    suspicionLevel: 'high',
    patterns: [
      'Also found: Selection bias in user survey (Issue #5)',
      'Also found: Cherry-picked timeframe starting 2020 (Issue #3)',
      'Pattern: Systematic exclusion of negative data'
    ]
  }
};
```

---

## Configuration & Resource Management

```typescript
interface ResearchConfig {
  // Budget constraints
  budget: {
    maxTotalQueries: number;
    maxQueriesPerIssue: number;
    maxTokensForResearch: number;
    maxTimeMs: number;
  };

  // Research strategy
  strategy: {
    defaultMethod: 'quick' | 'standard' | 'deep';
    enableIterativeResearch: boolean;
    maxResearchPasses: number;
  };

  // Source preferences
  sources: {
    preferAcademic: boolean;
    preferRegulatory: boolean;
    minimumCredibilityScore: number;
    excludeDomains: string[];
  };

  // Quality thresholds
  quality: {
    minimumSourcesForConclusion: number;
    minimumCredibilityForHighConfidence: number;
    requireConsensusForStrongClaim: boolean;
  };
}
```

---

## Future Enhancements

### 1. Research Result Caching
Cache research results across documents:
```typescript
// If we researched "survivorship bias investment marketing" before,
// reuse those findings for similar issues
const cacheKey = this.generateCacheKey(issue);
const cached = await this.cache.get(cacheKey);
if (cached && !this.isStale(cached)) {
  return cached;
}
```

### 2. Collaborative Research
Multiple agents contribute to research:
```typescript
// Epistemic critic researches reasoning issues
// Fact-check researches factual claims
// Synthesis combines both perspectives
```

### 3. Learning from Research
Track which research strategies work best:
```typescript
{
  strategy: 'regulatory-first',
  successRate: 0.85,
  averageConfidence: 0.82,
  useCases: ['investment-claims', 'financial-advice']
}
```

Use to optimize future research decisions.
