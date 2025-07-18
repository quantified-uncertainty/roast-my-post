# Job System Comparison: Inngest vs pg-boss for RoastMyPost

## Executive Summary

This document analyzes two potential replacements for RoastMyPost's current custom job processing system: **Inngest** (event-driven serverless platform) and **pg-boss** (PostgreSQL-based job queue). After extensive analysis, including implementation plans, trade-offs, and specific workflow considerations, the recommendation is to start with pg-boss for its lower risk and architectural compatibility, while keeping Inngest as a potential future migration target.

## Current System Overview

### Architecture
- **Database-backed job queue** using PostgreSQL
- Custom `Job` table with status tracking (PENDING, RUNNING, COMPLETED, FAILED)
- Multiple processing strategies:
  - Single job processor
  - Loop processor with child process spawning
  - Adaptive processor with dynamic worker scaling
- Manual retry logic with `originalJobId` tracking
- Process-based parallelism with stdout/stderr communication

### Pain Points
1. Worker processes crash after completing jobs (exit code 1)
2. High overhead from spawning full Node.js processes
3. Fragile stdout/stderr parsing for status updates
4. Inefficient database polling
5. Limited features (no priorities, scheduling, advanced retry strategies)
6. Manual process management required

## Option 1: pg-boss

### Overview
pg-boss is a PostgreSQL-based job queue that enhances your existing database with advanced queueing capabilities. It's a "drop-in" enhancement that stays close to your current architecture.

### Key Features
- Uses PostgreSQL's `SKIP LOCKED` for concurrent job processing
- `LISTEN/NOTIFY` for real-time updates (no polling)
- Built-in exponential backoff retries
- Cron scheduling support
- Job priorities (0-10 scale)
- Automatic archival and cleanup
- Singleton jobs (prevent duplicates)

### Implementation Complexity
- **Learning Curve**: Low (3/10) - Familiar SQL-based patterns
- **Code Changes**: Minimal - Reuse existing job processing logic
- **Migration Timeline**: 3-4 weeks
- **Risk Level**: Low - Similar to current system

### Cost Analysis
- **Infrastructure**: $0 additional (uses existing PostgreSQL)
- **Maintenance**: Lower than current system
- **Scaling**: Limited by database connections and performance

### Strengths
- Minimal architectural changes
- Direct SQL access for debugging
- Gradual migration possible
- Battle-tested in production
- Team familiarity with PostgreSQL

### Weaknesses
- Still requires process management
- Limited by database performance
- No built-in UI/dashboard
- Manual monitoring setup needed

## Option 2: Inngest

### Overview
Inngest is an event-driven workflow orchestration platform that fundamentally changes how you think about background jobs. Instead of creating jobs, you send events that trigger serverless functions.

### Key Features
- Event-driven architecture with automatic scaling
- Step-based execution with per-step retries
- Built-in observability dashboard
- Serverless execution (no infrastructure management)
- Advanced error handling (NonRetriableError support)
- Native Next.js/Vercel integration
- Self-hosting option available

### Implementation Complexity
- **Learning Curve**: Medium (6/10) - New event-driven paradigm
- **Code Changes**: Moderate - Refactor to event/step model
- **Migration Timeline**: 4-5 weeks
- **Risk Level**: Medium - Architectural paradigm shift

### Cost Analysis
- **Free Tier**: 100k executions/month
- **Current Usage**: ~15-25k executions (well within free tier)
- **10x Growth**: ~$5-15/month
- **100x Growth**: ~$100-200/month
- **Infrastructure**: $0 (fully managed)

### Strengths
- Automatic scaling and retry management
- Excellent observability out-of-the-box
- No infrastructure to manage
- Step-level error isolation
- Modern event-driven architecture

### Weaknesses
- Vendor lock-in (mitigated by self-hosting)
- Learning curve for event-driven patterns
- Complex debugging for distributed execution
- Limited for massive parallel operations (see below)

## Inngest Parallel Processing Deep Dive

### Fan-Out/Fan-In Patterns

After extensive research into Inngest's parallel processing capabilities, critical limitations were discovered that significantly impact complex workflows:

#### Two Parallel Processing Approaches

**1. Event-Based Fan-Out**
- **Scale**: Unlimited events can be sent
- **Limitation**: Cannot directly access results from fanned-out functions
- **Use Case**: Fire-and-forget operations
- **Coordination**: Requires database or waitForEvent with significant complexity

**2. Parallel Steps (Promise.all)**
- **Scale**: Hard limit of 1,000 steps per function
- **Benefit**: Direct access to all step results
- **Limitation**: 4MB total data return limit
- **Use Case**: Moderate parallelism with result aggregation

#### Key Limitations for Complex Workflows

| Constraint | Impact on Epistemic Auditor |
|------------|---------------------------|
| 1,000 step limit | Can't process 200 chunks × 4 plugins (800 steps) in one function |
| 4MB data limit | Large document analysis results may exceed limits |
| No native map-reduce | Must implement complex workarounds |
| Event coordination | Lose direct result access with fan-out |

#### Example: Epistemic Auditor Challenge

```typescript
// ❌ Would exceed 1,000 step limit
const results = await Promise.all(
  chunks.flatMap(chunk =>
    plugins.map(plugin =>
      step.run(`${plugin}-${chunk.id}`, () => processWithPlugin(chunk, plugin))
    )
  )
);

// ✅ Workaround: Batch processing
for (const batch of chunk(chunks, 50)) {
  const batchResults = await step.run(`batch-${i}`, async () => {
    return await Promise.all(
      batch.flatMap(chunk => plugins.map(p => p.process(chunk)))
    );
  });
}
```

