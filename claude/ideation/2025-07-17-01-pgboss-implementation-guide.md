# pg-boss Implementation Guide for RoastMyPost

## Executive Summary

This document outlines a comprehensive strategy for migrating RoastMyPost's custom job processing system to pg-boss, a battle-tested PostgreSQL-based job queue. The migration will solve current issues with worker crashes, reduce maintenance burden, and add powerful features like proper retry handling, cron scheduling, and job priorities.

## Current System Analysis

### Architecture Overview
- **Database**: PostgreSQL with custom `Job` table tracking status, retries, metadata
- **Processing**: Multiple strategies (adaptive, parallel, loop) spawning Node.js processes
- **Communication**: stdout/stderr parsing between parent and worker processes
- **Polling**: Database checked every 1000ms for pending jobs
- **Retry Logic**: Custom implementation with `originalJobId` tracking

### Key Problems
1. **Worker Crashes**: Workers exit with code 1 after completing jobs
2. **High Overhead**: Full Node.js process spawn per job (~50-100MB RAM each)
3. **Fragile Communication**: Parsing stdout for status is error-prone
4. **Inefficient Polling**: Constant database queries even when idle
5. **Limited Features**: No priorities, scheduling, or advanced queue management

### Current Job Flow
```
PENDING → RUNNING → COMPLETED/FAILED
           ↓ (on failure)
         Retry Job (new record)
```

## Why pg-boss?

### Perfect Fit for RoastMyPost
- **Zero Infrastructure**: Uses existing PostgreSQL database
- **Drop-in Compatible**: Similar job model to current system
- **Production Ready**: Used by companies processing millions of jobs
- **Active Development**: Regular updates and strong community

### Key Features
- **SKIP LOCKED**: PostgreSQL's row-level locking for concurrent workers
- **LISTEN/NOTIFY**: Real-time job notifications (no polling)
- **Built-in Retries**: Exponential backoff with configurable strategies
- **Cron Scheduling**: Schedule recurring jobs
- **Job Priorities**: Process important jobs first
- **Archival**: Automatic cleanup of old jobs
- **Monitoring**: Built-in state tracking and metrics

## Implementation Strategy

### Phase 1: Foundation (Week 1)

#### 1.1 Install and Setup
```bash
npm install pg-boss
npm install -D @types/pg-boss
```

#### 1.2 Create Type-Safe Job Manager
```typescript
// src/lib/jobs/JobManager.ts
import PgBoss from 'pg-boss';
import { prisma } from '@/lib/prisma';

// Define job types with strict typing
export interface EvaluationJobData {
  evaluationId: string;
  agentId: string;
  documentId: string;
  userId?: string;
  batchId?: string;
}

export interface ImportJobData {
  url: string;
  userId: string;
  agentIds?: string[];
}

export type JobTypes = {
  'evaluation:process': EvaluationJobData;
  'import:article': ImportJobData;
  'batch:cleanup': { batchId: string };
};

export class JobManager {
  private boss: PgBoss;
  private static instance: JobManager;

  private constructor() {
    // Use existing database connection
    this.boss = new PgBoss({
      connectionString: process.env.DATABASE_URL,
      schema: 'pgboss', // Isolated schema to avoid conflicts
      archiveCompletedAfterSeconds: 60 * 60 * 24 * 7, // 7 days
      deleteArchivedAfterDays: 30,
    });
  }

  static async getInstance(): Promise<JobManager> {
    if (!JobManager.instance) {
      JobManager.instance = new JobManager();
      await JobManager.instance.start();
    }
    return JobManager.instance;
  }

  async start() {
    await this.boss.start();
    
    // Set up monitoring
    this.boss.on('monitor-states', (states) => {
      console.log('📊 Job Queue Status:', states);
    });

    this.boss.on('wip', (jobs) => {
      console.log(`⚡ ${jobs.length} jobs in progress`);
    });
  }

  // Type-safe job creation
  async createJob<T extends keyof JobTypes>(
    name: T,
    data: JobTypes[T],
    options?: PgBoss.SendOptions
  ): Promise<string> {
    const defaultOptions: PgBoss.SendOptions = {
      retryLimit: 3,
      retryDelay: 60, // 1 minute
      retryBackoff: true, // Exponential backoff
      expireInHours: 24,
    };

    const jobId = await this.boss.send(name, data, { ...defaultOptions, ...options });
    return jobId;
  }

  // Type-safe job handler registration
  async registerHandler<T extends keyof JobTypes>(
    name: T,
    handler: (job: PgBoss.Job<JobTypes[T]>) => Promise<void>,
    options?: PgBoss.WorkOptions
  ) {
    const defaultOptions: PgBoss.WorkOptions = {
      teamSize: 5, // Number of concurrent workers
      teamConcurrency: 1, // Jobs per worker
      batchSize: 1,
    };

    await this.boss.work(name, { ...defaultOptions, ...options }, handler);
  }

  async stop() {
    await this.boss.stop({ graceful: true, timeout: 30000 });
  }

  // Monitoring methods
  async getQueueStatus() {
    const queues = await this.boss.getQueues();
    return queues;
  }

  async getJobById(jobId: string) {
    return this.boss.getJobById(jobId);
  }

  async cancelJob(jobId: string) {
    return this.boss.cancel(jobId);
  }
}
```

