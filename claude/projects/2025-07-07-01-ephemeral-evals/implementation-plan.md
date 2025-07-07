# Unified AgentEvalBatch Implementation Plan

## Overview

Implement the enhanced AgentEvalBatch model that supports both regular batch evaluations and ephemeral experiments with automatic cleanup.

## Phase 1: Database Migration (Day 1)

### 1.1 Update Prisma Schema

- [ ] Add new fields to `AgentEvalBatch` model
- [ ] Add `ephemeralBatchId` to `Agent` and `Document` models
- [ ] Create migration with proper indexes

### 1.2 Migration Safety

- [ ] Test migration on development database
- [ ] Ensure existing batches remain unaffected
- [ ] Verify cascade delete relationships

## Phase 2: Core API Updates (Days 2-3)

### 2.1 Enhanced Batch Creation

```typescript
// Update existing createBatch endpoint to support experiment features
POST /api/batches
{
  // Existing fields
  agentId?: string,
  targetCount?: number,
  documentIds?: string[],

  // New experiment fields
  trackingId?: string,
  description?: string,
  isEphemeral?: boolean,
  expiresInDays?: number,

  // Ephemeral resource creation
  ephemeralAgent?: {
    name: string,
    primaryInstructions: string,
    // ... other agent fields
  },
  ephemeralDocuments?: {
    urls?: string[],
    inline?: Array<{title: string, content: string}>
  }
}
```

### 2.2 Batch Discovery & Filtering

```typescript
// Update batch listing to handle experiments
GET /api/batches?type=experiment&includeExpired=false

// New experiment-specific endpoint
GET /api/experiments/[trackingId]
```

### 2.3 Ephemeral Resource Creation

- [ ] When creating ephemeral agent, set `ephemeralBatchId`
- [ ] When importing documents for experiment, set `ephemeralBatchId`
- [ ] Ensure proper ownership and permissions

## Phase 3: Background Jobs (Day 4)

### 3.1 Cleanup Job

```typescript
// Scheduled job to clean expired experiments
async function cleanupExpiredBatches() {
  const expired = await prisma.agentEvalBatch.findMany({
    where: {
      isEphemeral: true,
      expiresAt: { lt: new Date() },
    },
    include: {
      jobs: { where: { status: "RUNNING" } },
    },
  });

  // Delete only if no running jobs
  for (const batch of expired) {
    if (batch.jobs.length === 0) {
      await prisma.agentEvalBatch.delete({
        where: { id: batch.id },
      });
    }
  }
}
```

## Phase 4: UI Integration (Days 5-6)

### 4.2 Experiment Dashboard (For admins)

- [ ] List view of active experiments
- [ ] Filter by user, status, expiration
- [ ] Quick actions (delete)

### 4.3 Results Viewer

- [ ] Experiment results page at `/experiments/[trackingId]`
- [ ] Compare multiple evaluation runs
- [ ] Export results functionality

## Phase 5: Testing & Validation (Day 7)

### 5.1 Test Scenarios

- [ ] Regular batch creation (no regression)
- [ ] Ephemeral experiment with new agent
- [ ] Ephemeral experiment with imported documents
- [ ] Cleanup of expired experiments
- [ ] Cascade deletion verification

### 5.2 Performance Testing

- [ ] Batch creation with 100+ documents
- [ ] Cleanup job with 1000+ expired experiments
- [ ] Query performance for experiment listing

## Implementation Priority

### MVP (3-4 days)

1. Database migration
2. Basic API for experiment creation
3. Manual cleanup capability
4. Simple listing endpoint

### Full Feature (7 days)

1. All API endpoints
2. Automated cleanup
3. Basic UI for creation/viewing
4. Export functionality

## Key Decisions Needed

1. **Naming**: Should API use `/experiments` or `/batches?type=experiment`?
2. **Permissions**: Can users see each other's experiments?
3. **Limits**: Max documents per experiment? Max experiments per user?
4. **Retention**: Default expiration period?

## Risk Mitigation

1. **Data Loss**: Test cascade deletes thoroughly
2. **Performance**: Index on `expiresAt` for cleanup queries
3. **Resource Limits**: Cap ephemeral resource creation
4. **Security**: Validate user owns resources before deletion

## Success Metrics

- Experiment creation < 2 seconds
- Cleanup job completes < 1 minute
- Zero data loss from cascade deletes
- 95% of experiments auto-cleaned successfully
