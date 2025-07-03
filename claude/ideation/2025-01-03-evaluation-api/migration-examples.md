# Evaluation Library Migration Examples

This document shows concrete examples of how to migrate from the current tightly-coupled system to the proposed clean API.

## 1. Basic Document Evaluation

### Current System (Database-Coupled)
```typescript
// Current approach requires database setup and job processing
import { prisma } from "@/lib/prisma";
import { JobModel } from "@/models/Job";

// Create evaluation in database
const evaluation = await prisma.evaluation.create({
  data: {
    documentId: "doc-123",
    agentId: "agent-456",
  }
});

// Create job
const job = await prisma.job.create({
  data: {
    evaluationId: evaluation.id,
    status: 'PENDING',
  }
});

// Process job (requires full database context)
const jobModel = new JobModel();
const result = await jobModel.processJob(job);
```

### New Clean API
```typescript
import { Evaluator } from '@roastmypost/evaluator';

const evaluator = new Evaluator();

// Direct evaluation - no database required
const result = await evaluator.evaluate(
  {
    id: "doc-123",
    title: "My Article",
    content: "Article content here...",
    author: "John Doe"
  },
  {
    id: "agent-456",
    name: "Critical Assessor",
    purpose: "ASSESSOR",
    description: "Provides critical assessment of arguments"
  }
);

console.log(result.summary);
console.log(result.comments);
```

## 2. API Route Handler

### Current System
```typescript
// app/api/documents/[id]/evaluations/route.ts
export async function POST(request: NextRequest) {
  const userId = await authenticateRequest(request);
  const { agentId } = await request.json();
  
  // Complex database transaction
  const result = await prisma.$transaction(async (tx) => {
    const evaluation = await tx.evaluation.create({
      data: { documentId, agentId }
    });
    
    const job = await tx.job.create({
      data: { evaluationId: evaluation.id, status: 'PENDING' }
    });
    
    return { evaluation, job };
  });
  
  // Job will be processed asynchronously later
  return NextResponse.json({
    evaluationId: result.evaluation.id,
    jobId: result.job.id,
    status: 'pending'
  });
}
```

### New Clean API
```typescript
// app/api/evaluate/route.ts
import { Evaluator } from '@roastmypost/evaluator';
import { withDatabase } from '@/lib/database-adapter';

const evaluator = new Evaluator();

export async function POST(request: NextRequest) {
  const userId = await authenticateRequest(request);
  const { documentId, agentId } = await request.json();
  
  // Load document and agent (can be from DB, files, or API)
  const document = await loadDocument(documentId);
  const agent = await loadAgent(agentId);
  
  // Direct evaluation
  const result = await evaluator.evaluate(document, agent);
  
  // Optionally save to database
  if (process.env.SAVE_TO_DATABASE === 'true') {
    await withDatabase(async (db) => {
      await db.saveEvaluation(documentId, agentId, result);
    });
  }
  
  // Return result immediately
  return NextResponse.json({
    success: true,
    evaluation: result
  });
}
```

## 3. CLI Script Migration

### Current System
```typescript
// scripts/analyze-document.ts
import { prisma } from "@/lib/prisma";
import { analyzeDocument } from "@/lib/documentAnalysis";

async function main() {
  const document = await prisma.document.findUnique({
    where: { id: process.argv[2] },
    include: { versions: { take: 1 } }
  });
  
  const agent = await prisma.agent.findUnique({
    where: { id: process.argv[3] },
    include: { versions: { take: 1 } }
  });
  
  // Complex data transformation
  const documentForAnalysis = {
    id: document.id,
    title: document.versions[0].title,
    content: document.versions[0].content,
    // ... many more fields
  };
  
  const result = await analyzeDocument(documentForAnalysis, agent);
  console.log(result);
}
```

### New Clean API
```typescript
#!/usr/bin/env node
// bin/evaluate.js
import { Evaluator } from '@roastmypost/evaluator';
import { readFileSync } from 'fs';

const evaluator = new Evaluator();

// Simple file-based evaluation
const document = JSON.parse(readFileSync(process.argv[2], 'utf-8'));
const agent = await evaluator.loadAgentFromTOML(process.argv[3]);

const result = await evaluator.evaluate(document, agent);
console.log(JSON.stringify(result, null, 2));
```

## 4. Batch Processing

### Current System
```typescript
// Complex batch processing with job queue
for (const agentId of agentIds) {
  await prisma.$transaction(async (tx) => {
    const evaluation = await tx.evaluation.create({
      data: { documentId, agentId }
    });
    
    await tx.job.create({
      data: { 
        evaluationId: evaluation.id,
        agentEvalBatchId: batchId 
      }
    });
  });
}

// Run job processor separately
const processor = new JobModel();
while (true) {
  const hasJobs = await processor.run();
  if (!hasJobs) break;
}
```