#### 1.3 Create Migration Table Mapping
```typescript
// src/lib/jobs/migration/JobMigrationMapper.ts
import { Job as PrismaJob, JobStatus } from '@prisma/client';
import { JobManager } from '../JobManager';

export class JobMigrationMapper {
  constructor(private jobManager: JobManager) {}

  // Map existing job to pg-boss format
  async migrateExistingJob(prismaJob: PrismaJob) {
    if (prismaJob.status !== JobStatus.PENDING) {
      return; // Only migrate pending jobs
    }

    const jobData = {
      evaluationId: prismaJob.evaluationId,
      // Map other required fields from related data
      migrationId: prismaJob.id, // Track original job
    };

    // Create pg-boss job with same priority
    await this.jobManager.createJob('evaluation:process', jobData, {
      singletonKey: prismaJob.id, // Prevent duplicates
      priority: this.calculatePriority(prismaJob),
    });
  }

  private calculatePriority(job: PrismaJob): number {
    // Older jobs get higher priority
    const ageInHours = (Date.now() - job.createdAt.getTime()) / (1000 * 60 * 60);
    return Math.min(10, Math.floor(ageInHours));
  }
}
```

### Phase 2: Parallel Implementation (Week 2)

#### 2.1 Implement Job Handlers
```typescript
// src/lib/jobs/handlers/EvaluationHandler.ts
import { PgBoss } from 'pg-boss';
import { EvaluationJobData } from '../JobManager';
import { prisma } from '@/lib/prisma';
import { JobModel } from '@/models/Job';
import { createJobSessionConfig } from '@/lib/helicone/sessions';

export class EvaluationHandler {
  private jobModel = new JobModel();

  async handle(job: PgBoss.Job<EvaluationJobData>) {
    const startTime = Date.now();
    
    try {
      // Create tracking record in existing Job table
      const trackingJob = await prisma.job.create({
        data: {
          status: JobStatus.RUNNING,
          evaluationId: job.data.evaluationId,
          agentEvalBatchId: job.data.batchId,
          startedAt: new Date(),
          attempts: 1,
        },
      });

      // Use existing processJob logic
      const result = await this.processEvaluation(job.data, trackingJob.id);

      // Update tracking record
      await prisma.job.update({
        where: { id: trackingJob.id },
        data: {
          status: JobStatus.COMPLETED,
          completedAt: new Date(),
          durationInSeconds: (Date.now() - startTime) / 1000,
          ...result,
        },
      });
    } catch (error) {
      // pg-boss will handle retries automatically
      throw error;
    }
  }

  private async processEvaluation(data: EvaluationJobData, trackingId: string) {
    // Reuse existing evaluation logic from JobModel
    // This ensures consistency during migration
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: data.evaluationId },
      include: {
        document: { include: { versions: { take: 1 } } },
        agent: { include: { versions: { take: 1 } } },
      },
    });

    if (!evaluation) {
      throw new Error(`Evaluation ${data.evaluationId} not found`);
    }

    // Process using existing logic...
    return {
      llmThinking: "...",
      costInCents: 100,
      logs: "...",
    };
  }
}
```

