# pg-boss Proof of Concept - 2 Hour Implementation

## Goal: Prove pg-boss Works in Your Environment
Before any migration, let's verify pg-boss can connect to your database and process jobs. This takes ~2 hours and requires ZERO changes to existing code.

---

## Step 1: Install pg-boss (5 minutes)
```bash
pnpm add pg-boss --filter @roast/jobs
```

---

## Step 2: Create Test Script (10 minutes)
**File**: `internal-packages/jobs/src/pgboss/proof-of-concept.ts`

```typescript
import PgBoss from 'pg-boss';

async function proofOfConcept() {
  console.log('🚀 Starting pg-boss proof of concept...\n');

  // 1. Connect to your existing database
  const boss = new PgBoss(process.env.DATABASE_URL!);
  
  try {
    // 2. Start pg-boss (creates its own schema/tables)
    await boss.start();
    console.log('✅ Connected to database');
    console.log('✅ pg-boss tables created in "pgboss" schema\n');

    // 3. Register a simple test worker
    await boss.work('test-job', async (job) => {
      console.log(`📥 Received job ${job.id}`);
      console.log(`   Data: ${JSON.stringify(job.data)}`);
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log(`✅ Completed job ${job.id}\n`);
      return { processed: true, timestamp: new Date() };
    });
    console.log('✅ Worker registered\n');

    // 4. Send some test jobs
    console.log('📤 Sending test jobs...');
    
    const job1 = await boss.send('test-job', { message: 'Hello pg-boss!' });
    console.log(`   Job 1 ID: ${job1}`);
    
    const job2 = await boss.send('test-job', 
      { message: 'High priority job' },
      { priority: 10 }
    );
    console.log(`   Job 2 ID: ${job2}`);
    
    const job3 = await boss.send('test-job',
      { message: 'Job with retry' },
      { retryLimit: 3, retryDelay: 5 }
    );
    console.log(`   Job 3 ID: ${job3}\n`);

    // 5. Check queue status
    setTimeout(async () => {
      const stats = await boss.getQueueSize('test-job');
      const completed = await boss.getCompletedCount('test-job');
      
      console.log('📊 Queue Status:');
      console.log(`   Pending: ${stats}`);
      console.log(`   Completed: ${completed}\n`);
    }, 2000);

    // 6. Test error handling
    await boss.work('error-test-job', async (job) => {
      console.log(`🔥 Testing error handling for job ${job.id}`);
      throw new Error('Intentional test error');
    });

    const errorJob = await boss.send('error-test-job', 
      { test: 'error' },
      { retryLimit: 2, retryDelay: 1 }
    );
    console.log(`📤 Sent error test job: ${errorJob}`);
    console.log('   (This job will fail and retry 2 times)\n');

    // Keep running for 30 seconds to see everything process
    console.log('⏰ Running for 30 seconds to observe processing...\n');
    console.log('Press Ctrl+C to stop\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run it
proofOfConcept().catch(console.error);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  process.exit(0);
});
```

---

## Step 3: Run the Test (5 minutes)

```bash
# From project root
cd internal-packages/jobs
pnpm tsx src/pgboss/proof-of-concept.ts
```

### Expected Output:
```
🚀 Starting pg-boss proof of concept...

✅ Connected to database
✅ pg-boss tables created in "pgboss" schema

✅ Worker registered

📤 Sending test jobs...
   Job 1 ID: 3fa85f64-5717-4562-b3fc-2c963f66afa6
   Job 2 ID: 8d4e1a3b-1234-5678-9abc-def012345678
   Job 3 ID: 7c9e6679-7425-40de-944b-e07fc1f90ae7

📥 Received job 8d4e1a3b-1234-5678-9abc-def012345678
   Data: {"message":"High priority job"}
✅ Completed job 8d4e1a3b-1234-5678-9abc-def012345678

📥 Received job 3fa85f64-5717-4562-b3fc-2c963f66afa6
   Data: {"message":"Hello pg-boss!"}
✅ Completed job 3fa85f64-5717-4562-b3fc-2c963f66afa6

📊 Queue Status:
   Pending: 0
   Completed: 3

🔥 Testing error handling for job abc-123
❌ Error: Intentional test error
   (Will retry in 1 second...)
```