### New Clean API
```typescript
import { Evaluator } from '@roastmypost/evaluator';

const evaluator = new Evaluator();

// Simple batch evaluation
const results = await evaluator.evaluateBatch(
  documents,
  agents,
  {
    concurrency: 5,
    onEvaluationComplete: (docId, agentId, result) => {
      console.log(`✓ Completed ${docId} with ${agentId}`);
    }
  }
);

// Results immediately available
results.forEach((docResults, docId) => {
  docResults.forEach((result, agentId) => {
    console.log(`${docId} + ${agentId}: ${result.summary}`);
  });
});
```

## 5. Worker/Queue Integration

### Current System
```typescript
// Requires complex job monitoring
setInterval(async () => {
  const pendingJobs = await prisma.job.findMany({
    where: { status: 'PENDING' },
    include: { /* complex includes */ }
  });
  
  for (const job of pendingJobs) {
    await jobModel.processJob(job);
  }
}, 5000);
```

### New Clean API
```typescript
import { Evaluator } from '@roastmypost/evaluator';
import Queue from 'bull';

const evaluator = new Evaluator();
const evaluationQueue = new Queue('evaluations');

// Simple queue processor
evaluationQueue.process(async (job) => {
  const { document, agent } = job.data;
  
  return await evaluator.evaluate(document, agent, {
    onProgress: (progress) => {
      job.progress(progress.percentComplete);
    }
  });
});

// Add to queue
await evaluationQueue.add({
  document: { id: "1", title: "...", content: "..." },
  agent: { id: "2", name: "...", purpose: "ASSESSOR" }
});
```

## 6. Testing

### Current System
```typescript
// Requires database setup and mocking
import { prisma } from "@/lib/prisma";
import { JobModel } from "@/models/Job";

beforeEach(async () => {
  await prisma.$executeRaw`TRUNCATE TABLE "Job" CASCADE`;
  // Complex test data setup
});

test('evaluation', async () => {
  // Create test data in database
  const doc = await prisma.document.create({ /*...*/ });
  const agent = await prisma.agent.create({ /*...*/ });
  
  // Run through job system
  const jobModel = new JobModel();
  await jobModel.run();
  
  // Check database for results
  const evaluation = await prisma.evaluation.findFirst({ /*...*/ });
  expect(evaluation).toBeDefined();
});
```

### New Clean API
```typescript
import { Evaluator } from '@roastmypost/evaluator';

test('evaluation', async () => {
  const evaluator = new Evaluator({
    anthropicApiKey: 'test-key'
  });
  
  // Simple in-memory test
  const result = await evaluator.evaluate(
    {
      id: "1",
      title: "Test Article",
      content: "This is test content..."
    },
    {
      id: "2",
      name: "Test Agent",
      purpose: "ASSESSOR",
      description: "Test agent for unit tests"
    }
  );
  
  expect(result.summary).toBeDefined();
  expect(result.analysis).toBeDefined();
  expect(result.comments).toBeInstanceOf(Array);
});
```

## 7. Real-time Streaming

### Current System
```typescript
// No built-in streaming support
// Would require polling database for job status
const checkStatus = setInterval(async () => {
  const job = await prisma.job.findUnique({
    where: { id: jobId }
  });
  
  if (job.status === 'COMPLETED') {
    clearInterval(checkStatus);
    // Get results
  }
}, 1000);
```

### New Clean API
```typescript
import { Evaluator } from '@roastmypost/evaluator';

const evaluator = new Evaluator();

// Native streaming support
const stream = evaluator.evaluateStream(document, agent);

for await (const chunk of stream) {
  switch (chunk.type) {
    case 'progress':
      console.log(`Progress: ${chunk.progress.percentComplete}%`);
      break;
    case 'partial':
      console.log('Partial result:', chunk.data);
      break;
    case 'complete':
      console.log('Final result:', chunk.data);
      break;
  }
}
```

## Key Benefits of Migration

1. **Simplicity**: Remove database coupling and complex job management
2. **Flexibility**: Use anywhere - CLI, API, workers, tests
3. **Performance**: Direct evaluation without database overhead
4. **Testability**: Easy to mock and test without database
5. **Portability**: Can be published as npm package and used in any project
6. **Real-time**: Built-in streaming and progress tracking
7. **Type Safety**: Full TypeScript support with clear interfaces