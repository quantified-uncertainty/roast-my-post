# Database Query Analysis

## Summary
Critical performance issues found: missing indexes, N+1 queries, lack of pagination, and expensive aggregations without caching.

## 1. N+1 Query Problems

### FINDING 1: No Pagination on Jobs Page
- **File**: `/src/app/jobs/page.tsx`
- **Lines**: 6-28
- **Severity**: Critical
- **Issue**: Fetches ALL jobs with full includes without pagination

**Current Code**:
```typescript
// Line 6-28
const jobs = await prisma.job.findMany({
  include: {
    evaluation: {
      include: {
        agent: {
          include: {
            versions: {
              orderBy: { version: "desc" },
              take: 1,
            },
          },
        },
        document: {
          include: {
            versions: {
              orderBy: { version: "desc" },
              take: 1,
            },
          },
        },
      },
    },
    tasks: true,
  },
  orderBy: { createdAt: "desc" },
});
```

**Fix Required**:
```typescript
// Add pagination
const page = parseInt(searchParams?.page || '1');
const limit = 50;

const jobs = await prisma.job.findMany({
  take: limit,
  skip: (page - 1) * limit,
  include: { /* existing includes */ },
  orderBy: { createdAt: "desc" }
});

const totalJobs = await prisma.job.count();
```

### FINDING 2: Heavy Nested Includes in Document Model
- **File**: `/src/models/Document.ts`
- **Lines**: 108-166 (`getDocumentWithEvaluations`), 300-353 (`getAllDocumentsWithEvaluations`)
- **Severity**: High
- **Issue**: Deep nested includes fetch entire object graph

**Current Pattern**:
```typescript
// Lines 108-166 - Fetches EVERYTHING
include: {
  evaluations: {
    include: {
      versions: {
        include: {
          comments: {
            include: {
              highlights: true
            }
          }
        }
      },
      jobs: {
        include: {
          tasks: true
        }
      }
    }
  }
}
```

**Fix Required**: Use selective queries
```typescript
// Split into targeted queries
const document = await prisma.document.findUnique({
  where: { id: docId },
  select: {
    id: true,
    publishedDate: true,
    versions: {
      select: { 
        id: true,
        title: true,
        content: true
      },
      orderBy: { version: "desc" },
      take: 1
    }
  }
});

// Fetch evaluations separately if needed
const evaluations = await prisma.evaluation.findMany({
  where: { documentId: docId },
  select: { /* only needed fields */ }
});
```

## 2. Connection Pool Issues

### FINDING 3: Creating New PrismaClient Instances
- **File**: `/src/app/jobs/page.tsx`
- **Line**: 6
- **Severity**: High
- **Issue**: Creates new connection pool instead of reusing

**Current Code**:
```typescript
// Line 6 - BAD!
const prisma = new PrismaClient();
```

**Fix Required**:
```typescript
// Import shared instance
import { prisma } from "@/lib/prisma";
```

**Verification**:
```bash
# Find all new PrismaClient instances
rg "new PrismaClient" --type ts --type tsx
```

## 3. Raw SQL Usage

### FINDING 4: Row-Level Locking Query
- **File**: `/src/models/Job.ts`
- **Lines**: 108-114
- **Severity**: Low (Valid use case)
- **Note**: Legitimate use for preventing race conditions

**Current Code**:
```typescript
const job = await tx.$queryRaw<Array<{id: string}>>`
  SELECT id FROM "Job" 
  WHERE status = 'PENDING'
  ORDER BY "createdAt" ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED
`;
```

**Assessment**: Keep as-is - necessary for job queue safety

## 4. Missing Database Indexes

### FINDING 5: No Index on Frequently Queried Fields
- **Schema File**: `/prisma/schema.prisma`
- **Severity**: Critical
- **Fields Missing Indexes**: `Job.status`, `Job.createdAt`, compound indexes

