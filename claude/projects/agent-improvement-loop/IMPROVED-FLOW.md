# Improved Agent Evaluation Flow

## Current Limitations

The current system relies heavily on regex pattern matching:
- ✅ Fast and deterministic
- ✅ Good for format compliance
- ❌ Can't assess actual insight quality
- ❌ Misses semantic understanding
- ❌ Rewards superficial compliance

## Proposed Multi-Stage Evaluation Flow

### Stage 1: Quick Filter (Regex) - Keep This
```typescript
// Fast pre-check for basic compliance
const quickScore = {
  hasRequiredSections: checkRegexPatterns(output),
  meetsMinLength: output.length > 500,
  hasCommentTypes: detectCommentTypes(output)
};

if (quickScore.total < 0.3) {
  return { score: quickScore.total, skip_expensive_eval: true };
}
```

### Stage 2: Semantic Quality Assessment (New LLM Layer)

```typescript
interface QualityDimensions {
  insightNovelty: number;      // Are these insights non-obvious?
  argumentDepth: number;        // Beyond surface-level?
  evidenceQuality: number;      // Properly sourced and evaluated?
  actionability: number;        // Can reader do something with this?
  audienceCalibration: number;  // Appropriate for the context?
}

async function assessSemanticQuality(
  evaluation: string,
  document: string,
  config: DesiderataConfig
): Promise<QualityDimensions> {
  const prompt = `
    Assess the quality of this evaluation on these dimensions:
    
    1. INSIGHT NOVELTY (0-1): Would a smart EA/rationalist reader find these insights surprising?
    2. ARGUMENT DEPTH (0-1): Does it go beyond obvious surface observations?
    3. EVIDENCE QUALITY (0-1): Are claims properly interrogated, not just repeated?
    4. ACTIONABILITY (0-1): Could someone improve their reasoning based on this?
    5. AUDIENCE CALIBRATION (0-1): Is the critique appropriate for the document type?
    
    Evaluation to assess:
    ${evaluation}
    
    Original document:
    ${document}
    
    Return JSON scores with brief justifications.
  `;
  
  // Use Claude 4 as specified in CLAUDE.md
  return await callLLM(prompt, { model: 'claude-4-opus-20241022' });
}
```

### Stage 3: Comparative Ranking (New)

Instead of absolute scoring, compare outputs:

```typescript
async function comparativeEvaluation(
  evaluations: EvaluationResult[],
  document: string
): Promise<RankingResult> {
  const prompt = `
    Rank these evaluations of the same document from best to worst.
    Consider: insight quality, usefulness, depth, and specificity.
    
    ${evaluations.map((e, i) => `
    EVALUATION ${i + 1}:
    ${e.content}
    `).join('\n---\n')}
    
    Return ranking with specific reasons why each is better/worse than others.
  `;
  
  return await callLLM(prompt);
}
```

### Stage 4: Targeted Improvement Suggestions (New)

Replace generic "add more X" with specific improvements:

```typescript
async function generateTargetedImprovements(
  evaluation: string,
  qualityScores: QualityDimensions,
  examples: GoodExample[]
): Promise<SpecificImprovements> {
  const prompt = `
    This evaluation scored:
    - Insight Novelty: ${qualityScores.insightNovelty}/1
    - Argument Depth: ${qualityScores.argumentDepth}/1
    
    Lowest scoring area: ${getLowestDimension(qualityScores)}
    
    Here's a high-scoring example in that dimension:
    ${examples.find(e => e.dimension === getLowestDimension(qualityScores))}
    
    Suggest 2-3 SPECIFIC improvements to the agent instructions that would improve
    the lowest-scoring dimension. Be concrete - suggest exact text to add/modify.
  `;
  
  return await callLLM(prompt);
}
```

## Improved Desiderata Configuration

```typescript
interface ImprovedDesiderata {
  // Keep regex patterns for format checking
  formatRequirements: RegexRequirement[];
  
  // Add semantic requirements evaluated by LLM
  qualityRequirements: {
    dimension: 'novelty' | 'depth' | 'evidence' | 'actionability';
    weight: number;
    minScore: number;
    examplePool: string[]; // IDs of high-quality examples
  }[];
  
  // Comparative benchmarks
  benchmarks: {
    baselineAgentId: string; // Must beat this agent
    goldStandardEvals: string[]; // Aspire to match these
  };
}
```

