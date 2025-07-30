# Code Review: PR #72 - Ephemeral Experiments Implementation

## Executive Summary
This PR implements the ephemeral experiments feature with significant new functionality. While the implementation is well-thought-out, there are several areas for improvement including code duplication, complex functions, missing error handling, and performance concerns.

## Critical Issues

### 1. Performance Issues

#### Database Query Optimization
**File**: `src/app/api/batches/route.ts` (Lines 339-372)
```typescript
// Current: Loading all jobs and filtering in memory
jobs: {
  select: { status: true },
},
// Later:
completed: batch.jobs.filter(j => j.status === "COMPLETED").length,
failed: batch.jobs.filter(j => j.status === "FAILED").length,
```

**Recommendation**: Use database aggregation
```typescript
const batchesWithStats = await prisma.agentEvalBatch.findMany({
  where,
  include: {
    _count: {
      select: { jobs: true }
    },
    jobs: {
      select: {
        status: true,
      },
      // Or use groupBy for counts
    }
  }
});

// Or better, use raw query for aggregation
const stats = await prisma.$queryRaw`
  SELECT 
    batch_id,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed,
    COUNT(*) FILTER (WHERE status = 'FAILED') as failed
  FROM jobs
  GROUP BY batch_id
`;
```

#### Sequential Processing in Cleanup
**File**: `src/scripts/cleanup-expired-batches.ts` (Line 45)
```typescript
for (const batch of expiredBatches) {
  await prisma.agentEvalBatch.delete({
    where: { id: batch.id },
  });
}
```

**Recommendation**: Batch delete operations
```typescript
await prisma.agentEvalBatch.deleteMany({
  where: {
    id: { in: expiredBatches.map(b => b.id) }
  }
});
```

### 2. Security Concerns

#### Missing Rate Limiting
All new endpoints lack rate limiting for ephemeral resource creation.

**Recommendation**: Add rate limiting middleware
```typescript
import { rateLimit } from '@/lib/rate-limiter';

export const POST = withSecurity(
  async (request) => {
    // handler
  },
  {
    requireAuth: true,
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10 // limit each user to 10 ephemeral experiments per window
    }
  }
);
```

#### Input Validation Gaps
**File**: `src/app/api/batches/route.ts` (Line 127)
```typescript
const trackingId = data.isEphemeral 
  ? (data.trackingId || `exp_${nanoid(8)}`)
  : data.trackingId;
```

**Recommendation**: Ensure unique tracking IDs
```typescript
let trackingId = data.trackingId;
if (data.isEphemeral && !trackingId) {
  let attempts = 0;
  do {
    trackingId = `exp_${nanoid(8)}`;
    const exists = await prisma.agentEvalBatch.findFirst({
      where: { trackingId }
    });
    if (!exists) break;
  } while (++attempts < 5);
  
  if (attempts >= 5) {
    throw new Error("Could not generate unique tracking ID");
  }
}
```

### 3. Code Duplication

#### Job Statistics Calculation (Appears 4+ times)
**Files**: Multiple locations including `route.ts` and `experiments/[trackingId]/route.ts`

**Recommendation**: Create utility function
```typescript
// src/lib/batch-utils.ts
export function calculateJobStats(jobs: { status: string }[]) {
  const stats = {
    total: jobs.length,
    completed: 0,
    failed: 0,
    running: 0,
    pending: 0,
  };
  
  for (const job of jobs) {
    switch (job.status) {
      case 'COMPLETED': stats.completed++; break;
      case 'FAILED': stats.failed++; break;
      case 'RUNNING': stats.running++; break;
      case 'PENDING': stats.pending++; break;
    }
  }
  
  return stats;
}
```

#### Transaction Mock Pattern in Tests
**Files**: `route.test.ts` (Lines 107-147 and 182-202)

**Recommendation**: Extract to test helper
```typescript
// src/test/helpers/prisma-mocks.ts
export function mockBatchTransaction(overrides = {}) {
  return async (callback: any) => {
    return callback({
      agent: {
        create: jest.fn().mockResolvedValue({ id: 'agent-1' }),
        // ... other methods
      },
      agentEvalBatch: {
        create: jest.fn().mockResolvedValue({ id: 'batch-1' }),
        // ... other methods
      },
      ...overrides
    });
  };
}

// Usage in tests
(prisma.$transaction as jest.Mock).mockImplementation(
  mockBatchTransaction({ /* custom overrides */ })
);
```

