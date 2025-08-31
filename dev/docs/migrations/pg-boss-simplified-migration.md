# Simplified pg-boss Migration - Incremental De-risking Approach

## Core Strategy: Run Both Systems in Parallel
**No migration needed** - New jobs go to pg-boss, existing system continues unchanged. Each increment takes 1-2 days max.

---

## Increment 1: Minimal pg-boss Setup (Day 1)
**Goal**: Get pg-boss running and processing ONE simple job type with zero changes to existing code.

### Step 1.1: Install pg-boss (30 min)
```bash
pnpm add pg-boss@^10.0.0 --filter @roast/jobs
```

### Step 1.2: Minimal pg-boss Manager (2 hours)
**File**: `internal-packages/jobs/src/pgboss/minimal-manager.ts`
```typescript
import PgBoss from 'pg-boss';

export class MinimalPgBossManager {
  private boss: PgBoss | null = null;
  private enabled = process.env.PGBOSS_ENABLED === 'true';

  async start() {
    if (!this.enabled) return;
    
    this.boss = new PgBoss(process.env.DATABASE_URL!);
    await this.boss.start();
    console.log('✅ pg-boss started');
  }

  async stop() {
    if (!this.boss) return;
    await this.boss.stop();
  }

  async sendImportJob(url: string, documentId?: string) {
    if (!this.boss) {
      // Fallback to existing system
      return this.sendLegacyImportJob(url, documentId);
    }

    return await this.boss.send('import-article', { url, documentId });
  }

  private async sendLegacyImportJob(url: string, documentId?: string) {
    // Call existing job creation code
    // This is your current implementation unchanged
  }
}
```

### Step 1.3: Simple Import Worker (2 hours)
**File**: `internal-packages/jobs/src/pgboss/import-worker.ts`
```typescript
import PgBoss from 'pg-boss';

export async function startImportWorker() {
  if (process.env.PGBOSS_ENABLED !== 'true') return;

  const boss = new PgBoss(process.env.DATABASE_URL!);
  await boss.start();

  await boss.work('import-article', async (job) => {
    console.log(`Processing import: ${job.data.url}`);
    
    try {
      // Use your EXISTING import logic - no changes needed
      const { importArticle } = await import('../existing/import-logic');
      await importArticle(job.data.url, job.data.documentId);
      
      console.log(`✅ Import completed: ${job.id}`);
    } catch (error) {
      console.error(`❌ Import failed: ${job.id}`, error);
      throw error; // pg-boss will retry
    }
  });

  console.log('✅ Import worker started');
}

// Start worker if run directly
if (require.main === module) {
  startImportWorker().catch(console.error);
}
```

### Step 1.4: Update ONE endpoint (30 min)
**File**: `apps/web/src/app/api/import/route.ts`
```typescript
import { MinimalPgBossManager } from '@roast/jobs/pgboss/minimal-manager';

const pgBoss = new MinimalPgBossManager();
pgBoss.start().catch(console.error);

export async function POST(request: Request) {
  const { url } = await request.json();
  
  // This automatically uses pg-boss if enabled, legacy otherwise
  const jobId = await pgBoss.sendImportJob(url);
  
  return Response.json({ jobId });
}
```

### Step 1.5: Test It! (1 hour)
```bash
# Terminal 1 - Start the worker
PGBOSS_ENABLED=true pnpm tsx internal-packages/jobs/src/pgboss/import-worker.ts

# Terminal 2 - Send a test job
curl -X POST http://localhost:3000/api/import \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/article"}'

# Watch the logs - you should see pg-boss processing it!
```

### Rollback (instant)
```bash
# Just turn it off
PGBOSS_ENABLED=false
# Everything goes back to the legacy system
```

### Success Metrics for Increment 1
- [ ] pg-boss processes import jobs successfully
- [ ] No changes to existing evaluation jobs
- [ ] Can toggle between systems with env var
- [ ] Worker doesn't crash

---

## Increment 2: Add Monitoring & Validate Stability (Day 2-3)
**Goal**: Ensure pg-boss is stable before expanding usage.

### Step 2.1: Basic Monitoring Endpoint (1 hour)
```typescript
// apps/web/src/app/api/admin/pgboss-status/route.ts
import PgBoss from 'pg-boss';

export async function GET() {
  const boss = new PgBoss(process.env.DATABASE_URL!);
  await boss.start();
  
  const stats = await boss.getQueueSize('import-article');
  const completed = await boss.getCompletedCount('import-article');
  const failed = await boss.getFailedCount('import-article');
  
  await boss.stop();
  
  return Response.json({
    enabled: process.env.PGBOSS_ENABLED === 'true',
    import_jobs: {
      pending: stats,
      completed,
      failed,
    }
  });
}
```

### Step 2.2: Simple Health Check (30 min)
```typescript
// Add to your existing health check
const pgBossHealth = await fetch('/api/admin/pgboss-status').then(r => r.json());
console.log('pg-boss status:', pgBossHealth);
```

### Step 2.3: Run in Production for 24-48 hours
- Enable for import jobs only
- Monitor error rates
- Check memory usage
- Verify no crashes

### Success Metrics for Increment 2
- [ ] 24 hours without worker crashes
- [ ] Memory usage stable (< 100MB)
- [ ] All import jobs processed successfully
- [ ] Monitoring endpoint working

---

## Increment 3: Add Evaluation Jobs (Day 4-5)
**Goal**: Route NEW evaluation jobs to pg-boss. Still no migration of existing jobs.

