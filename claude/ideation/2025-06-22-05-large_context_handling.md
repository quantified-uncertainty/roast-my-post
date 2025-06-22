<!-- Created: 2025-06-22 11:41:52 -->
# Handling Large Context in Agent Improvement

## The Problem
- Full evaluation exports can be 100k-400k tokens
- Each eval includes: document content, analysis, comments, LLM interactions
- 20 evaluations × 20k tokens each = 400k tokens
- Most LLMs have context limits (Claude 3: 200k, GPT-4: 128k)
- Even with large context, quality degrades with too much data

## Strategies for Context Reduction

### 1. Smart Sampling
Instead of all evaluations, select representative samples:

```typescript
async function selectRepresentativeEvals(batchId: string) {
  const evals = await getEvaluations(batchId);
  
  return {
    // Performance distribution
    highPerformers: evals.filter(e => e.grade >= 85).slice(0, 2),
    midPerformers: evals.filter(e => e.grade >= 70 && e.grade < 85).slice(0, 2),
    lowPerformers: evals.filter(e => e.grade < 70).slice(0, 2),
    
    // Failure cases
    failed: evals.filter(e => e.job.status === 'FAILED').slice(0, 2),
    
    // Edge cases
    mostComments: evals.sort((a, b) => b.comments.length - a.comments.length).slice(0, 1),
    leastComments: evals.sort((a, b) => a.comments.length - b.comments.length).slice(0, 1),
  };
}
```

### 2. Progressive Summarization
Summarize evaluations before sending to improvement LLM:

```typescript
async function createEvalSummary(evalId: string) {
  const eval = await getFullEvaluation(evalId);
  
  // First pass: Summarize with smaller model
  const summary = await summarizeWithClaude({
    model: 'claude-3-haiku', // Faster, cheaper
    content: eval,
    maxTokens: 500
  });
  
  return {
    docTitle: eval.document.title,
    grade: eval.grade,
    keySummary: summary,
    commentHighlights: eval.comments.slice(0, 3).map(c => c.title),
    uniqueInsights: extractUniquePoints(eval.analysis)
  };
}
```

### 3. Focused Analysis Modes
Different modes for different improvement goals:

```typescript
enum AnalysisMode {
  GRADING_CONSISTENCY = 'grading',    // Focus on grade distribution
  COMMENT_QUALITY = 'comments',        // Focus on comment relevance
  COVERAGE = 'coverage',               // Focus on missed topics
  TONE = 'tone',                       // Focus on writing style
  EFFICIENCY = 'efficiency'            // Focus on verbosity
}

async function exportForMode(batchId: string, mode: AnalysisMode) {
  switch(mode) {
    case AnalysisMode.GRADING_CONSISTENCY:
      return {
        grades: await getGradeDistribution(batchId),
        gradingExamples: await getGradingExtremes(batchId),
        instructions: agent.gradeInstructions
      };
    
    case AnalysisMode.COMMENT_QUALITY:
      return {
        commentStats: await getCommentStats(batchId),
        goodComments: await getBestComments(batchId, 10),
        weakComments: await getWeakComments(batchId, 10),
        instructions: agent.commentInstructions
      };
  }
}
```

### 4. Incremental Improvement
Instead of analyzing everything at once:

```typescript
async function incrementalImprovement(agentId: string) {
  const issues = await identifyTopIssues(agentId);
  
  // Focus on one issue at a time
  for (const issue of issues) {
    const focusedData = await exportFocusedData(agentId, issue);
    const improvement = await suggestImprovement(focusedData);
    
    // Test improvement on small set
    await testImprovement(agentId, improvement, sampleSize: 5);
  }
}
```

### 5. Statistical Aggregation
Replace raw data with statistics:

```typescript
interface AggregatedBatchData {
  evalCount: number;
  gradeStats: {
    mean: number;
    median: number;
    stdDev: number;
    distribution: Record<string, number>; // "0-60": 2, "61-70": 5, etc
  };
  commentStats: {
    avgPerDoc: number;
    totalUnique: number;
    mostCommonThemes: string[];
  };
  documentTypes: {
    technical: number;
    opinion: number;
    news: number;
  };
  problemPatterns: {
    pattern: string;
    frequency: number;
    examples: string[]; // Just 2-3 examples
  }[];
}
```

### 6. Two-Stage Analysis
Use Claude Code for first-pass analysis:

```typescript
// Stage 1: Claude Code analyzes full data locally
async function stage1Analysis(batchId: string) {
  const fullData = await exportBatchData(batchId);
  
  // Local analysis (no token limits)
  const patterns = identifyPatterns(fullData);
  const issues = categorizeIssues(fullData);
  const metrics = calculateMetrics(fullData);
  
  // Create focused summary
  return createFocusedSummary(patterns, issues, metrics);
}

// Stage 2: Send focused summary to Claude/GPT-4 for improvements
async function stage2Improvement(summary: FocusedSummary) {
  return await claude.createMessage({
    messages: [{
      role: 'user',
      content: `Based on this analysis, suggest specific instruction improvements:\n${summary}`
    }]
  });
}
```

### 7. Context-Aware Chunking
For unavoidably large contexts:

```typescript
async function chunkAnalysis(batchId: string) {
  const chunks = await splitIntoChunks(batchId, maxTokens: 50000);
  
  // Analyze each chunk
  const chunkAnalyses = await Promise.all(
    chunks.map(chunk => analyzeChunk(chunk))
  );
  
  // Synthesize findings
  return synthesizeFindings(chunkAnalyses);
}
```

## Practical Implementation

### For Your Workflow:
1. **Default to sampling**: "Analyze these 6 representative evals instead of all 30"
2. **Use modes**: "Focus on grading consistency" vs trying to improve everything
3. **Statistical summaries**: "Show me grade distribution and comment patterns"
4. **Progressive refinement**: Fix one issue, test, then move to next

### Quick Scripts:
```bash
# Focused export
npm run export-agent-analysis --mode=grading --sample=6

# Statistical summary only  
npm run agent-stats <agent-id> <batch-id>

# Two-stage improvement
npm run analyze-local <batch-id> | npm run suggest-improvements
```

## Token Estimation Formula
```typescript
function estimateTokens(batch: Batch) {
  const perEval = {
    document: 2000,      // Average document
    analysis: 3000,      // Agent's analysis
    comments: 500,       // Comments
    metadata: 200,       // Job data, etc
    llmInteraction: 5000 // If included
  };
  
  const baseTokens = 5700; // Without LLM interactions
  const withLLM = 10700;   // With LLM interactions
  
  return {
    minimal: batch.size * baseTokens * 0.1,  // 10% sample
    standard: batch.size * baseTokens * 0.3, // 30% sample  
    full: batch.size * withLLM,              // Everything
  };
}
```

This approach ensures you can effectively improve agents even with massive evaluation datasets.