### 4. Complex Functions

#### POST Handler Too Long
**File**: `src/app/api/batches/route.ts` (Lines 46-305) - 259 lines!

**Recommendation**: Break into smaller functions
```typescript
async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validatedData = await validateBatchRequest(body);
    
    const batch = await createBatch(validatedData, session.user.id);
    
    return NextResponse.json({ batch }, { status: 200 });
  } catch (error) {
    return handleBatchError(error);
  }
}

async function validateBatchRequest(body: unknown) {
  // Validation logic
}

async function createBatch(data: ValidatedBatchData, userId: string) {
  return prisma.$transaction(async (tx) => {
    const agent = await resolveOrCreateAgent(tx, data, userId);
    const documents = await resolveOrCreateDocuments(tx, data, userId);
    const batch = await createBatchRecord(tx, data, agent, userId);
    const jobs = await createBatchJobs(tx, batch, agent, documents);
    
    return { ...batch, jobs };
  });
}
```

### 5. Missing Error Handling

#### Potential Null Reference
**File**: `src/app/api/experiments/[trackingId]/route.ts` (Lines 94-95)
```typescript
.map(j => j.evaluation.versions[0]?.grade)
```

**Recommendation**: Add defensive checks
```typescript
.map(j => {
  const version = j.evaluation?.versions?.[0];
  return version?.grade ?? null;
})
.filter((grade): grade is number => grade !== null)
```

#### Missing Batch Verification
**File**: `src/scripts/cleanup-expired-batches.ts` (Line 64)

**Recommendation**: Verify before deletion
```typescript
const batchStillExists = await prisma.agentEvalBatch.findUnique({
  where: { id: batch.id }
});

if (batchStillExists) {
  await prisma.agentEvalBatch.delete({
    where: { id: batch.id }
  });
}
```

### 6. Type Safety Issues

#### Using `any` Types
**Files**: Multiple locations

**Recommendation**: Define proper types
```typescript
// Instead of: const where: any = { userId };
interface BatchWhereClause {
  userId: string;
  isEphemeral?: boolean;
  expiresAt?: { gte?: Date; lte?: Date };
}

const where: BatchWhereClause = { userId };
```

### 7. Debugging Code

Remove console.log/console.error statements from:
- `src/app/experiments/new/page.tsx`
- Various test files

### 8. Potential Bugs

#### Division by Zero
**File**: `src/app/api/experiments/[trackingId]/route.ts` (Lines 98-100)

**Recommendation**: Already handled correctly with length check

#### Missing URL Import Implementation
**File**: `src/app/api/batches/route.ts` (Line 159)
```typescript
// TODO: Implement URL import logic
```

This should either be implemented or the feature should be disabled with proper error message.

## Recommendations Summary

### High Priority
1. Implement rate limiting for ephemeral resource creation
2. Fix performance issues with database queries
3. Extract duplicate code into utility functions
4. Break down complex functions (especially the 259-line POST handler)
5. Add proper error handling throughout

### Medium Priority
1. Replace `any` types with proper TypeScript types
2. Implement batch operations in cleanup script
3. Add unique constraint validation for tracking IDs
4. Remove debugging console statements

### Low Priority
1. Standardize naming conventions (ephemeral vs experiment)
2. Add more comprehensive test coverage
3. Consider implementing the missing URL import feature

## Code Organization Suggestions

1. Create utility modules:
   - `src/lib/batch-utils.ts` - Job stats, batch operations
   - `src/lib/ephemeral-utils.ts` - Ephemeral resource management
   - `src/test/helpers/prisma-mocks.ts` - Test utilities

2. Consider a service layer pattern for complex operations:
   - `src/services/experiment-service.ts`
   - `src/services/batch-service.ts`

3. Implement consistent error handling:
   - Create custom error classes
   - Standardize error responses
   - Add proper logging

## Testing Improvements

1. Add integration tests for cascade deletion scenarios
2. Add performance tests for batch operations
3. Test edge cases (expired batches, concurrent operations)
4. Add security tests for rate limiting and access control

## Documentation Needs

1. Document the ephemeral resource lifecycle
2. Add API documentation for new endpoints
3. Document cleanup job scheduling and configuration
4. Add troubleshooting guide for common issues