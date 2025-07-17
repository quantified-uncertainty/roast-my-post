# Helicone Sessions Integration for RoastMyPost Jobs

## Executive Summary

This document explores integrating Helicone Sessions to track and trace AI workflow requests in the RoastMyPost job processing system. Helicone Sessions provide hierarchical tracing capabilities that would give us complete visibility into complex evaluation workflows, making debugging easier and providing valuable performance insights.

## Existing Helicone Integration

RoastMyPost already has basic Helicone integration configured:
- **Authentication**: Using `Helicone-Auth: Bearer ${HELICONE_API_KEY}` header
- **Base URL**: Routing Anthropic calls through `https://anthropic.helicone.ai`
- **Caching**: Optional cache support with configurable TTL and bucket size
- **Location**: Configured in `createAnthropicClient()` in `src/types/openai.ts`

What's missing:
- **Session tracking**: No session IDs or hierarchical paths
- **Workflow visibility**: Can't trace related LLM calls within a job
- **Retry correlation**: Can't link retry attempts to original jobs

## Current State Analysis

### Job System Architecture
- **Jobs**: Async processing units for document evaluations
- **Tasks**: Individual LLM calls within a job (stored separately)
- **Retries**: Jobs can have retries linked via `originalJobId`
- **Workflows**: Different analysis paths based on agent capabilities:
  - Comprehensive analysis (default)
  - Link analysis
  - Spelling/grammar checking
  - Multi-epistemic evaluation

### LLM Call Points
1. **generateComprehensiveAnalysis** - Main analysis generation
2. **extractHighlightsFromAnalysis** - Highlight extraction from analysis
3. **generateSelfCritique** - Optional self-critique generation
4. **Plugin-based calls** - Various specialized analyses (math, forecasting, etc.)

## Implementation Options

### Option 1: Job-Level Sessions (Recommended)
Each job gets its own session, with hierarchical paths for different phases.

```typescript
// Session structure:
sessionId: job.id
sessionName: `Evaluation: ${agent.name} on ${document.title}`
sessionPaths:
  - /analysis/comprehensive
  - /analysis/highlights
  - /analysis/self-critique
  - /analysis/plugins/math-check
  - /analysis/plugins/forecast
```

**Advantages:**
- Natural mapping to existing job structure
- Easy retry tracking (use originalJobId as sessionId for retries)
- Clear workflow visualization
- Simple to implement

**Implementation:**
```typescript
// In JobModel.processJob()
const sessionId = job.originalJobId || job.id; // Use original for retries
const sessionHeaders = {
  "Helicone-Session-Id": sessionId,
  "Helicone-Session-Name": `Eval: ${agentVersion.name} v${agentVersion.version}`,
  "Helicone-Session-Path": "/job/start"
};
```

### Option 2: Batch-Level Sessions
Group all jobs in a batch under one session.

```typescript
// Session structure:
sessionId: batch.id
sessionName: `Batch: ${batch.name}`
sessionPaths:
  - /batch/job-1/analysis
  - /batch/job-2/analysis
  - /batch/job-3/analysis
```

**Advantages:**
- See entire batch performance
- Compare jobs within batch
- Good for A/B testing agents

**Disadvantages:**
- Less granular than job-level
- Harder to debug individual jobs
- Session might get very large

### Option 3: Hybrid Approach
Use nested sessions - batch sessions contain job sessions.

```typescript
// Parent session (batch):
sessionId: batch.id
sessionName: `Batch: ${batch.name}`
sessionPath: /batch

// Child sessions (jobs):
sessionId: `${batch.id}-${job.id}`
sessionName: `Job: ${job.id}`
sessionPath: /batch/${batch.id}/job/${job.id}
```

## Detailed Implementation Plan

### 1. Create Helicone Headers Utility with Prompt Tracking
```typescript
// src/lib/helicone/sessions.ts
export interface HeliconeSessionConfig {
  sessionId: string;
  sessionName: string;
  sessionPath: string;
  customProperties?: Record<string, string>;
}

export function createHeliconeHeaders(config: HeliconeSessionConfig) {
  const headers: Record<string, string> = {
    "Helicone-Session-Id": config.sessionId,
    "Helicone-Session-Name": config.sessionName,
    "Helicone-Session-Path": config.sessionPath,
  };
  
  // Add custom properties for prompt-level tracking
  if (config.customProperties) {
    Object.entries(config.customProperties).forEach(([key, value]) => {
      headers[`Helicone-Property-${key}`] = value;
    });
  }
  
  return headers;
}

export function createJobSessionConfig(
  job: Job & { evaluation: { agent: Agent; document: Document } },
  path: string = "/job",
  promptId?: string,
  additionalProps?: Record<string, string>
): HeliconeSessionConfig {
  const sessionId = job.originalJobId || job.id;
  const { agent, document } = job.evaluation;
  
  return {
    sessionId,
    sessionName: `${agent.name} evaluating ${document.title.slice(0, 50)}`,
    sessionPath: path,
    customProperties: {
      ...(promptId && { PromptId: promptId }),
      AgentId: agent.id,
      AgentVersion: agent.version,
      DocumentId: document.id,
      JobAttempt: job.attempts.toString(),
      ...additionalProps
    }
  };
}
```

