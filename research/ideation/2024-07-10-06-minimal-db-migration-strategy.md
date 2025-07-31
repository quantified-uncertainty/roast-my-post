# Minimal Database Migration Strategy for EvalTypes

## Core Principle: Maximum Compatibility, Minimum Changes

This document outlines how to implement the EvalType system with zero to minimal database changes, ensuring backward compatibility while enabling powerful new capabilities.

## Zero Database Change Implementation

### Strategy: Semantic Overloading
Use existing fields with new interpretations based on agent configuration:

```typescript
// Traditional Evaluation (unchanged)
{
  summary: "This React tutorial has several technical inaccuracies...",
  analysis: "The author demonstrates a misunderstanding of...",
  grade: 72,
  selfCritique: "I may have been too harsh on the formatting...",
  highlights: [...]
}

// Tagging Evaluation (same fields, different content)
{
  summary: '{"tags":["react","tutorial","beginner"],"confidence":0.85}',
  analysis: "Tagged as React tutorial due to step-by-step instructions and JSX examples",
  grade: 85,  // Confidence as grade
  selfCritique: "High confidence in technical tags, moderate in difficulty assessment",
  highlights: []  // Empty for tagging
}
```

### Agent Configuration Signals

Use `extendedCapabilityId` as a type indicator:
```typescript
// Pattern: evaltype:{type}:{subtype}
extendedCapabilityId: "evaltype:tagging:technical"
extendedCapabilityId: "evaltype:extraction:keypoints"
extendedCapabilityId: "evaltype:validation:facts"

// Backward compatible - old agents work unchanged
extendedCapabilityId: null  // Traditional evaluation
extendedCapabilityId: "simple-link-verifier"  // Existing special case
```

### Detection Logic

```typescript
function getEvalType(agent: AgentVersion): EvalType {
  if (!agent.extendedCapabilityId) return { type: "analysis", subtype: null };
  
  if (agent.extendedCapabilityId.startsWith("evaltype:")) {
    const [_, type, subtype] = agent.extendedCapabilityId.split(":");
    return { type, subtype };
  }
  
  // Legacy special cases
  if (agent.extendedCapabilityId === "simple-link-verifier") {
    return { type: "validation", subtype: "links" };
  }
  
  return { type: "analysis", subtype: null };
}
```

## Phased Migration Approach

### Phase 0: Pure Compatibility Mode (Week 1)
**Zero database changes, zero breaking changes**

```typescript
// Store structured data as JSON strings
function storeTaggingResult(evalVersion: EvaluationVersionCreate) {
  return {
    ...evalVersion,
    summary: JSON.stringify(evalVersion.tags),
    analysis: evalVersion.taggingRationale,
    grade: Math.round(evalVersion.confidence * 100),
    selfCritique: evalVersion.tagQualityAssessment
  };
}

// Read with type detection
function parseEvaluation(eval: EvaluationVersion, agent: AgentVersion) {
  const evalType = getEvalType(agent);
  
  if (evalType.type === "tagging") {
    try {
      const tags = JSON.parse(eval.summary);
      return { type: "tagging", tags, rationale: eval.analysis };
    } catch {
      // Fallback for non-JSON summary
      return { type: "analysis", ...eval };
    }
  }
  
  return { type: "analysis", ...eval };
}
```

### Phase 1: Soft Migration with Feature Flags (Week 2-3)
**Still zero database changes**

```typescript
// Add feature flags to control rollout
const FEATURE_FLAGS = {
  enableEvalTypes: process.env.ENABLE_EVAL_TYPES === "true",
  evalTypesVersion: process.env.EVAL_TYPES_VERSION || "v0"
};

// Progressive enhancement based on flags
function processEvaluation(agent, document) {
  if (!FEATURE_FLAGS.enableEvalTypes) {
    return legacyEvaluationWorkflow(agent, document);
  }
  
  const evalType = getEvalType(agent);
  return routeToEvalWorkflow(evalType, agent, document);
}
```

### Phase 2: Optional Metadata Field (Month 2)
**Single backward-compatible addition**

```prisma
model EvaluationVersion {
  // ... all existing fields unchanged ...
  
  // Single new optional field
  metadata     Json?    @db.JsonB
  
  // Everything else remains the same
}
```

Migration script (safe, non-destructive):
```sql
-- Add column without touching existing data
ALTER TABLE "EvaluationVersion" 
ADD COLUMN "metadata" JSONB;

-- No data migration needed - field is optional
-- Old evaluations work perfectly without it
```

### Phase 3: Gradual Data Migration (Month 3+)
**Move structured data to metadata field when convenient**

