# Document-Agent API Redesign: Simplifying Evaluation Creation

## Problem Statement

The current Document-Agent relationship has several pain points:

1. **Forced Pre-declaration**: Users must declare "intended agents" when creating a document
2. **Two-step Process**: Users first add intended agents, then click buttons to create evaluations
3. **Conceptual Overhead**: The distinction between "intended" vs "actual" evaluations adds complexity
4. **API Inconsistency**: Different flows (create vs import) handle intended agents differently

## Current Flow Issues

### Document Creation Flow
```
1. User creates document
2. User selects "intended agents" (optional)
3. System auto-creates evaluations for intended agents
4. User navigates to document page
5. User sees intended agents and can create "new evaluation versions"
6. User can also add evaluations for non-intended agents
```

### Import Flow
```
1. User provides URL
2. User optionally provides agent IDs
3. System creates document and evaluations in one step
4. No concept of "intended agents" in the API
```

## Proposed Solution: Direct Evaluation API

### Core Concept
Replace the "intended agents" concept with a direct, on-demand evaluation creation API. Users can trigger evaluations for any agent at any time without pre-declaration.

### New API Design

#### 1. Create Evaluation Endpoint
```typescript
POST /api/documents/{documentId}/evaluations
Body: {
  agentId: string
  // Optional: priority, metadata, etc.
}

Response: {
  evaluationId: string
  jobId: string
  status: "pending" | "processing" | "completed"
}
```

#### 2. Batch Create Evaluations
```typescript
POST /api/documents/{documentId}/evaluations/batch
Body: {
  agentIds: string[]
}

Response: {
  evaluations: Array<{
    agentId: string
    evaluationId: string
    jobId: string
    status: string
  }>
}
```

#### 3. Get Document Evaluations
```typescript
GET /api/documents/{documentId}/evaluations
Query params:
  - status?: "pending" | "completed" | "failed"
  - agentId?: string
  - limit?: number
  - offset?: number

Response: {
  evaluations: Array<{
    id: string
    agentId: string
    agent: { name: string, purpose: string }
    status: string
    createdAt: string
    latestVersion: {
      content: string
      highlights: Array<...>
      createdAt: string
    }
  }>
  total: number
}
```

### Backend Implementation

```typescript
// New evaluation creation method
async function createEvaluation(documentId: string, agentId: string, userId: string) {
  return await prisma.$transaction(async (tx) => {
    // Check if evaluation already exists
    const existing = await tx.evaluation.findFirst({
      where: { documentId, agentId }
    });
    
    if (existing) {
      // Create new job for re-evaluation
      const job = await tx.job.create({
        data: {
          evaluationId: existing.id,
          status: 'PENDING',
          type: 'EVALUATION', // If implementing generalized jobs
          payload: { documentId, agentId }
        }
      });
      
      return { evaluation: existing, job, created: false };
    }
    
    // Create new evaluation
    const evaluation = await tx.evaluation.create({
      data: {
        documentId,
        agentId,
        createdBy: userId
      }
    });
    
    // Create job
    const job = await tx.job.create({
      data: {
        evaluationId: evaluation.id,
        status: 'PENDING',
        type: 'EVALUATION',
        payload: { documentId, agentId }
      }
    });
    
    return { evaluation, job, created: true };
  });
}
```

### UI/UX Improvements

#### 1. Document Page Redesign
Replace the current "intended agents" section with:

```tsx
// Available Agents Section
<div className="available-agents">
  <h3>Run Evaluations</h3>
  
  {/* Quick action for common agents */}
  <div className="quick-agents">
    <Button onClick={() => runEvaluation(popularAgents[0].id)}>
      Run Grammar Check
    </Button>
    <Button onClick={() => runEvaluation(popularAgents[1].id)}>
      Run Fact Check
    </Button>
  </div>
  
  {/* Agent selector for all agents */}
  <AgentSelector
    onSelect={(agentId) => runEvaluation(agentId)}
    showRunButton
  />
  
  {/* Bulk actions */}
  <div className="bulk-actions">
    <Button onClick={() => setShowBulkModal(true)}>
      Run Multiple Evaluations
    </Button>
  </div>
</div>

// Evaluation History Section
<div className="evaluation-history">
  <h3>Evaluations</h3>
  
  {evaluations.map(eval => (
    <EvaluationCard
      key={eval.id}
      evaluation={eval}
      onRerun={() => runEvaluation(eval.agentId)}
    />
  ))}
</div>
```

