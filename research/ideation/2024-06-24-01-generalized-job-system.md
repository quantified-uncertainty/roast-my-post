# Generalizing the Job System for Multiple Job Types

## Current State Analysis

The current Job model is tightly coupled to evaluations:
- `evaluationId` is a required field
- Job processing logic is hardcoded to run document analysis
- The job processor expects evaluation-specific relationships (document, agent)
- Job status tracking and retry logic is evaluation-centric

## Proposed Generalization Strategy

### 1. Polymorphic Job Design

#### Option A: Single Table with Type Field
```prisma
model Job {
  id          String   @id @default(uuid())
  type        JobType  // New enum: EVALUATION, IMPORT, EXPORT, etc.
  status      JobStatus @default(PENDING)
  attempts    Int      @default(0)
  error       String?
  
  // Timing fields
  startedAt   DateTime?
  completedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Execution metadata
  llmThinking String?
  costInCents Int?
  durationInSeconds Int?
  logs String?
  
  // Polymorphic payload
  payload     Json     // Contains job-specific data
  result      Json?    // Contains job-specific results
  
  // Optional relations (nullable for non-evaluation jobs)
  evaluationId  String?
  evaluation    Evaluation? @relation(fields: [evaluationId], references: [id])
  
  // New relations for other job types
  importJobData ImportJobData?
  exportJobData ExportJobData?
  
  // Existing retry logic
  originalJobId   String?
  originalJob     Job?     @relation("JobRetries", fields: [originalJobId], references: [id])
  retryJobs       Job[]    @relation("JobRetries")
  
  tasks Task[]
}

enum JobType {
  EVALUATION
  ARTICLE_IMPORT
  BULK_EXPORT
  AGENT_TRAINING
  DOCUMENT_REPROCESSING
  NOTIFICATION
}
```

#### Option B: Separate Tables with Shared Interface
```prisma
// Base job tracking
model Job {
  id          String   @id @default(uuid())
  type        JobType
  status      JobStatus @default(PENDING)
  attempts    Int      @default(0)
  error       String?
  
  // Common fields...
  
  // Type-specific relations
  evaluationJob  EvaluationJob?
  importJob      ImportJob?
  exportJob      ExportJob?
}

model EvaluationJob {
  id           String @id @default(uuid())
  jobId        String @unique
  job          Job    @relation(fields: [jobId], references: [id])
  
  evaluationId String
  evaluation   Evaluation @relation(fields: [evaluationId], references: [id])
}

model ImportJob {
  id           String @id @default(uuid())
  jobId        String @unique
  job          Job    @relation(fields: [jobId], references: [id])
  
  url          String
  platform     String?
  userId       String
  agentIds     String[] // Optional agents to run after import
  
  // Results
  documentId   String?
  importedAt   DateTime?
}
```

### 2. Job Processing Architecture

#### Job Handler Registry Pattern
```typescript
// Base job handler interface
interface JobHandler<T = any> {
  type: JobType;
  validate(payload: unknown): T;
  execute(job: Job, payload: T): Promise<JobResult>;
  onSuccess?(job: Job, result: JobResult): Promise<void>;
  onFailure?(job: Job, error: Error): Promise<void>;
}

// Registry to manage handlers
class JobHandlerRegistry {
  private handlers = new Map<JobType, JobHandler>();
  
  register(handler: JobHandler) {
    this.handlers.set(handler.type, handler);
  }
  
  getHandler(type: JobType): JobHandler {
    const handler = this.handlers.get(type);
    if (!handler) {
      throw new Error(`No handler registered for job type: ${type}`);
    }
    return handler;
  }
}

// Example handlers
class EvaluationJobHandler implements JobHandler<EvaluationPayload> {
  type = JobType.EVALUATION;
  
  validate(payload: unknown): EvaluationPayload {
    return evaluationPayloadSchema.parse(payload);
  }
  
  async execute(job: Job, payload: EvaluationPayload) {
    // Current evaluation logic
  }
}

class ImportJobHandler implements JobHandler<ImportPayload> {
  type = JobType.ARTICLE_IMPORT;
  
  validate(payload: unknown): ImportPayload {
    return importPayloadSchema.parse(payload);
  }
  
  async execute(job: Job, payload: ImportPayload) {
    // Import article
    const article = await processArticle(payload.url);
    
    // Create document
    const document = await DocumentModel.create({
      title: article.title,
      content: article.content,
      // ... etc
    });
    
    // Optionally create evaluation jobs
    if (payload.agentIds?.length) {
      for (const agentId of payload.agentIds) {
        await createJob({
          type: JobType.EVALUATION,
          payload: {
            documentId: document.id,
            agentId,
          }
        });
      }
    }
    
    return { documentId: document.id };
  }
}
```

### 3. Job Creation API

```typescript
// Unified job creation
async function createJob(params: {
  type: JobType;
  payload: any;
  priority?: number;
  scheduledFor?: Date;
  userId?: string;
}) {
  // Validate payload based on job type
  const handler = jobRegistry.getHandler(params.type);
  const validatedPayload = handler.validate(params.payload);
  
  // Create job
  const job = await prisma.job.create({
    data: {
      type: params.type,
      payload: validatedPayload,
      priority: params.priority ?? 0,
      scheduledFor: params.scheduledFor,
      metadata: {
        userId: params.userId,
        createdBy: 'api', // or 'system', 'user', etc.
      }
    }
  });
  
  return job;
}

// Usage examples
// Create import job
await createJob({
  type: JobType.ARTICLE_IMPORT,
  payload: {
    url: 'https://example.com/article',
    agentIds: ['agent-1', 'agent-2'],
  },
  userId: session.user.id,
});

// Create evaluation job
await createJob({
  type: JobType.EVALUATION,
  payload: {
    documentId: 'doc-123',
    agentId: 'agent-456',
  }
});
```

