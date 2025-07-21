<!-- Created: 2025-06-22 11:36:43 -->
# Background Agent: API vs Direct DB Access

## Two Approaches

### 1. API-Based (Going through Next.js API routes)
- Uses existing `/api/*` endpoints
- Respects business logic and validation
- Slower but safer

### 2. Direct DB Access (Direct Prisma queries)
- Direct PostgreSQL operations via Prisma
- Much faster and more flexible
- Can do complex queries and bulk operations

## Comparison

### API Approach

**Pros:**
- ✅ Uses existing validation and business logic
- ✅ Respects auth and permissions (if needed later)
- ✅ Consistent with how the UI works
- ✅ Automatic cost tracking, job creation, etc.
- ✅ Safe - can't accidentally corrupt data

**Cons:**
- ❌ Limited by what endpoints exist
- ❌ Slower (HTTP overhead)
- ❌ Need to maintain API compatibility
- ❌ Can't do complex queries easily

**Example:**
```typescript
// MCP tool
async function improveAgent(agentId: string) {
  // Get evaluations
  const res = await fetch(`/api/agents/${agentId}/export-data`);
  const data = await res.text();
  
  // Create new version
  await fetch(`/api/agents/${agentId}/versions`, {
    method: 'POST',
    body: JSON.stringify({ instructions: newInstructions })
  });
}
```

### Direct DB Approach

**Pros:**
- ✅ Much faster - no HTTP overhead
- ✅ Complex queries (JOIN, aggregate, etc.)
- ✅ Bulk operations easy
- ✅ Can access all data relationships
- ✅ Can run analysis queries directly
- ✅ Perfect for personal power-user tool

**Cons:**
- ❌ Bypasses validation
- ❌ Easy to corrupt data if not careful
- ❌ Need to replicate business logic
- ❌ No automatic audit trail

**Example:**
```typescript
// MCP tool with direct Prisma
async function improveAgent(agentId: string) {
  // Complex query with all relationships
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      versions: {
        orderBy: { version: 'desc' },
        take: 1,
        include: {
          evaluations: {
            include: {
              documentVersion: true,
              comments: {
                include: { highlight: true }
              },
              job: {
                include: { tasks: true }
              }
            }
          }
        }
      }
    }
  });
  
  // Direct analysis
  const avgGrade = await prisma.evaluationVersion.aggregate({
    where: { agentVersionId: agent.versions[0].id },
    _avg: { grade: true }
  });
  
  // Create new version directly
  await prisma.agentVersion.create({
    data: {
      agentId,
      version: agent.versions[0].version + 1,
      ...newInstructions
    }
  });
}
```

## Hybrid Approach (Recommended)

Since this is for your personal use as a power user, use **both**:

### Direct DB for:
- Reading data (analysis, queries)
- Complex aggregations
- Bulk reads
- Performance-critical operations

### API for:
- Creating jobs (ensures proper queuing)
- Creating evaluations (ensures consistency)
- Any writes that trigger side effects

### Example Hybrid Tool:
```typescript
async function analyzeAndImprove(agentId: string) {
  // Direct DB for analysis (FAST)
  const stats = await prisma.$queryRaw`
    SELECT 
      av.version,
      COUNT(ev.id) as eval_count,
      AVG(ev.grade) as avg_grade,
      STDDEV(ev.grade) as grade_stddev,
      COUNT(CASE WHEN j.status = 'FAILED' THEN 1 END) as failures
    FROM agent_versions av
    JOIN evaluation_versions ev ON ev.agent_version_id = av.id
    JOIN jobs j ON j.evaluation_version_id = ev.id
    WHERE av.agent_id = ${agentId}
    GROUP BY av.version
    ORDER BY av.version DESC
  `;
  
  // Direct DB for detailed reads
  const failedEvals = await prisma.evaluationVersion.findMany({
    where: {
      agentVersion: { agentId },
      job: { status: 'FAILED' }
    },
    include: {
      documentVersion: true,
      job: true
    }
  });
  
  // API for creating new version (ensures consistency)
  await fetch(`/api/agents/${agentId}/versions`, {
    method: 'POST',
    body: JSON.stringify({
      ...improvedInstructions,
      changeNotes: `Auto-improved based on ${stats[0].eval_count} evals`
    })
  });
  
  // API for running new batch (ensures job queue)
  await fetch(`/api/agents/${agentId}/batch`, {
    method: 'POST',
    body: JSON.stringify({ targetCount: 10 })
  });
}
```

## Setup for Direct DB Access

### 1. MCP Server with Prisma
```typescript
// mcp-server/src/db.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dbTools = {
  async queryAgentStats(agentId: string) {
    return prisma.$queryRaw`...`;
  },
  
  async findFailedEvaluations(criteria: any) {
    return prisma.evaluationVersion.findMany({
      where: criteria,
      include: { /* ... */ }
    });
  }
};
```

### 2. Environment Setup
```bash
# .env for MCP server
DATABASE_URL=postgresql://...  # Same as main app
OPEN_ANNOTATE_API_URL=http://localhost:3000
```

## Recommended Tools for Direct DB

1. **Analysis Queries**
   - Agent performance over time
   - Comment quality metrics
   - Failure pattern analysis
   - Cross-agent comparisons

2. **Bulk Reads**
   - Export all evaluations for agent
   - Find similar comments across agents
   - Document difficulty analysis

3. **Maintenance**
   - Clean up orphaned jobs
   - Recalculate costs
   - Migration helpers

## Safety Rules for Direct DB

1. **Never DELETE without WHERE clause**
2. **Always use transactions for multi-table updates**
3. **Test complex queries on single records first**
4. **Keep backups before bulk operations**
5. **Log all write operations**

## Conclusion

For a personal power-user tool, the **hybrid approach** is best:
- Direct DB for all reads and analysis (95% of operations)
- API for writes that need business logic
- Full power and flexibility while maintaining data integrity