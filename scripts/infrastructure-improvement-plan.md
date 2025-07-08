# Infrastructure + Agent Improvement System

## The Problem
Current system only improves **agent YAML** but misses **infrastructure bugs** in:
- `src/lib/documentAnalysis/*` - core evaluation pipeline
- API endpoints for fetching results
- Database queries and data processing
- Job processing and completion logic

## Multi-Layer Solution

### Layer 1: Infrastructure Health Checks
Before improving agents, verify the infrastructure works:

```typescript
// scripts/health-check.ts
async function runInfrastructureHealthCheck() {
  // 1. Create test experiment with known agent
  // 2. Wait for completion 
  // 3. Verify we can fetch results
  // 4. Check evaluation data quality
  // 5. Validate analysis pipeline
}
```

### Layer 2: Pipeline Debugging
When health checks fail, diagnose the issue:

```typescript
// scripts/debug-pipeline.ts
async function debugEvaluationPipeline(experimentId: string) {
  // 1. Check job status and logs
  // 2. Verify evaluation creation
  // 3. Test comment extraction
  // 4. Validate data flow
  // 5. Identify bottlenecks
}
```

### Layer 3: Agent Improvement (Current System)
Only run when infrastructure is healthy:

```typescript
// Enhanced improve-agent.ts
async function improveAgent() {
  // 1. Run health check first
  // 2. If infrastructure issues found, fix those first
  // 3. Then run agent optimization
  // 4. Verify improvements don't break infrastructure
}
```

## Current Issues to Fix

### Issue: "Retrieved 0 evaluations"
**Root Cause**: API endpoint mismatch or data fetching logic
**Fix**: Add infrastructure debugging to identify exact failure point

### Issue: "NaN scores" 
**Root Cause**: Analysis pipeline not processing evaluation data
**Fix**: Test the `analyzeResults()` function with real evaluation objects

### Issue: Jobs complete but no data
**Root Cause**: Job completion ≠ evaluation data available
**Fix**: Check the relationship between jobs and evaluations

## Implementation Strategy

### Phase 1: Immediate Debug (Today)
1. **Fix the evaluation fetching** - why are we getting 0 evaluations?
2. **Test the analysis pipeline** - why NaN scores?
3. **Verify API endpoints** - are we calling the right routes?

### Phase 2: Infrastructure Testing (This Week)
1. **Create health check script** that verifies end-to-end flow
2. **Add pipeline debugging** for when things break
3. **Infrastructure improvement loop** for fixing code issues

### Phase 3: Unified System (Next)
1. **Smart routing** - infrastructure fixes vs agent fixes
2. **Code change detection** - when to test infrastructure
3. **Integrated improvement** - agents + code together

## Benefits

### For Infrastructure
- **Catch pipeline bugs** before they affect agent testing
- **Verify fixes work** end-to-end
- **Monitor system health** continuously

### For Agent Improvement  
- **Reliable baseline** - know the infrastructure works
- **Quality data** - no more NaN scores or missing evaluations
- **Confidence in results** - improvements are real, not artifacts

### For Development
- **Faster debugging** - know whether issue is agent or infrastructure
- **Better reliability** - system self-diagnoses problems
- **Continuous validation** - changes don't break existing functionality

## Next Steps

1. **Debug current issues** - get basic flow working
2. **Create health check** - verify infrastructure before agent improvement
3. **Design infrastructure improvement loop** - similar to agent loop but for code
4. **Integrate systems** - seamless workflow from infrastructure to agents