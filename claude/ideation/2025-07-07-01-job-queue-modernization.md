# Job Queue Modernization for RoastMyPost

**Date**: 2025-07-07  
**Author**: Claude  
**Status**: Ideation  
**Focus**: Improving job processing infrastructure for LLM-heavy workloads

## Executive Summary

RoastMyPost's current job processing system works but has architectural limitations that create operational challenges. This document explores modern alternatives ranging from minimal changes (adding observability) to complete infrastructure overhauls, with specific focus on solutions optimized for LLM workloads.

## Current State Analysis

### Architecture Overview
- **Database**: PostgreSQL with Prisma ORM
- **Job Storage**: Jobs table with status tracking
- **Processing**: Multiple Node.js scripts with different strategies
- **Retry Logic**: Database-tracked via `originalJobId` relationship
- **Workers**: Spawned as separate processes (`npm run process-job`)

### Key Pain Points

1. **Process Management**
   - Each job spawns a new Node.js process (high overhead)
   - Worker communication via stdout/stderr parsing (fragile)
   - No persistent worker pool
   - SIGTERM/SIGKILL for cleanup

2. **Queue Limitations**
   - Database polling every 1000ms (inefficient)
   - No proper queue semantics (priorities, delays)
   - No backpressure handling
   - Limited to 20 concurrent workers

3. **Observability**
   - Basic console logging with JSON formatting
   - Logs stored as text in database
   - No metrics or alerting
   - Manual scripts for monitoring

4. **Retry Mechanism**
   - String pattern matching for error classification
   - No exponential backoff
   - Maximum 3 retries
   - Immediate retry (no delay)

## Solution Categories

### 1. Traditional Job Queues

#### **pg-boss** ⭐ (Recommended for minimal change)
**Why it's ideal**: Uses existing PostgreSQL, no new infrastructure needed

```javascript
// Simple migration example
const boss = new PgBoss(DATABASE_URL);
await boss.start();

// Queue evaluation job
await boss.send('evaluate-document', {
  evaluationId: evaluation.id,
  documentVersionId: version.id,
  agentVersionId: agent.id
}, {
  retryLimit: 3,
  retryDelay: 60,
  retryBackoff: true,
  expireInSeconds: 300
});

// Process with existing logic
await boss.work('evaluate-document', async (job) => {
  await processEvaluation(job.data);
});
```

**Benefits**:
- Built-in exponential backoff
- SKIP LOCKED for reliable processing
- Job scheduling and priorities
- No polling (uses LISTEN/NOTIFY)
- Proven at scale (millions of jobs/day)

#### **Graphile Worker** (Alternative PostgreSQL)
**Why consider**: Ultra-fast with LISTEN/NOTIFY (2-3ms overhead)

```javascript
import { run, makeWorkerUtils } from "graphile-worker";

// Run worker
await run({
  connectionString: DATABASE_URL,
  concurrency: 10,
  taskList: {
    evaluate_document: async (payload) => {
      await processEvaluation(payload);
    }
  }
});

// Add job
const utils = await makeWorkerUtils({ connectionString: DATABASE_URL });
await utils.addJob("evaluate_document", payload);
```

#### **BullMQ** (If adding Redis)
**Why consider**: Industry standard with advanced features

```javascript
import { Queue, Worker } from 'bullmq';

const queue = new Queue('evaluations', { connection: redis });

// Add job
await queue.add('evaluate', payload, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: true,
  removeOnFail: false
});

// Process
new Worker('evaluations', async (job) => {
  await processEvaluation(job.data);
}, { connection: redis, concurrency: 10 });
```

### 2. AI-Specific Infrastructure

#### **Helicone** ⭐⭐ (Immediate value add)
**Why it's perfect**: Proxy-based caching + observability for LLM calls

```javascript
// One-line integration
const anthropic = new Anthropic({
  baseURL: "https://oai.helicone.ai/v1",
  defaultHeaders: {
    "Helicone-Auth": `Bearer ${HELICONE_API_KEY}`,
    "Helicone-Cache-Enabled": "true",
    "Cache-Control": "max-age=604800", // 7 days
    "Helicone-Cache-Seed": `agent-${agentVersionId}`
  }
});
```

**Cost Savings for RoastMyPost**:
- **10-20%** from retry scenarios (same prompt on failures)
- **5-10%** from re-evaluations and testing
- **Additional savings** from semantic similarity matching