**Files Querying These Fields**:
1. `/src/app/api/monitor/stats/route.ts:26-31,52-54` - Queries by status
2. `/src/models/Job.ts:110` - Queries by status  
3. `/src/app/api/monitor/jobs/route.ts` - Orders by createdAt
4. Multiple other routes filter/order by these fields

**Fix Required** - Add to schema.prisma:
```prisma
model Job {
  // ... existing fields ...
  
  @@index([status])
  @@index([createdAt])
  @@index([status, createdAt]) // Compound for common queries
}

model Evaluation {
  // ... existing fields ...
  
  @@index([createdAt])
  @@index([agentId, createdAt]) // For agent-specific queries
}
```

**Apply Fix**:
```bash
npx prisma migrate dev --name add-performance-indexes
```

## 5. Complex Queries Without Caching

### FINDING 6: Expensive Aggregations Run on Every Request
- **File**: `/src/app/api/monitor/stats/route.ts`
- **Lines**: 12-137
- **Severity**: High
- **Issue**: Runs 11+ parallel aggregation queries without caching

**Current Code Structure**:
```typescript
// Lines 12-137 - Runs EVERY time
const [
  totalEvaluations,
  successfulEvaluations,
  totalDocuments,
  totalAgents,
  jobQueueStats,
  recentEvaluations,
  // ... more queries
] = await Promise.all([
  prisma.evaluation.count(),
  prisma.evaluation.count({ where: { jobs: { some: { status: "COMPLETED" }}}),
  // ... 9 more queries
]);
```

**Fix Required** - Add caching:
```typescript
import { redis } from '@/lib/redis'; // Setup Redis first

export async function GET() {
  const cached = await redis.get('monitor:stats');
  if (cached) {
    return NextResponse.json(JSON.parse(cached));
  }

  // ... existing queries ...
  
  // Cache for 5 minutes
  await redis.setex('monitor:stats', 300, JSON.stringify(stats));
  return NextResponse.json(stats);
}
```

## 6. Missing Pagination

### FINDING 7: Routes Without Pagination
**Total Found**: 3 critical routes

1. **File**: `/src/app/jobs/page.tsx`
   - **Issue**: Loads ALL jobs
   - **Fix**: See FINDING 1

2. **File**: `/src/app/api/agents/route.ts`
   - **Issue**: Returns ALL agents
   - **Fix**: Add query params handling:
   ```typescript
   const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
   const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');
   
   const agents = await prisma.agent.findMany({
     skip: (page - 1) * limit,
     take: limit,
     // ... rest of query
   });
   ```

3. **File**: `/src/models/Document.ts`
   - **Method**: `getAllDocumentsWithEvaluations()`
   - **Lines**: 300-353
   - **Issue**: Fetches ALL documents with heavy includes
   - **Fix**: Add pagination parameters to method

## Action Plan

### Immediate (Do Today)
1. **Add database indexes** - Run migration script
2. **Fix new PrismaClient() instances** - Use shared instance
3. **Add pagination to jobs page** - Prevent memory issues

### High Priority (This Week)
1. **Implement caching for stats endpoint**
2. **Add pagination to all list endpoints**
3. **Refactor Document model to use selective queries**

### Medium Priority (This Month)
1. **Add query performance monitoring**
2. **Implement cursor-based pagination for large datasets**
3. **Create database views for complex aggregations**

## Verification Commands

```bash
# Check for missing pagination
rg "findMany\(" --type ts | grep -v "take:" | grep -v "limit"

# Find new PrismaClient instances  
rg "new PrismaClient" --type ts

# Check for queries without indexes
rg "where:.*status" --type ts -A 2 -B 2

# Find deep includes
rg "include:.*include:.*include:" --type ts
```

## Performance Testing

After fixes, test with:
```bash
# Load test the jobs page
ab -n 1000 -c 10 http://localhost:3000/jobs

# Check query performance
PRISMA_LOG_LEVEL=query npm run dev
# Watch for queries taking >100ms
```