## Improved Analysis Pipeline

```typescript
async function improvedAnalyzeResults(
  evaluations: any[],
  config: ImprovedDesiderata
): Promise<ImprovedAnalysisResult> {
  const results = [];
  
  for (const evaluation of evaluations) {
    // Stage 1: Quick format check (existing)
    const formatScore = checkFormatCompliance(evaluation, config.formatRequirements);
    
    // Stage 2: Semantic quality (new)
    const qualityScores = await assessSemanticQuality(
      evaluation.content,
      evaluation.document,
      config
    );
    
    // Stage 3: Extract specific examples of good/bad patterns
    const examples = await extractPatternExamples(evaluation, qualityScores);
    
    results.push({
      evaluation,
      formatScore,
      qualityScores,
      examples,
      overallScore: calculateWeightedScore(formatScore, qualityScores, config)
    });
  }
  
  // Stage 4: Comparative ranking
  const ranking = await comparativeEvaluation(results, config);
  
  // Stage 5: Generate improvements based on worst performers
  const improvements = await generateTargetedImprovements(
    results,
    ranking,
    config.qualityRequirements
  );
  
  return {
    scores: results,
    ranking,
    improvements,
    specificExamplesToEmulate: extractBestExamples(results),
    specificPatternsToAvoid: extractWorstPatterns(results)
  };
}
```

## Cost Optimization Strategies

1. **Sampling**: Don't evaluate every output with LLM
   ```typescript
   const samplesToEvaluate = selectDiverseSample(evaluations, 5);
   ```

2. **Staged Evaluation**: Only do expensive evals if cheap ones pass
   ```typescript
   if (formatScore < 0.5) return skipExpensiveEval();
   ```

3. **Caching**: Store quality assessments of common patterns
   ```typescript
   const cachedScore = await checkQualityCache(hashContent(evaluation));
   ```

4. **Model Selection**: Use appropriate models
   - Format checking: Regex (free)
   - Quality assessment: Claude 4 (as per CLAUDE.md)
   - Improvement generation: Claude 4 (always use Claude 4)

## Example Improvement Loop

```typescript
async function improvedAgentLoop(config: ImprovedConfig) {
  let agent = await loadAgent(config.startingAgent);
  const testDocs = await loadDocuments(config.testDocumentIds);
  
  for (let iteration = 0; iteration < config.maxIterations; iteration++) {
    // Run evaluation
    const batch = await createExperiment(agent, testDocs);
    const evaluations = await waitForCompletion(batch);
    
    // Multi-stage analysis
    const analysis = await improvedAnalyzeResults(evaluations, config);
    
    // Generate specific improvements
    const improvements = await generateSpecificImprovements(analysis);
    
    // Apply improvements
    agent = await applyImprovements(agent, improvements);
    
    // Human review of specific examples
    const decision = await askClaude({
      prompt: `
        Compare these specific examples:
        BEFORE: ${analysis.worstExamples}
        AFTER: ${analysis.bestExamples}
        
        The improvements suggest: ${improvements.summary}
        
        Should we KEEP, MODIFY, or STOP?
      `,
      context: analysis
    });
    
    if (decision.action === 'STOP') break;
  }
}
```

## Key Improvements

1. **Semantic Understanding**: LLMs evaluate actual insight quality, not just format
2. **Comparative Evaluation**: Rank outputs relative to each other and benchmarks
3. **Specific Improvements**: "Add this exact instruction" vs "improve clarity"
4. **Example-Driven**: Show specific good/bad examples from actual evaluations
5. **Cost-Conscious**: Use cheap models for bulk evaluation, expensive for generation
6. **Pattern Library**: Build up examples of what works/doesn't work

This approach would catch issues like:
- Beautiful formatting but shallow insights
- All required sections present but saying nothing new
- Correct emoji usage but missing the document's point
- Following the template but not adapting to document type

The key insight: **Combine fast pattern matching for basic filtering with selective LLM evaluation for quality assessment**.