```typescript
// Lazy migration during reads
async function getEvaluationWithMigration(evalId: string) {
  const eval = await prisma.evaluationVersion.findUnique({
    where: { id: evalId },
    include: { evaluation: { include: { agent: true } } }
  });
  
  // If old format and is special type, migrate on read
  if (!eval.metadata && isStructuredEvalType(eval.evaluation.agent)) {
    const metadata = parseStructuredData(eval.summary);
    
    // Update with metadata, preserve original fields
    await prisma.evaluationVersion.update({
      where: { id: evalId },
      data: { metadata }
    });
  }
  
  return eval;
}
```

## Backward Compatibility Guarantees

### 1. Reading Old Data
```typescript
// All old evaluations continue to work
function renderEvaluation(eval: EvaluationVersion) {
  // Check if new format
  if (eval.metadata?.evalType) {
    return renderNewFormat(eval);
  }
  
  // Fall back to traditional rendering
  return renderTraditionalFormat(eval);
}
```

### 2. API Compatibility
```typescript
// API responses include both formats
GET /api/evaluations/123
{
  // Traditional fields (always present)
  "summary": "...",
  "analysis": "...",
  "grade": 85,
  
  // New fields (when applicable)
  "evalType": "tagging",
  "structuredData": { ... }
}
```

### 3. UI Degradation
```typescript
// Components handle both formats
function EvaluationDisplay({ evaluation }) {
  // Try new format first
  if (evaluation.metadata?.evalType === "tagging") {
    return <TagDisplay tags={evaluation.metadata.tags} />;
  }
  
  // Graceful fallback
  return <TraditionalEvalDisplay {...evaluation} />;
}
```

## Cost-Benefit Analysis

### Zero-Change Approach (Phase 0)
**Costs:**
- JSON parsing overhead
- Field semantic overloading
- Limited query capabilities

**Benefits:**
- Zero migration risk
- Instant deployment
- Complete backward compatibility
- No database downtime

### Single-Field Addition (Phase 2)
**Costs:**
- One migration script
- ~5 minutes deployment time
- Minimal storage increase

**Benefits:**
- Clean data separation
- Better query performance
- Type safety with JSON schema
- Future extensibility

## Implementation Checklist

### Week 1: Zero-Change Prototype
- [ ] Implement `evaltype:tagging` agent
- [ ] Create tagging workflow
- [ ] Store tags in summary field
- [ ] Update UI to detect and display tags
- [ ] Test with 10 documents

### Week 2: Production Validation  
- [ ] Add feature flags
- [ ] Implement type detection
- [ ] Create 3-5 eval types
- [ ] Monitor performance
- [ ] Gather user feedback

### Week 3: Decision Point
- [ ] Evaluate JSON parsing performance
- [ ] Assess query limitations
- [ ] Decide on metadata field addition
- [ ] Plan rollout strategy

### Month 2+: Scaling
- [ ] Add metadata field if needed
- [ ] Implement lazy migration
- [ ] Build query optimizations
- [ ] Enable custom eval types

## Example: Complete Zero-Change Implementation

```typescript
// 1. Agent Creation (no schema changes)
const taggerAgent = {
  name: "Technical Tagger",
  primaryInstructions: "Analyze and tag technical content...",
  extendedCapabilityId: "evaltype:tagging:technical",
  // All other fields normal
};

// 2. Workflow Routing (extends existing)
if (agent.extendedCapabilityId?.startsWith("evaltype:tagging")) {
  const result = await tagDocument(document, agent);
  return {
    summary: JSON.stringify(result.tags),
    analysis: result.explanation,
    grade: result.confidence * 100,
    selfCritique: result.qualityNote,
    highlights: []  // No highlights for tags
  };
}

// 3. UI Display (backward compatible)
function EvalSummary({ eval, agent }) {
  if (agent.extendedCapabilityId?.includes("tagging")) {
    try {
      const tags = JSON.parse(eval.summary);
      return <TagList tags={tags} />;
    } catch {
      // Fallback if parse fails
    }
  }
  return <div>{eval.summary}</div>;
}

// 4. Search/Filter (works with existing indexes)
// Can search for tags in summary field using full-text search
const taggedDocs = await prisma.evaluationVersion.findMany({
  where: {
    summary: { contains: '"react"' }  // Find React-tagged docs
  }
});
```

## Conclusion

The beauty of this approach is that **we can start experimenting with zero database changes**. The existing schema is flexible enough to support eval types through creative use of current fields. Only when we've validated the concept and need better performance or cleaner queries do we need to consider adding a single optional field.

This strategy ensures:
1. **Zero risk** to existing functionality
2. **Immediate experimentation** capability  
3. **Gradual migration** if and when needed
4. **Complete backward compatibility** at every phase
5. **User value delivery** from day one