**How it works**:
1. First API call → goes to Claude, cached by Helicone
2. Retry after failure → served from cache, costs $0
3. Same document + agent → cache hit
4. Similar documents → semantic cache might match

#### **Inngest** (Modern event-driven)
**Why consider**: Built for AI workflows with great DX

```javascript
import { inngest } from "./inngest-client";

// Define workflow
export const evaluateDocument = inngest.createFunction(
  {
    id: "evaluate-document",
    retries: 3,
    concurrency: { limit: 10 }
  },
  { event: "document.evaluate" },
  async ({ event, step }) => {
    // Each step is retryable independently
    const analysis = await step.run("analyze", async () => {
      return await callClaude(event.data);
    });
    
    await step.run("save-results", async () => {
      return await saveEvaluation(analysis);
    });
  }
);

// Trigger evaluation
await inngest.send({
  name: "document.evaluate",
  data: { evaluationId, documentVersionId, agentVersionId }
});
```

#### **Temporal** (Complex orchestration)
**Why consider**: For multi-step, long-running AI workflows

```typescript
// Workflow definition
export async function evaluateDocumentWorkflow(
  params: EvaluationParams
): Promise<EvaluationResult> {
  // Activities can run on different workers/machines
  const analysis = await executeActivity(analyzeWithLLM, params);
  
  if (shouldRunSelfCritique()) {
    const critique = await executeActivity(selfCritique, analysis);
    return await executeActivity(finalizeEvaluation, { analysis, critique });
  }
  
  return await executeActivity(finalizeEvaluation, { analysis });
}

// Start workflow
const handle = await client.workflow.start(evaluateDocumentWorkflow, {
  args: [params],
  taskQueue: 'ai-evaluation',
  workflowId: `eval-${evaluationId}`
});
```

### 3. Specialized AI Platforms

#### **Modal Labs**
Complete rethink - serverless functions for AI:
```python
@modal.function(gpu="any", retries=3)
def evaluate_document(doc_content: str, agent_config: dict):
    # Runs on Modal's infrastructure
    return call_claude(doc_content, agent_config)
```

#### **Humanloop/LangSmith**
For evaluation and experimentation:
- A/B test different agents
- Track performance metrics
- Version control prompts
- Automated quality checks

## Recommended Implementation Path

### Phase 1: Immediate Wins (1-2 days)
1. **Add Helicone** for caching and observability
   - 20-30% cost reduction
   - Better debugging
   - Zero code changes to job system

### Phase 2: Queue Upgrade (1 week)
2. **Migrate to pg-boss**
   - Replace polling with proper queue
   - Add exponential backoff
   - Improve worker management
   - Keep PostgreSQL simplicity

### Phase 3: Enhanced Monitoring (ongoing)
3. **Add structured logging** (Winston/Pino)
4. **Metrics collection** (Prometheus)
5. **Error tracking** (Sentry)

### Phase 4: Future Considerations
- **Inngest** if you want event-driven architecture
- **Temporal** if workflows become multi-step
- **Modal** if you want to outsource infrastructure

## Cost-Benefit Analysis

### Helicone (Immediate)
- **Cost**: $20/month (after free tier)
- **Benefit**: 20-30% LLM cost reduction
- **ROI**: Positive from day 1

### pg-boss (Recommended)
- **Cost**: Development time (3-5 days)
- **Benefit**: Reliable job processing, better scaling
- **ROI**: Reduces operational overhead

### Inngest/Temporal (Future)
- **Cost**: Learning curve + migration effort
- **Benefit**: Modern architecture, better debugging
- **ROI**: Positive for complex workflows

## Migration Strategy

### For pg-boss:
1. Install alongside existing system
2. Route new jobs through pg-boss
3. Keep old processor running for existing jobs
4. Gradually migrate job types
5. Remove old system after validation

### For Helicone:
1. Update Anthropic client initialization
2. Add caching headers
3. Monitor cache hit rates
4. Tune cache parameters

## Conclusion

The current job system served its purpose but is showing limitations. For minimal disruption with maximum benefit:

1. **Today**: Add Helicone for immediate cost savings
2. **This Week**: Plan pg-boss migration
3. **This Month**: Implement pg-boss for reliable processing
4. **Future**: Evaluate Inngest/Temporal as system grows

This approach balances immediate wins with long-term sustainability, keeping the infrastructure simple while solving the core "jankiness" issues.