### 2. Modify LLM Call Wrappers for Prompt Tracking
```typescript
// src/lib/documentAnalysis/shared/llmUtils.ts
export async function callLLMWithSession(
  messages: Message[],
  sessionConfig: HeliconeSessionConfig,
  pathSuffix: string,
  promptId?: string,
  promptMetadata?: Record<string, string>,
  options?: LLMOptions
) {
  const headers = createHeliconeHeaders({
    ...sessionConfig,
    sessionPath: `${sessionConfig.sessionPath}${pathSuffix}`,
    customProperties: {
      ...sessionConfig.customProperties,
      ...(promptId && { PromptId: promptId }),
      ...promptMetadata
    }
  });
  
  // Add headers to OpenAI/Anthropic calls
  return await openai.chat.completions.create(
    { messages, ...options },
    { headers }
  );
}

// Update callClaude wrapper
export async function callClaude(
  options: ClaudeCallOptions,
  sessionConfig?: HeliconeSessionConfig
) {
  const headers = sessionConfig 
    ? createHeliconeHeaders(sessionConfig)
    : undefined;
  
  const anthropic = createAnthropicClient(headers);
  // ... rest of implementation
}
```

### 3. Thread Session Context Through Analysis with Prompt IDs
```typescript
// src/lib/documentAnalysis/analyzeDocument.ts
export async function analyzeDocument(
  document: Document,
  agentInfo: Agent,
  targetWordCount: number = 500,
  targetHighlights: number = 5,
  sessionConfig?: HeliconeSessionConfig
) {
  // Main analysis with prompt ID
  const analysisResult = await generateComprehensiveAnalysis(
    document,
    agentInfo,
    targetWordCount,
    targetHighlights,
    {
      ...sessionConfig,
      customProperties: {
        ...sessionConfig?.customProperties,
        PromptId: "comprehensive-analysis-main",
        PromptType: "analysis",
        TargetWordCount: targetWordCount.toString()
      }
    }
  );
  
  // Highlight extraction with its own prompt ID
  const highlightResult = await extractHighlightsFromAnalysis(
    document,
    agentInfo,
    analysisResult.outputs,
    targetHighlights,
    {
      ...sessionConfig,
      sessionPath: sessionConfig.sessionPath + "/highlights",
      customProperties: {
        ...sessionConfig?.customProperties,
        PromptId: "extract-highlights",
        PromptType: "highlight-extraction",
        TargetHighlights: targetHighlights.toString()
      }
    }
  );
  
  // Self-critique with prompt ID
  if (agentInfo.selfCritiqueInstructions) {
    const critiqueResult = await generateSelfCritique(
      analysisOutputs,
      agentInfo,
      {
        ...sessionConfig,
        sessionPath: sessionConfig.sessionPath + "/self-critique",
        customProperties: {
          ...sessionConfig?.customProperties,
          PromptId: "self-critique",
          PromptType: "critique"
        }
      }
    );
  }
}
```

### 4. Hierarchical Path Structure
```
/job
├── /analysis
│   ├── /comprehensive      # Main analysis
│   ├── /highlights         # Highlight extraction
│   └── /self-critique      # Self-critique
├── /plugins
│   ├── /math-check         # Math verification
│   ├── /forecast           # Forecasting claims
│   ├── /fact-check         # Fact checking
│   └── /spelling-grammar   # Spelling/grammar
└── /retry-{n}             # For retry attempts
    └── (same structure)
```

## Integration Points

### 1. Job Processing Entry Point
```typescript
// src/models/Job.ts
async processJob(job: PrismaJob & {...}) {
  const sessionConfig = createJobSessionConfig(job);
  
  // Log job start
  await logToHelicone(sessionConfig, "/job/start", { 
    jobId: job.id,
    agentId: job.evaluation.agent.id,
    documentId: job.evaluation.document.id
  });
  
  try {
    const analysisResult = await analyzeDocument(
      documentForAnalysis,
      agent,
      500, // targetWordCount
      5,   // targetHighlights
      sessionConfig // Pass session config
    );
    
    // Log success
    await logToHelicone(sessionConfig, "/job/complete", {
      duration: Date.now() - startTime,
      tokensUsed: totalTokens
    });
  } catch (error) {
    // Log failure
    await logToHelicone(sessionConfig, "/job/failed", {
      error: error.message,
      duration: Date.now() - startTime
    });
  }
}
```