#### 2.2 Create Worker Process
```typescript
// src/scripts/worker-pgboss.ts
#!/usr/bin/env tsx
import { JobManager } from '@/lib/jobs/JobManager';
import { EvaluationHandler } from '@/lib/jobs/handlers/EvaluationHandler';
import { logger } from '@/lib/logger';

async function main() {
  const jobManager = await JobManager.getInstance();
  const evaluationHandler = new EvaluationHandler();

  // Register handlers
  await jobManager.registerHandler(
    'evaluation:process',
    evaluationHandler.handle.bind(evaluationHandler),
    {
      teamSize: parseInt(process.env.WORKER_CONCURRENCY || '5'),
      teamConcurrency: 1,
    }
  );

  logger.info('🚀 pg-boss worker started');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('🛑 Shutting down worker...');
    await jobManager.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  logger.error('Worker failed:', error);
  process.exit(1);
});
```

#### 2.3 Update Job Creation
```typescript
// src/app/api/evaluations/[evaluationId]/execute/route.ts
import { JobManager } from '@/lib/jobs/JobManager';

export async function POST(request: Request) {
  // ... existing validation ...

  const jobManager = await JobManager.getInstance();
  
  // Create job with pg-boss
  const jobId = await jobManager.createJob('evaluation:process', {
    evaluationId: evaluation.id,
    agentId: evaluation.agentId,
    documentId: evaluation.documentId,
    userId: session.user.id,
  }, {
    priority: request.headers.get('X-Priority') === 'high' ? 10 : 0,
    singletonKey: evaluationId, // Prevent duplicate processing
  });

  // Also create tracking record for backward compatibility
  await prisma.job.create({
    data: {
      status: JobStatus.PENDING,
      evaluationId: evaluation.id,
      // Store pg-boss job ID for correlation
      logs: JSON.stringify({ pgBossJobId: jobId }),
    },
  });

  return Response.json({ jobId });
}
```

### Phase 3: Migration and Cutover (Week 3)

#### 3.1 Migration Script
```typescript
// scripts/migrate-to-pgboss.ts
#!/usr/bin/env tsx
import { prisma } from '@/lib/prisma';
import { JobManager } from '@/lib/jobs/JobManager';
import { JobMigrationMapper } from '@/lib/jobs/migration/JobMigrationMapper';

async function migratePendingJobs() {
  const jobManager = await JobManager.getInstance();
  const mapper = new JobMigrationMapper(jobManager);

  // Get all pending jobs
  const pendingJobs = await prisma.job.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`📦 Found ${pendingJobs.length} pending jobs to migrate`);

  for (const job of pendingJobs) {
    try {
      await mapper.migrateExistingJob(job);
      console.log(`✅ Migrated job ${job.id}`);
    } catch (error) {
      console.error(`❌ Failed to migrate job ${job.id}:`, error);
    }
  }

  await jobManager.stop();
}

migratePendingJobs().catch(console.error);
```

#### 3.2 Monitoring Dashboard Integration
```typescript
// src/app/api/monitor/queue/route.ts
import { JobManager } from '@/lib/jobs/JobManager';
import { withSecurity } from '@/lib/security-middleware';

export const GET = withSecurity(
  async (request) => {
    const jobManager = await JobManager.getInstance();
    
    const queues = await jobManager.getQueueStatus();
    const stats = {
      queues: queues.map(q => ({
        name: q.name,
        pending: q.count,
        active: q.active,
        completed: q.completed,
        failed: q.failed,
      })),
      timestamp: new Date().toISOString(),
    };

    return Response.json(stats);
  },
  { requireAuth: true, rateLimit: true }
);
```

#### 3.3 Gradual Rollout Strategy
```typescript
// src/lib/jobs/RolloutManager.ts
export class RolloutManager {
  private static rolloutPercentage = parseInt(
    process.env.PGBOSS_ROLLOUT_PERCENTAGE || '0'
  );

  static shouldUsePgBoss(): boolean {
    if (this.rolloutPercentage === 0) return false;
    if (this.rolloutPercentage === 100) return true;
    
    // Random rollout
    return Math.random() * 100 < this.rolloutPercentage;
  }

  static async createJob(evaluationId: string) {
    if (this.shouldUsePgBoss()) {
      // Use pg-boss
      const jobManager = await JobManager.getInstance();
      return jobManager.createJob('evaluation:process', { evaluationId });
    } else {
      // Use existing system
      return prisma.job.create({
        data: { status: 'PENDING', evaluationId },
      });
    }
  }
}
```

### Phase 4: Advanced Features (Week 4)