#### 2. Document Creation Simplification
Remove the "intended agents" field entirely from document creation:

```tsx
// Before
<form>
  <input name="title" />
  <textarea name="content" />
  <AgentCheckboxList name="intendedAgents" /> {/* Remove this */}
  <button>Create Document</button>
</form>

// After
<form>
  <input name="title" />
  <textarea name="content" />
  <button>Create Document</button>
</form>

// After creation, redirect to document page where user can run evaluations
```

#### 3. Import Flow Enhancement
Keep the current import flow but clarify the UI:

```tsx
// Import modal
<div>
  <input name="url" placeholder="Article URL" />
  
  <div className="optional-evaluations">
    <h4>Run evaluations after import? (Optional)</h4>
    <AgentCheckboxList 
      selected={selectedAgents}
      onChange={setSelectedAgents}
    />
  </div>
  
  <button onClick={handleImport}>
    Import {selectedAgents.length > 0 && `& Run ${selectedAgents.length} Evaluations`}
  </button>
</div>
```

### Migration Strategy

1. **Phase 1: Add New API** (No breaking changes)
   - Implement new `/evaluations` endpoints
   - Keep existing `intendedAgents` functionality
   - Update UI to use new API for creating evaluations

2. **Phase 2: Deprecate Intended Agents**
   - Remove `intendedAgents` from document creation UI
   - Add database migration to remove field (after backup)
   - Update import API to clarify it creates evaluations directly

3. **Phase 3: Clean Up**
   - Remove all `intendedAgents` related code
   - Simplify DocumentModel methods
   - Update documentation

### Benefits of This Approach

1. **Simplicity**: One-step process to run evaluations
2. **Flexibility**: Users can run any agent at any time
3. **Consistency**: Same flow for all evaluation creation
4. **Discoverability**: Users can browse and try different agents easily
5. **Progressive Enhancement**: Can add agent recommendations later
6. **API Clarity**: RESTful design makes integration easier

### Future Enhancements

1. **Agent Recommendations**
   ```typescript
   GET /api/documents/{documentId}/recommended-agents
   // Returns agents based on document content, user history, etc.
   ```

2. **Evaluation Templates**
   ```typescript
   POST /api/documents/{documentId}/evaluations/template/{templateId}
   // Run a predefined set of agents
   ```

3. **Scheduled Evaluations**
   ```typescript
   POST /api/documents/{documentId}/evaluations/schedule
   Body: {
     agentId: string
     schedule: "daily" | "weekly" | "on-document-update"
   }
   ```

4. **Evaluation Pipelines**
   ```typescript
   // Run agent B only if agent A gives a certain result
   POST /api/documents/{documentId}/evaluations/pipeline
   Body: {
     steps: [
       { agentId: "grammar-check", continueIf: { score: { gt: 0.8 } } },
       { agentId: "fact-check" }
     ]
   }
   ```

### Comparison with Current System

| Aspect | Current System | Proposed System |
|--------|---------------|-----------------|
| Mental Model | Declare intentions → Create evaluations | Direct evaluation creation |
| API Complexity | Multiple concepts (intended, actual) | Single concept (evaluations) |
| User Steps | 2+ steps | 1 step |
| Flexibility | Limited by pre-declaration | Complete flexibility |
| Code Complexity | High (multiple paths) | Low (single path) |
| Database | Extra field for intentions | Simpler schema |

### Implementation Priority

1. **High Priority**
   - New evaluation creation endpoint
   - Update document page UI
   - Remove intended agents from creation flow

2. **Medium Priority**
   - Batch evaluation creation
   - Improved agent selection UI
   - Migration of existing data

3. **Low Priority**
   - Agent recommendations
   - Evaluation templates
   - Advanced features

This redesign simplifies the conceptual model while maintaining all current functionality and opening doors for future enhancements.