### 2. Plugin System Integration with Prompt Tracking
```typescript
// src/lib/documentAnalysis/plugin-system/BasePlugin.ts
export abstract class BasePlugin {
  protected sessionConfig?: HeliconeSessionConfig;
  
  constructor(sessionConfig?: HeliconeSessionConfig) {
    this.sessionConfig = sessionConfig;
  }
  
  protected async callLLM(
    prompt: string, 
    path: string,
    promptId: string,
    metadata?: Record<string, string>
  ) {
    if (this.sessionConfig) {
      return callLLMWithSession(
        [{ role: "user", content: prompt }],
        this.sessionConfig,
        `/plugins/${this.name}${path}`,
        promptId,
        {
          PluginName: this.name,
          PluginVersion: this.version,
          ...metadata
        }
      );
    }
    // Fallback to regular LLM call
    return this.regularLLMCall(prompt);
  }
}

// Example: SpellingPlugin processing chunks
export class SpellingPlugin extends BasePlugin {
  async analyzeChunks(chunks: TextChunk[]) {
    const results = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const promptId = `spelling-check-chunk-${i}`;
      
      const result = await this.callLLM(
        this.buildChunkPrompt(chunk),
        `/chunk-${i}`,
        promptId,
        {
          ChunkIndex: i.toString(),
          ChunkCount: chunks.length.toString(),
          ChunkStartLine: chunk.startLine.toString(),
          ChunkEndLine: chunk.endLine.toString(),
          ChunkLength: chunk.text.length.toString()
        }
      );
      
      results.push(result);
    }
    
    return results;
  }
}

// Example: MathPlugin verifying equations
export class MathPlugin extends BasePlugin {
  async verifyEquations(equations: string[]) {
    const verifications = [];
    
    for (let i = 0; i < equations.length; i++) {
      const equation = equations[i];
      const promptId = `math-verify-equation-${i}`;
      
      const result = await this.callLLM(
        this.buildVerificationPrompt(equation),
        `/equation-${i}`,
        promptId,
        {
          EquationIndex: i.toString(),
          EquationLength: equation.length.toString(),
          EquationType: this.detectEquationType(equation)
        }
      );
      
      verifications.push(result);
    }
    
    return verifications;
  }
}
```

## Benefits & Use Cases

### 1. Debugging Complex Workflows with Prompt-Level Detail
- Trace exact LLM call sequence for failed evaluations
- Identify which specific prompt (e.g., "spelling-check-chunk-7") is causing issues
- See complete retry chains with prompt IDs preserved across attempts
- Debug parallel processing issues in spelling/grammar checks

### 2. Performance Optimization by Prompt Type
- Identify slowest prompts: "Math verification takes 3x longer than other plugins"
- Compare performance across different prompt versions
- Track token usage patterns by specific prompt IDs
- Optimize chunk sizes based on per-chunk processing times

### 3. Cost Analysis with Granular Attribution
- Breakdown costs by specific prompts within each phase
- Example insights:
  - "Equation verification prompts cost $0.05 each"
  - "Chunk 7-10 in spelling checks consistently use 2x more tokens"
  - "Self-critique prompts are 30% of total job cost"
- Optimize expensive prompt templates

### 4. Quality Monitoring and A/B Testing
- Correlate specific prompt IDs with evaluation quality
- A/B test different prompt versions:
  ```
  PromptId: "comprehensive-analysis-v2"
  PromptVersion: "2.1"
  ExperimentGroup: "detailed-instructions"
  ```
- Track which chunks consistently find more issues
- Monitor prompt effectiveness over time

## Implementation Priority

1. **Phase 1: Core Integration** (Week 1)
   - Add Helicone headers utility
   - Integrate with main job processing
   - Basic path structure (/job/analysis, /job/complete)

2. **Phase 2: Workflow Integration** (Week 2)
   - Thread session config through analysis functions
   - Add paths for each analysis phase
   - Integrate with retry mechanism

3. **Phase 3: Plugin Integration** (Week 3)
   - Add session support to plugin system
   - Create hierarchical paths for each plugin
   - Add custom metadata (token counts, etc.)