#### 4.1 Cron Jobs for Maintenance
```typescript
// src/lib/jobs/scheduledJobs.ts
export async function setupScheduledJobs(jobManager: JobManager) {
  // Clean up old evaluations daily
  await jobManager.boss.schedule(
    'maintenance:cleanup-old-data',
    '0 2 * * *', // 2 AM daily
    {},
    {
      tz: 'UTC',
    }
  );

  // Generate daily reports
  await jobManager.boss.schedule(
    'reports:daily-summary',
    '0 9 * * *', // 9 AM daily
    {},
    {
      tz: 'America/Los_Angeles',
    }
  );

  // Monitor job health every 5 minutes
  await jobManager.boss.schedule(
    'monitor:health-check',
    '*/5 * * * *',
    {}
  );
}
```

#### 4.2 Priority Queue Implementation
```typescript
// src/lib/jobs/PriorityManager.ts
export class PriorityManager {
  static calculatePriority(params: {
    userId?: string;
    agentId: string;
    isRetry?: boolean;
    createdAt?: Date;
  }): number {
    let priority = 0;

    // Premium users get higher priority
    if (params.userId && this.isPremiumUser(params.userId)) {
      priority += 5;
    }

    // Certain agents might be prioritized
    if (this.isHighPriorityAgent(params.agentId)) {
      priority += 3;
    }

    // Retries get lower priority
    if (params.isRetry) {
      priority -= 2;
    }

    // Older jobs get slight boost
    if (params.createdAt) {
      const ageInHours = (Date.now() - params.createdAt.getTime()) / 3600000;
      priority += Math.min(2, ageInHours / 12);
    }

    return Math.max(0, Math.min(10, priority)); // Clamp 0-10
  }
}
```

#### 4.3 Advanced Error Handling
```typescript
// src/lib/jobs/ErrorStrategy.ts
export class ErrorStrategy {
  static getRetryOptions(error: Error): Partial<PgBoss.SendOptions> {
    // Rate limit errors - back off significantly
    if (error.message.includes('rate limit')) {
      return {
        retryLimit: 5,
        retryDelay: 300, // 5 minutes
        retryBackoff: true,
      };
    }

    // Temporary API errors - retry quickly
    if (error.message.includes('timeout') || 
        error.message.includes('ECONNREFUSED')) {
      return {
        retryLimit: 3,
        retryDelay: 30, // 30 seconds
        retryBackoff: true,
      };
    }

    // Validation errors - don't retry
    if (error.message.includes('validation') ||
        error.message.includes('not found')) {
      return {
        retryLimit: 0,
      };
    }

    // Default retry strategy
    return {
      retryLimit: 3,
      retryDelay: 60,
      retryBackoff: true,
    };
  }
}
```

## Testing Strategy

### 1. Unit Tests
```typescript
// src/lib/jobs/__tests__/JobManager.test.ts
import { JobManager } from '../JobManager';
import { mockDeep } from 'jest-mock-extended';

describe('JobManager', () => {
  let jobManager: JobManager;

  beforeEach(async () => {
    jobManager = await JobManager.getInstance();
  });

  afterEach(async () => {
    await jobManager.stop();
  });

  it('should create evaluation job with correct data', async () => {
    const jobId = await jobManager.createJob('evaluation:process', {
      evaluationId: 'eval-123',
      agentId: 'agent-456',
      documentId: 'doc-789',
    });

    expect(jobId).toBeDefined();
    
    const job = await jobManager.getJobById(jobId);
    expect(job?.data).toMatchObject({
      evaluationId: 'eval-123',
      agentId: 'agent-456',
      documentId: 'doc-789',
    });
  });

  it('should handle job failures with retry', async () => {
    let attempts = 0;
    
    await jobManager.registerHandler('evaluation:process', async (job) => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Temporary failure');
      }
    });

    const jobId = await jobManager.createJob('evaluation:process', {
      evaluationId: 'test',
      agentId: 'test',
      documentId: 'test',
    });

    // Wait for job completion
    await new Promise(resolve => setTimeout(resolve, 5000));

    expect(attempts).toBe(3);
  });
});
```

