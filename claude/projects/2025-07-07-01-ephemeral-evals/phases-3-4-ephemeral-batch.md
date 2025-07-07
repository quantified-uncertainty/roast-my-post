# AgentExperiment Implementation Strategy

## Executive Summary

This document outlines the implementation strategy for ephemeral evaluations in RoastMyPost, focusing on temporary experiments with automatic cleanup. This builds upon the enhanced AgentEvalBatch foundation described in [2025-07-07-01-ephemeral-evaluation-strategy.md](./2025-07-07-01-ephemeral-evaluation-strategy.md).

The core concept: Enable rapid testing of agent configurations on specific documents without polluting the production database, with automatic cleanup and comprehensive experiment tracking.

## Prerequisites

This strategy assumes completion of:

- Phase 1: Enhanced AgentEvalBatch with `documentIds` support
- Phase 2: UI updates for document selection

See [2025-07-07-01-ephemeral-evaluation-strategy.md](./2025-07-07-01-ephemeral-evaluation-strategy.md) for these foundational phases.

## Phase 3: AgentExperiment Implementation (3-4 days)

### Goal

Implement the `AgentExperiment` system for temporary experiments with automatic cleanup.

### Implementation

#### 3.1 API Design

```typescript
// POST /api/experiments/create
interface CreateExperimentRequest {
  trackingId?: string; // User-friendly ID (auto-generated if not provided)
  name: string;
  description?: string;

  agent: {
    // Option 1: Inline configuration
    config?: {
      name: string;
      primaryInstructions: string;
      selfCritiqueInstructions?: string;
      providesGrades?: boolean;
    };

    // Option 2: Base on existing agent
    baseAgentId?: string;
    modifications?: Partial<AgentConfig>;
  };

  documents: {
    // Option 1: Existing document IDs
    documentIds?: string[];

    // Option 2: Import new documents
    urls?: string[];

    // Option 3: Inline content
    inline?: Array<{
      title: string;
      content: string;
      author?: string;
    }>;
  };

  options?: {
    repeatCount?: number;
    expiresInDays?: number; // Default: 7
  };
}

// Response
interface CreateExperimentResponse {
  experiment: {
    id: string;
    trackingId: string;
    trackingUrl: string; // /experiments/[trackingId]
    expiresAt: string;
  };
  batch: {
    id: string;
    jobCount: number;
  };
  agent: {
    id: string;
    name: string;
    isEphemeral: true;
  };
}
```

#### 3.2 Tracking & Discovery

```typescript
// GET /api/experiments
interface ListExperimentsParams {
  userId?: string;
  status?: "active" | "completed" | "all";
  search?: string;
  limit?: number;
  offset?: number;
}

// GET /api/experiments/[trackingId]
interface ExperimentDetails {
  id: string;
  trackingId: string;
  name: string;
  description?: string;
  createdAt: string;
  expiresAt: string;

  agent: {
    id: string;
    name: string;
    config: AgentConfig;
  };

  batches: Array<{
    id: string;
    createdAt: string;
    jobStats: JobStats;
    results: EvaluationSummary[];
  }>;

  actions: {
    canPromote: boolean;
    canRerun: boolean;
    canExtend: boolean;
  };
}
```

#### 3.3 Database Schema

##### Prisma Schema for AgentExperiment

```prisma
model AgentExperiment {
  id                   String              @id @default(cuid())
  trackingId           String              @unique // User-friendly ID
  name                 String
  description          String?
  userId               String
  createdAt            DateTime            @default(now())
  expiresAt            DateTime            // When to auto-delete

  // Related ephemeral agent (if created for this experiment)
  agentId              String?
  agent                Agent?              @relation(fields: [agentId], references: [id], onDelete: Cascade)

  // Track ephemeral documents created for this experiment
  ephemeralDocumentIds String[]            @default([])

  // Related batch
  agentEvalBatchId     String
  agentEvalBatch       AgentEvalBatch      @relation(fields: [agentEvalBatchId], references: [id], onDelete: Cascade)

  user                 User                @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([trackingId])
  @@index([expiresAt]) // For cleanup queries
}

// Update Agent model to support ephemeral agents
model Agent {
  id                      String              @id @default(cuid())
  name                    String
  type                    AgentType
  primaryInstructions     String
  selfCritiqueInstructions String?
  providesGrades          Boolean            @default(false)
  isActive                Boolean            @default(true)

  // NEW: Track if this agent is ephemeral
  isEphemeral             Boolean            @default(false)

  createdAt               DateTime           @default(now())
  updatedAt               DateTime           @updatedAt

  evaluations             Evaluation[]
  agentVersions           AgentVersion[]
  agentEvalBatches        AgentEvalBatch[]
  agentExperiments        AgentExperiment[]

  @@index([type])
  @@index([isActive])
  @@index([isEphemeral])
}

// Update AgentEvalBatch to link to AgentExperiment
model AgentEvalBatch {
  id                   String              @id @default(cuid())
  name                 String?
  agentId              String
  targetCount          Int
  createdAt            DateTime            @default(now())
  requestedDocumentIds String[]            @default([])

  // NEW: Link to experiment if part of one
  agentExperimentId    String?
  agentExperiment      AgentExperiment?    @relation(fields: [agentExperimentId], references: [id], onDelete: Cascade)

  agent                Agent               @relation(fields: [agentId], references: [id])
  jobs                 Job[]

  @@index([agentId])
  @@index([agentExperimentId])
}

// Optional: Track ephemeral documents separately
model Document {
  id                   String              @id @default(cuid())
  // ... existing fields ...

  // NEW: Track if document is ephemeral
  isEphemeral          Boolean            @default(false)
  agentExperimentId    String?

  // ... rest of model ...

  @@index([isEphemeral])
}
```