### Step 3.1: Extend Manager (2 hours)
```typescript
// Add to MinimalPgBossManager
async sendEvaluationJob(evaluationId: string, agentId: string) {
  if (!this.boss) {
    return this.sendLegacyEvaluationJob(evaluationId, agentId);
  }

  // Use pg-boss features: priority, retries, timeout
  return await this.boss.send('evaluation', 
    { evaluationId, agentId },
    { 
      priority: 5,
      retryLimit: 3,
      retryDelay: 30,
      retryBackoff: true,
      expireInSeconds: 3600,
    }
  );
}
```

### Step 3.2: Evaluation Worker (2 hours)
```typescript
// internal-packages/jobs/src/pgboss/eval-worker.ts
export async function startEvaluationWorker() {
  if (process.env.PGBOSS_ENABLED !== 'true') return;

  const boss = new PgBoss(process.env.DATABASE_URL!);
  await boss.start();

  // Process with concurrency
  await boss.work('evaluation', 
    { teamSize: 5, teamConcurrency: 2 },
    async (job) => {
      console.log(`Processing eval: ${job.data.evaluationId}`);
      
      // Use EXISTING orchestrator - no changes
      const { JobOrchestrator } = await import('../core/JobOrchestrator');
      const orchestrator = new JobOrchestrator();
      await orchestrator.processEvaluation(job.data.evaluationId);
      
      console.log(`✅ Eval completed: ${job.id}`);
    }
  );

  console.log('✅ Evaluation worker started (5 workers, 2 concurrent each)');
}
```

### Step 3.3: Update Job Creation (1 hour)
```typescript
// In your JobService or wherever you create evaluation jobs
async createEvaluationJob(evaluationId: string, agentId: string) {
  // Only use pg-boss for NEW jobs
  if (process.env.PGBOSS_FOR_NEW_EVALS === 'true') {
    return await pgBoss.sendEvaluationJob(evaluationId, agentId);
  }
  
  // Existing jobs continue using legacy system
  return await this.createLegacyJob(evaluationId, agentId);
}
```

### Step 3.4: Gradual Rollout
```bash
# Start with just import jobs
PGBOSS_ENABLED=true
PGBOSS_FOR_NEW_EVALS=false

# After 24 hours of stability, add evaluation jobs
PGBOSS_FOR_NEW_EVALS=true

# Monitor for another 24-48 hours
```

### Success Metrics for Increment 3
- [ ] Evaluation jobs processing successfully
- [ ] Retry mechanism working
- [ ] No memory leaks with 10 concurrent workers
- [ ] Processing time comparable or better than legacy

---

## Increment 4: Full Cutover (Day 6-7)
**Goal**: Stop creating new legacy jobs, but still process existing ones.

### Step 4.1: Route ALL New Jobs to pg-boss (1 hour)
```typescript
// Update all job creation to use pg-boss
export class JobService {
  async createJob(type: string, data: any) {
    // Always use pg-boss for new jobs
    return await pgBoss.send(type, data);
  }
}
```

### Step 4.2: Keep Legacy Worker Running (for old jobs)
```bash
# Run both workers temporarily
node legacy-worker.js  # Processes remaining old jobs
node pgboss-worker.js  # Processes all new jobs
```

### Step 4.3: Monitor Migration Progress
```sql
-- Check remaining legacy jobs
SELECT COUNT(*), status FROM "Job" GROUP BY status;

-- Once this reaches 0, legacy system can be removed
SELECT COUNT(*) FROM "Job" WHERE status IN ('PENDING', 'RUNNING');
```

### Step 4.4: Remove Legacy System (when ready)
Only after all legacy jobs are processed:
1. Stop legacy workers
2. Remove legacy job creation code
3. Archive Job table
4. Clean up unused code

---

## Why This Approach Works

### Minimal Risk
1. **No data migration** - pg-boss uses its own tables
2. **Instant rollback** - Just change env variable
3. **Gradual validation** - Start with least critical jobs
4. **Both systems run** - No "big bang" switchover

### Minimal Work
- **Increment 1**: 1 day (basic setup + one job type)
- **Increment 2**: 1 day (monitoring + stability check)
- **Increment 3**: 1-2 days (add main job type)
- **Increment 4**: 1 day (complete cutover)

**Total: 4-5 days of work, spread over 1-2 weeks**

### Clear Success Metrics
Each increment has specific, measurable success criteria before proceeding.

### Simple Code
- Reuses ALL existing job logic
- No complex migrations
- Minimal new code
- Clear separation between systems

---

## Quick Start Commands

```bash
# Day 1: Get it running
pnpm add pg-boss --filter @roast/jobs
PGBOSS_ENABLED=true pnpm tsx internal-packages/jobs/src/pgboss/import-worker.ts

# Day 2-3: Monitor
curl http://localhost:3000/api/admin/pgboss-status

# Day 4-5: Add evaluation jobs
PGBOSS_FOR_NEW_EVALS=true pnpm tsx internal-packages/jobs/src/pgboss/eval-worker.ts

# Day 6-7: Full cutover
PGBOSS_FOR_ALL_JOBS=true

# Rollback at any point
PGBOSS_ENABLED=false
```

---

## Comparison to Full Migration

| Aspect | Full Migration | Incremental Approach |
|--------|---------------|---------------------|
| Time to first test | 1-2 weeks | 1 day |
| Risk | High (all jobs at once) | Low (one type at a time) |
| Rollback complexity | Complex | Instant (env var) |
| Code changes | Extensive | Minimal |
| Data migration | Required | None |
| Validation time | After full implementation | Continuous |

This incremental approach lets you validate pg-boss with real workloads immediately, with almost zero risk and minimal effort.