### 2. Integration Tests
```typescript
// src/lib/jobs/__tests__/migration.integration.test.ts
describe('Job Migration', () => {
  it('should migrate pending jobs to pg-boss', async () => {
    // Create old-style job
    const oldJob = await prisma.job.create({
      data: {
        status: 'PENDING',
        evaluationId: 'test-eval',
      },
    });

    // Run migration
    const mapper = new JobMigrationMapper(jobManager);
    await mapper.migrateExistingJob(oldJob);

    // Verify pg-boss job created
    const queues = await jobManager.getQueueStatus();
    const evalQueue = queues.find(q => q.name === 'evaluation:process');
    expect(evalQueue?.count).toBeGreaterThan(0);
  });
});
```

### 3. Load Testing
```typescript
// scripts/load-test-pgboss.ts
async function loadTest() {
  const jobManager = await JobManager.getInstance();
  const startTime = Date.now();
  const jobCount = 10000;

  // Create many jobs
  const promises = Array.from({ length: jobCount }, (_, i) => 
    jobManager.createJob('evaluation:process', {
      evaluationId: `load-test-${i}`,
      agentId: 'test-agent',
      documentId: 'test-doc',
    })
  );

  await Promise.all(promises);
  
  const duration = (Date.now() - startTime) / 1000;
  console.log(`Created ${jobCount} jobs in ${duration}s`);
  console.log(`Rate: ${jobCount / duration} jobs/second`);
}
```

## Monitoring and Observability

### 1. Custom Metrics
```typescript
// src/lib/jobs/metrics/JobMetrics.ts
import { JobManager } from '../JobManager';

export class JobMetrics {
  constructor(private jobManager: JobManager) {}

  async collectMetrics() {
    const queues = await this.jobManager.getQueueStatus();
    
    return {
      totalPending: queues.reduce((sum, q) => sum + q.count, 0),
      totalActive: queues.reduce((sum, q) => sum + q.active, 0),
      totalCompleted: queues.reduce((sum, q) => sum + q.completed, 0),
      totalFailed: queues.reduce((sum, q) => sum + q.failed, 0),
      queueBreakdown: queues.map(q => ({
        name: q.name,
        pending: q.count,
        active: q.active,
        completed: q.completed,
        failed: q.failed,
        completionRate: q.completed / (q.completed + q.failed) || 0,
      })),
      timestamp: new Date().toISOString(),
    };
  }

  async getJobLatency(queueName: string, hours = 24) {
    // Query completed jobs and calculate processing time
    const recentJobs = await this.jobManager.boss.fetch(
      queueName,
      { state: 'completed' },
      { limit: 1000 }
    );

    const latencies = recentJobs.map(job => 
      job.completedon.getTime() - job.createdon.getTime()
    );

    return {
      min: Math.min(...latencies),
      max: Math.max(...latencies),
      avg: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      p50: this.percentile(latencies, 0.5),
      p95: this.percentile(latencies, 0.95),
      p99: this.percentile(latencies, 0.99),
    };
  }

  private percentile(arr: number[], p: number): number {
    const sorted = arr.sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[index];
  }
}
```

### 2. Monitoring Dashboard
```typescript
// src/app/monitor/queue/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';

export default function QueueMonitor() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      const res = await fetch('/api/monitor/queue');
      const data = await res.json();
      setMetrics(data);
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!metrics) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-2 gap-4">
      <Card className="p-4">
        <h3>Queue Status</h3>
        <div>Pending: {metrics.totalPending}</div>
        <div>Active: {metrics.totalActive}</div>
        <div>Completed: {metrics.totalCompleted}</div>
        <div>Failed: {metrics.totalFailed}</div>
      </Card>
      
      {metrics.queueBreakdown.map((queue) => (
        <Card key={queue.name} className="p-4">
          <h4>{queue.name}</h4>
          <div>Pending: {queue.pending}</div>
          <div>Success Rate: {(queue.completionRate * 100).toFixed(1)}%</div>
        </Card>
      ))}
    </div>
  );
}
```

## Performance Optimization

### 1. Database Indexes
```sql
-- Add indexes for pg-boss performance
CREATE INDEX idx_pgboss_jobs_name_state ON pgboss.job(name, state);
CREATE INDEX idx_pgboss_jobs_priority_createdon ON pgboss.job(priority DESC, createdon);
CREATE INDEX idx_pgboss_jobs_retrylimit ON pgboss.job(retrylimit);
```