#### 3.4 Cleanup System

```typescript
// Cron job: Clean up expired experiments
async function cleanupExpiredExperiments() {
  const expired = await prisma.EphemeralAgentEvalBatch.findMany({
    where: {
      expiresAt: { lt: new Date() },
    },
    include: {
      agent: true,
      agentEvalBatches: {
        include: {
          jobs: true,
        },
      },
    },
  });

  for (const batch of expired) {
    // Check if any jobs are still running
    const runningJobs = batch.agentEvalBatches
      .flatMap((b) => b.jobs)
      .filter((j) => j.status === "RUNNING");

    if (runningJobs.length > 0) {
      console.log(`Skipping cleanup of ${batch.id} - jobs still running`);
      continue;
    }

    // Delete cascade will handle related records
    await prisma.EphemeralAgentEvalBatch.delete({
      where: { id: batch.id },
    });

    console.log(`Cleaned up experiment ${batch.trackingId}`);
  }
}
```

### Benefits

- Clean experiment tracking
- Automatic cleanup
- No production data pollution

## Phase 4: Export & Import System (2-3 days)

### Goal

Enable easy export of experiment results and agent configurations for sharing and analysis.

### Implementation

#### 4.1 Export Formats

```typescript
// GET /api/experiments/[trackingId]/export
interface ExportOptions {
  format: "json" | "toml" | "markdown";
  include: {
    config: boolean;
    results: boolean;
    documents: boolean;
    rawData: boolean;
  };
}

// JSON Export Structure
interface ExperimentExport {
  version: "1.0";
  exported: string; // ISO timestamp

  experiment: {
    trackingId: string;
    name: string;
    description?: string;
    createdAt: string;
  };

  agent: {
    name: string;
    config: {
      primaryInstructions: string;
      selfCritiqueInstructions?: string;
      providesGrades: boolean;
    };
  };

  results: Array<{
    documentId: string;
    documentTitle: string;
    evaluations: Array<{
      createdAt: string;
      grade?: number;
      summary: string;
      highlights: number;
      processingTime: number;
      cost: number;
    }>;
  }>;

  aggregateMetrics: {
    averageGrade: number;
    totalCost: number;
    totalTime: number;
    successRate: number;
  };
}
```

#### 4.2 Agent Configuration Export

```toml
# GET /api/agents/[agentId]/export?format=toml
[agent]
name = "Document Advisor v3"
version = "3.0"
description = "Provides actionable advice for improving documents"

[agent.config]
provides_grades = true

[agent.instructions]
primary = """
You are a document advisor focused on...
"""

self_critique = """
Review your evaluation for...
"""

[agent.metadata]
created = "2024-01-15T10:30:00Z"
author = "user@example.com"
experiment_tracking_id = "advisor-v3-test"
```

#### 4.3 Import Capabilities

```typescript
// POST /api/experiments/import
interface ImportRequest {
  source: {
    type: "json" | "toml" | "url";
    data?: string; // For json/toml
    url?: string; // For URL import
  };

  options: {
    runImmediately?: boolean;
    documentIds?: string[]; // Override documents
    namePrefix?: string; // Prefix for imported items
  };
}
```

### Benefits

- Easy sharing of experiments
- Configuration portability
- Data analysis capabilities

## Next Steps

After implementing these phases:

1. **Monitoring & Analytics**: Build dashboards for experiment tracking
2. **Batch Comparison**: Tools to compare results across experiments
3. **Template Library**: Pre-built agent configurations for common use cases
4. **API Extensions**: Programmatic access for automated testing

## Related Documents

- [Enhanced AgentEvalBatch Strategy](./2025-07-07-01-ephemeral-evaluation-strategy.md) - Phases 1-2 foundation