4. **Phase 4: Monitoring & Dashboards** (Week 4)
   - Create Helicone dashboard views
   - Set up alerts for failed sessions
   - Build cost analysis reports

## Configuration & Environment

```env
# Add to .env
HELICONE_API_KEY=your-key-here
HELICONE_ENABLED=true
HELICONE_BASE_URL=https://api.helicone.ai/v1
```

```typescript
// src/config/helicone.ts
export const heliconeConfig = {
  enabled: process.env.HELICONE_ENABLED === 'true',
  apiKey: process.env.HELICONE_API_KEY,
  baseUrl: process.env.HELICONE_BASE_URL || 'https://api.helicone.ai/v1',
  
  // Feature flags
  features: {
    sessions: true,
    customMetadata: true,
    costTracking: true,
  }
};
```

## Testing Strategy

1. **Unit Tests**: Mock Helicone headers in LLM calls
2. **Integration Tests**: Verify session structure in test jobs
3. **E2E Tests**: Full job processing with session tracking
4. **Manual Testing**: Use Helicone dashboard to verify traces

## Rollout Plan

1. **Dev Environment**: Full integration, test all workflows
2. **Staging**: Limited rollout, monitor performance impact
3. **Production**: Gradual rollout by job percentage
4. **Full Production**: Enable for all jobs

## Real-World Examples

### Example 1: Spelling/Grammar Check Session
```
Session: job-123
├── /job/analysis/spelling-grammar
│   ├── /chunk-0 [PromptId: spelling-check-chunk-0, ChunkLines: 1-50]
│   ├── /chunk-1 [PromptId: spelling-check-chunk-1, ChunkLines: 51-100]
│   ├── /chunk-2 [PromptId: spelling-check-chunk-2, ChunkLines: 101-150]
│   └── /chunk-3 [PromptId: spelling-check-chunk-3, ChunkLines: 151-200]
└── /job/complete
```

### Example 2: Multi-Plugin Evaluation
```
Session: job-456
├── /job/analysis/comprehensive [PromptId: comprehensive-analysis-main]
├── /job/analysis/highlights [PromptId: extract-highlights]
├── /job/plugins/math-check
│   ├── /equation-0 [PromptId: math-verify-equation-0]
│   ├── /equation-1 [PromptId: math-verify-equation-1]
│   └── /equation-2 [PromptId: math-verify-equation-2]
├── /job/plugins/fact-check
│   └── /claims [PromptId: fact-check-all-claims]
└── /job/analysis/self-critique [PromptId: self-critique]
```

### Example 3: Retry with Prompt Tracking
```
Session: job-789 (originalJobId: job-789)
├── /job/retry-1
│   ├── /analysis/comprehensive [PromptId: comprehensive-analysis-main]
│   ├── /analysis/highlights [PromptId: extract-highlights]
│   └── /job/failed [Error: timeout on highlight extraction]
├── /job/retry-2
│   ├── /analysis/comprehensive [PromptId: comprehensive-analysis-main, cached]
│   ├── /analysis/highlights [PromptId: extract-highlights-retry]
│   └── /job/complete
```

## Monitoring & Success Metrics

- **Session Creation Rate**: 100% of jobs should have sessions
- **Prompt ID Coverage**: Every LLM call should have a unique prompt ID
- **Path Coverage**: All analysis phases should have paths
- **Performance Impact**: <1% latency increase from headers
- **Debugging Time**: 50% reduction in evaluation debugging time
- **Cost Visibility**: 100% of LLM costs traceable to specific prompts
- **Prompt Performance**: Identify slowest 10% of prompts for optimization

## Future Enhancements

1. **Prompt Versioning**: Track prompt template versions
   ```
   PromptId: "comprehensive-analysis-main"
   PromptVersion: "2.3.1"
   PromptHash: "abc123..." // Hash of actual prompt template
   ```

2. **Session Linking**: Link related evaluations
   ```
   RelatedSessionId: "job-123" // Previous evaluation of same document
   SessionGroup: "document-456-evaluations"
   ```

3. **Batch Analytics**: Aggregate prompt performance across batches
   - "Average tokens for spelling-check-chunk-* prompts"
   - "Success rate by prompt type"

4. **Real-time Monitoring**: Stream session events
   - Alert on prompt failures
   - Track prompt latency in real-time

5. **Cost Budgets**: Set limits at prompt level
   ```
   MaxCostPerPrompt: 0.10
   MaxTokensPerPrompt: 4000
   AlertThreshold: 0.08
   ```

6. **Prompt Template Management**
   - Store prompt templates with versions
   - A/B test different prompt versions
   - Automatic rollback on performance degradation