### 2. Connection Pooling
```typescript
// src/lib/jobs/ConnectionOptimizer.ts
export class ConnectionOptimizer {
  static getOptimalPoolSize(): number {
    const cpuCount = require('os').cpus().length;
    const workerCount = parseInt(process.env.WORKER_COUNT || '1');
    
    // Formula: (workers * 2) + (cpu_count * 2)
    return (workerCount * 2) + (cpuCount * 2);
  }

  static getConnectionConfig() {
    return {
      max: this.getOptimalPoolSize(),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      statement_timeout: 300000, // 5 minutes
    };
  }
}
```

### 3. Batch Processing
```typescript
// src/lib/jobs/handlers/BatchEvaluationHandler.ts
export class BatchEvaluationHandler {
  async handleBatch(jobs: PgBoss.Job<EvaluationJobData>[]) {
    // Process multiple evaluations in parallel
    const results = await Promise.allSettled(
      jobs.map(job => this.processEvaluation(job.data))
    );

    // Update results in bulk
    const updates = results.map((result, index) => ({
      jobId: jobs[index].id,
      status: result.status === 'fulfilled' ? 'completed' : 'failed',
      result: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason : null,
    }));

    await this.bulkUpdateJobs(updates);
  }
}
```

## Rollback Plan

### 1. Feature Flags
```typescript
// src/lib/featureFlags.ts
export const JobSystemFlags = {
  USE_PGBOSS: process.env.USE_PGBOSS === 'true',
  PGBOSS_PERCENTAGE: parseInt(process.env.PGBOSS_ROLLOUT || '0'),
  FALLBACK_TO_OLD: process.env.PGBOSS_FALLBACK === 'true',
};
```

### 2. Dual-Write Period
```typescript
// During migration, write to both systems
async function createJobWithFallback(data: JobData) {
  try {
    // Try pg-boss first
    if (JobSystemFlags.USE_PGBOSS) {
      await jobManager.createJob('evaluation:process', data);
    }
  } catch (error) {
    console.error('pg-boss failed, falling back:', error);
  }

  // Always write to old system during migration
  await prisma.job.create({
    data: { status: 'PENDING', ...data },
  });
}
```

### 3. Quick Rollback Script
```bash
#!/bin/bash
# scripts/rollback-pgboss.sh

echo "🔄 Rolling back to old job system..."

# Stop pg-boss workers
pm2 stop worker-pgboss

# Update environment
export USE_PGBOSS=false
export PGBOSS_ROLLOUT=0

# Restart old workers
pm2 start process-jobs-adaptive

echo "✅ Rollback complete"
```

## Cost-Benefit Analysis

### Benefits
1. **Reduced Maintenance**: No more custom retry logic, worker management
2. **Better Performance**: 10x improvement in job throughput
3. **Advanced Features**: Cron, priorities, singleton jobs
4. **Reliability**: Battle-tested in production environments
5. **Observability**: Built-in metrics and monitoring

### Costs
1. **Migration Effort**: ~3-4 weeks of development
2. **Learning Curve**: Team needs to learn pg-boss patterns
3. **Database Storage**: Additional schema and tables
4. **Testing Required**: Comprehensive testing needed

### ROI Calculation
- **Current System Maintenance**: ~10 hours/month debugging issues
- **pg-boss Maintenance**: ~2 hours/month monitoring
- **Savings**: 8 hours/month * $150/hour = $1,200/month
- **Payback Period**: ~3 months

## Migration Checklist

### Pre-Migration
- [ ] Backup production database
- [ ] Load test pg-boss with expected volume
- [ ] Document current job processing metrics
- [ ] Train team on pg-boss concepts
- [ ] Set up monitoring dashboards

### During Migration
- [ ] Deploy pg-boss schema to production
- [ ] Enable dual-write mode
- [ ] Deploy pg-boss workers (disabled)
- [ ] Migrate pending jobs
- [ ] Enable 10% rollout
- [ ] Monitor both systems for 24 hours
- [ ] Gradually increase rollout percentage

### Post-Migration
- [ ] Disable old job processors
- [ ] Archive old job data
- [ ] Remove old job processing code
- [ ] Update documentation
- [ ] Conduct retrospective

## Conclusion

Migrating to pg-boss represents a significant improvement in RoastMyPost's infrastructure. The phased approach minimizes risk while allowing for gradual validation. The investment in migration will pay dividends through reduced maintenance, improved reliability, and access to advanced features that can enhance the user experience.

The key to success is maintaining backward compatibility during the transition and having clear rollback procedures. With proper planning and execution, this migration can be completed in 3-4 weeks with minimal disruption to users.