### 4. Enhanced Job Features

#### Priority Queue
```prisma
model Job {
  // ... existing fields
  priority    Int      @default(0) // Higher = more important
  scheduledFor DateTime? // For delayed jobs
  
  @@index([status, priority, scheduledFor])
}
```

#### Job Dependencies
```prisma
model Job {
  // ... existing fields
  
  // Dependencies
  dependsOn   Job[]    @relation("JobDependencies")
  dependents  Job[]    @relation("JobDependencies")
}
```

#### Job Metadata & Tagging
```prisma
model Job {
  // ... existing fields
  
  metadata    Json?    // Flexible metadata storage
  tags        String[] // For filtering/grouping
  
  @@index([tags])
}
```

### 5. Migration Strategy

1. **Phase 1: Add type field and payload**
   - Add `type` field with default `EVALUATION`
   - Add `payload` field, populate from existing relations
   - Keep existing evaluation fields for backward compatibility

2. **Phase 2: Implement handler pattern**
   - Create JobHandler interface and registry
   - Implement EvaluationJobHandler with existing logic
   - Update job processor to use handlers

3. **Phase 3: Add new job types**
   - Implement ImportJobHandler
   - Update import API to create jobs instead of synchronous processing
   - Add other job types as needed

4. **Phase 4: Cleanup**
   - Make evaluation fields optional
   - Remove direct evaluation logic from JobModel
   - Update UI to handle different job types

### 6. Benefits of Generalization

1. **Scalability**: Easy to add new job types without modifying core infrastructure
2. **Consistency**: All background work uses same retry logic, monitoring, etc.
3. **Performance**: Import/export operations don't block API responses
4. **Flexibility**: Can add complex workflows with job dependencies
5. **Monitoring**: Unified job dashboard for all background work
6. **Testing**: Easier to test job handlers in isolation

### 7. Example: Import Job Flow

```typescript
// API route becomes simpler
export async function POST(request: NextRequest) {
  const { url, agentIds } = await request.json();
  
  // Create import job instead of synchronous processing
  const job = await createJob({
    type: JobType.ARTICLE_IMPORT,
    payload: { url, agentIds, userId: session.user.id },
  });
  
  // Return immediately
  return NextResponse.json({
    success: true,
    jobId: job.id,
    message: "Import job created. Check job status for progress.",
  });
}

// Client can poll job status
export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId');
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      status: true,
      error: true,
      result: true,
      completedAt: true,
    }
  });
  
  return NextResponse.json(job);
}
```

### 8. UI Considerations

- Job status page should show different job types with appropriate icons/colors
- Progress tracking for long-running jobs (imports, bulk operations)
- Job-specific detail views based on type
- Filtering by job type, status, user, date range
- Real-time updates via polling or websockets

### 9. Advanced Features to Consider

1. **Job Chaining**: Automatically trigger follow-up jobs
2. **Batch Jobs**: Group related jobs for bulk operations
3. **Recurring Jobs**: Schedule periodic tasks (daily reports, cleanup)
4. **Job Templates**: Predefined job configurations
5. **Rate Limiting**: Per-user or per-type limits
6. **Dead Letter Queue**: Handle permanently failed jobs
7. **Job Versioning**: Track schema changes over time
8. **Distributed Processing**: Multiple workers with job locking

### 10. Monitoring & Observability

```typescript
// Job metrics
interface JobMetrics {
  type: JobType;
  status: JobStatus;
  duration: number;
  cost?: number;
  retries: number;
  error?: string;
}

// Emit metrics for monitoring
async function emitJobMetrics(job: Job, metrics: JobMetrics) {
  // Send to monitoring service
  // Log to database
  // Update dashboards
}
```

This generalized job system would make the codebase more maintainable and scalable while preserving all existing functionality.

## Simple Implementation Timeline (3 Job Types in 1 Week)

For a practical implementation handling 3 job types in the next week, here's a realistic estimate: **2-3 days of focused work**

### Day 1: Core Changes (4-6 hours)
- Add `type` enum field to Job model 
- Add `payload` JSON field for job-specific data
- Create simple handler registry pattern
- Update job processor to dispatch by type

### Day 2: Implement New Job Types (4-6 hours)
- Move evaluation logic into EvaluationHandler
- Create ImportHandler (move existing import logic)
- Create 3rd job type handler
- Basic testing

### Day 3: UI & Cleanup (2-4 hours)
- Update job status page to show job types
- Fix any migration issues
- Testing and bug fixes

### Simplest Approach
1. Keep existing Job model, just add `type` and `payload` fields
2. Use a switch statement in job processor instead of fancy registry
3. Store job-specific data in the JSON payload
4. Minimal UI changes - just show job type in lists

### Skip for Now
- Separate tables for each job type
- Complex dependency management  
- Priority queues
- Advanced monitoring

This gets you a working multi-job system quickly without over-engineering.