### Fan-Out Coordination Complexity

When using event-based fan-out for scale, coordinating results becomes complex:

```typescript
// Parent function loses direct access to child results
await step.sendEvent("dispatch", chunks.map(chunk => ({
  name: "process.chunk",
  data: { chunkId: chunk.id }
})));

// Must use one of these coordination patterns:
// 1. Database polling (loses event-driven benefits)
// 2. waitForEvent (complex matching logic required)
// 3. Separate aggregation function (additional complexity)
```

## Critical Workflow Analysis: Epistemic Auditor

The Epistemic Auditor (Multi-Epistemic Evaluation) represents the most complex workflow in RoastMyPost and serves as a stress test for both systems.

### Workflow Complexity
- Splits documents into 50-200 chunks
- Routes chunks via LLM to 4 different plugins
- Processes up to 800 parallel operations (200 chunks × 4 plugins)
- Synthesizes results across all plugins
- Complex state management and deduplication

### pg-boss Handling
- **Natural fit** for batch processing
- Can spawn unlimited parallel workers
- Direct database access for intermediate results
- Familiar debugging patterns
- **Complexity**: 5/10

### Inngest Handling
- **Architectural mismatch** with massive parallelism
- Limited to 1,000 steps per function
- Event fan-out loses direct result access
- Requires complex workarounds for coordination
- **Complexity**: 8/10

## Implementation Comparison

### pg-boss Implementation Example
```typescript
// Minimal changes to existing code
const boss = new PgBoss({ connectionString: DATABASE_URL });

await boss.work('evaluation:process', async (job) => {
  // Reuse existing processJob logic
  const result = await processEvaluation(job.data);
  // pg-boss handles retries automatically
  return result;
});
```

### Inngest Implementation Example
```typescript
// Paradigm shift to events and steps
const evaluateDocument = inngest.createFunction(
  { id: "evaluate-document", retries: 3 },
  { event: "document/evaluation.requested" },
  async ({ event, step }) => {
    const data = await step.run("fetch-data", fetchDocumentAndAgent);
    const analysis = await step.run("analyze", () => analyzeDocument(data));
    const evaluation = await step.run("save", () => saveEvaluation(analysis));
    return { evaluationId: evaluation.id };
  }
);
```

## Environment and Infrastructure Considerations

### pg-boss
- **Development**: Same as current (just `DATABASE_URL`)
- **Production**: Deploy workers with existing infrastructure
- **Monitoring**: Build custom dashboards or use existing tools

### Inngest
- **Development**: Requires Inngest Dev Server + Next.js
- **Production**: Multiple environment keys and workspaces
- **Monitoring**: Built-in dashboard but requires their UI

## Testing Strategy Recommendation

### Parallel Testing Approach
Implement both systems for the article import workflow:
- Low volume (10-50 imports/day)
- Non-critical functionality
- Clear success metrics
- 33% traffic to each system (current, pg-boss, Inngest)

### Implementation Timeline
- **Days 1-2**: Set up routing and tracking
- **Days 3-4**: Implement pg-boss for imports
- **Days 5-6**: Implement Inngest for imports
- **Week 2**: Run all three in parallel
- **Week 3**: Make decision based on metrics

### Measurement Criteria
- Setup time and complexity
- Average processing time
- Failure rates
- Debugging time
- Developer satisfaction
- Maintenance requirements

## Final Recommendation

### Immediate Action: Implement pg-boss
**Reasons:**
1. **Lower risk** - Minimal architectural changes
2. **Faster implementation** - 3-4 weeks vs 4-5 weeks
3. **Team familiarity** - PostgreSQL patterns well understood
4. **Immediate value** - Solves current pain points
5. **Complex workflow support** - Better for Epistemic Auditor

### Future Consideration: Inngest
Consider migrating to Inngest in 6-12 months if:
- You want best-in-class observability
- You prefer fully managed infrastructure
- Your workflows become more event-driven
- You're willing to invest in the paradigm shift

### Hybrid Future
The patterns learned from pg-boss will make an eventual Inngest migration easier. Starting with pg-boss provides immediate relief while keeping options open.

## Key Insights

1. **Architecture Fit Matters**: pg-boss enhances your current architecture, while Inngest requires rethinking it
2. **Complexity Varies by Workflow**: Simple workflows benefit from Inngest's elegance, complex parallel workflows fit pg-boss better
3. **Testing is Crucial**: The parallel testing approach with article imports provides real-world validation
4. **No Perfect Solution**: Each system has trade-offs; the choice depends on your priorities

## Appendix: Quick Reference

| Feature | Current System | pg-boss | Inngest |
|---------|---------------|---------|---------|
| Setup Complexity | - | Low | Medium |
| Learning Curve | - | Low | Medium |
| Infrastructure | Self-managed | Self-managed | Managed |
| Retry Logic | Basic | Advanced | Per-step |
| Monitoring | Manual | Manual | Built-in UI |
| Parallelism | Process-based | Worker pools | Event/Step based |
| Cost | ~$50-100/mo | ~$50-100/mo | Free → $200/mo |
| Best For | - | Drop-in enhancement | Greenfield/Simple workflows |