---

## Step 4: Verify in Database (10 minutes)

```sql
-- Check that pg-boss created its schema
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'pgboss';

-- See the tables it created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'pgboss'
ORDER BY table_name;

-- Look at some jobs
SELECT id, name, state, priority, createdon, completedon 
FROM pgboss.job 
ORDER BY createdon DESC 
LIMIT 10;

-- Check job states
SELECT state, COUNT(*) 
FROM pgboss.job 
GROUP BY state;
```

---

## Step 5: Test with Real Evaluation Logic (30 minutes)

**File**: `internal-packages/jobs/src/pgboss/test-real-evaluation.ts`

```typescript
import PgBoss from 'pg-boss';
import { prisma } from '@roast/db';
import { JobOrchestrator } from '../core/JobOrchestrator';

async function testRealEvaluation() {
  const boss = new PgBoss(process.env.DATABASE_URL!);
  await boss.start();

  // Use your ACTUAL orchestrator
  const orchestrator = new JobOrchestrator();

  // Register worker with your REAL evaluation logic
  await boss.work('test-evaluation', async (job) => {
    const { evaluationId } = job.data;
    console.log(`\n🧪 Testing real evaluation: ${evaluationId}`);
    
    try {
      // This is your EXISTING evaluation logic - unchanged
      await orchestrator.processEvaluation(evaluationId);
      
      console.log(`✅ Real evaluation completed: ${evaluationId}`);
      return { success: true };
      
    } catch (error) {
      console.error(`❌ Real evaluation failed:`, error);
      throw error; // pg-boss will retry
    }
  });

  // Find a test evaluation to process
  const testEval = await prisma.evaluation.findFirst({
    where: { 
      status: 'PENDING',
      // Maybe filter for a test document
    },
    take: 1
  });

  if (testEval) {
    const jobId = await boss.send('test-evaluation', {
      evaluationId: testEval.id
    });
    
    console.log(`📤 Sent real evaluation job: ${jobId}`);
    console.log(`   Evaluation ID: ${testEval.id}`);
    console.log(`\n⏰ Processing... (this may take a minute)\n`);
  } else {
    console.log('No pending evaluations found for testing');
  }

  // Keep running
  await new Promise(() => {});
}

testRealEvaluation().catch(console.error);
```

---

## What This Proves

After running these tests, you'll know:

✅ **pg-boss can connect** to your database  
✅ **Schema creation works** without conflicts  
✅ **Job processing works** with your Node.js version  
✅ **Retries work** as expected  
✅ **Your evaluation logic** runs inside pg-boss workers  
✅ **Database permissions** are sufficient  

---

## Next Steps If Successful

If all tests pass, you're ready for Increment 1 of the simplified migration:

1. **Import jobs first** (lowest risk, simplest logic)
2. **Monitor for 24 hours** 
3. **Add evaluation jobs**
4. **Gradual cutover**

---

## Troubleshooting

### "Permission denied for schema pgboss"
```sql
GRANT ALL ON SCHEMA pgboss TO your_db_user;
```

### "Cannot find module '@roast/db'"
```bash
# Make sure you build the db package first
pnpm --filter @roast/db run build
```

### Worker not processing jobs
```typescript
// Add more logging
boss.on('error', err => console.error('pg-boss error:', err));
boss.on('job-fail', job => console.error('Job failed:', job));
```

### High memory usage
```typescript
// Reduce worker concurrency
await boss.work('test-job', 
  { teamSize: 1, teamConcurrency: 1 }, // Start with 1 worker
  handler
);
```

---

## Total Time: ~2 Hours

- 5 min: Install
- 10 min: Write test script  
- 5 min: Run basic test
- 10 min: Verify database
- 30 min: Test with real evaluation
- Rest: Coffee break while it runs ☕

This proof of concept requires **ZERO changes** to your existing code and can be deleted entirely if pg-boss doesn't work out.