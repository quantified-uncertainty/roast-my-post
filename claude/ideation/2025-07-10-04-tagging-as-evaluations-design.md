# Tagging System as Evaluations: Design Exploration

## Executive Summary

This document explores implementing a tagging system by extending the existing evaluation architecture rather than creating a separate system. The core idea is to treat "tagging" as a type of evaluation, where specialized agents produce structured metadata (tags) instead of traditional analysis.

## Core Concept: EvalTypes

### Current State
- Evaluations currently produce: summary, analysis, grade, selfCritique, highlights
- All evaluations follow the same structure regardless of agent purpose
- The `extendedCapabilityId` already hints at different evaluation "types"

### Proposed Evolution
Transform evaluations into a polymorphic system where different "EvalTypes" produce different outputs:

```typescript
type EvalType = 
  | "analysis"      // Traditional evaluation (current default)
  | "tagging"       // Produces tags/categories
  | "fact-check"    // Produces verified claims
  | "link-verify"   // Produces URL validation results
  | "sentiment"     // Produces emotional analysis
  | "structure"     // Produces document structure analysis
```

## Database Design Options

### Option 1: Minimal Changes (Recommended)
Leverage existing fields creatively:

```sql
-- No schema changes needed!
-- Use existing EvaluationVersion fields:
-- • summary → JSON string of tags for tagging evals
-- • analysis → Detailed tagging rationale
-- • grade → Tag confidence score
-- • selfCritique → Tag quality assessment

-- Example stored data:
summary: '{"tags": ["technical", "tutorial", "react", "beginner-friendly"], "confidence": 0.85}'
analysis: 'Document identified as technical tutorial due to step-by-step instructions...'
grade: 85
selfCritique: 'High confidence in technical/tutorial tags, moderate confidence in difficulty level'
```

### Option 2: Add Type Field
Add a single field to track evaluation type:

```prisma
model EvaluationVersion {
  // ... existing fields ...
  evalType        String    @default("analysis") // New field
  // Keep all existing fields, interpret based on evalType
}
```

### Option 3: Flexible Metadata Field
Add a JSON field for type-specific data:

```prisma
model EvaluationVersion {
  // ... existing fields ...
  metadata        Json?     // Type-specific structured data
  // Existing fields remain for backward compatibility
}
```

## Implementation Patterns

### 1. Agent Configuration Evolution
Extend agents to declare their evaluation type:

```typescript
// In AgentVersion, use extendedCapabilityId creatively:
extendedCapabilityId: "evaltype:tagging"
extendedCapabilityId: "evaltype:tagging:technical"
extendedCapabilityId: "evaltype:fact-check"

// Or encode in instructions:
primaryInstructions: `
[EVAL_TYPE: tagging]
[OUTPUT_FORMAT: json_tags]

Your role is to analyze documents and assign appropriate tags...
`
```

### 2. Workflow Routing
Extend the existing capability routing:

```typescript
// Current
if (agent.extendedCapabilityId === "simple-link-verifier") {
  return linkAnalysisWorkflow();
}

// Enhanced
const evalType = parseEvalType(agent.extendedCapabilityId);
switch (evalType.type) {
  case "tagging":
    return taggingWorkflow(evalType.subtype);
  case "fact-check":
    return factCheckWorkflow();
  default:
    return comprehensiveAnalysisWorkflow();
}
```

### 3. Tagging Workflow Design

```typescript
async function taggingWorkflow(document, agent) {
  const prompt = `
    Analyze this document and provide structured tags.
    
    Output JSON format:
    {
      "tags": {
        "primary": ["tag1", "tag2"],        // Main categories
        "technical": ["react", "hooks"],    // Technical tags
        "audience": ["beginner"],           // Target audience
        "quality": ["well-researched"],     // Quality indicators
        "topics": ["web-dev", "frontend"]   // Topic areas
      },
      "confidence": {
        "overall": 0.85,
        "byCategory": { ... }
      },
      "reasoning": "Brief explanation of tag choices"
    }
  `;
  
  // Use structured output with tool use
  const result = await callLLMWithStructuredOutput(prompt);
  
  return {
    summary: JSON.stringify(result.tags),
    analysis: result.reasoning,
    grade: Math.round(result.confidence.overall * 100),
    selfCritique: generateTagCritique(result),
    highlights: [] // No highlights for tagging
  };
}
```

## Advantages of This Approach

### 1. Minimal Database Changes
- Option 1 requires NO schema changes
- Leverages existing versioning and job infrastructure
- Backward compatible with existing evaluations

### 2. Unified Processing Pipeline
- Same job queue handles all evaluation types
- Same retry logic and error handling
- Same cost tracking and monitoring

### 3. Flexible Evolution
- Start with simple tagging evaluations
- Gradually add more eval types
- Each type can have its own workflow

### 4. Natural UI Integration
- Tagging evals appear alongside traditional evals
- Can filter/sort by eval type
- Tag summary appears in evaluation list

## Specific Design Decisions

### 1. Tag Storage Format
```json
{
  "tags": {
    "category": ["technical", "tutorial"],
    "difficulty": ["intermediate"],
    "topics": ["react", "state-management", "hooks"],
    "quality": ["comprehensive", "well-structured"],
    "audience": ["developers", "frontend"],
    "contentType": ["how-to", "guide"]
  },
  "metadata": {
    "confidence": 0.85,
    "version": "1.0",
    "timestamp": "2024-01-10T10:00:00Z"
  }
}
```

### 2. Agent Specialization
Create specialized tagging agents:

```typescript
// Technical Tagger Agent
name: "Technical Tag Analyzer"
extendedCapabilityId: "evaltype:tagging:technical"
primaryInstructions: `
You are a technical document tagger. Analyze documents and assign:
- Programming languages and frameworks
- Technical concepts and patterns
- Difficulty level (beginner/intermediate/advanced)
- Required prerequisites
Output structured JSON tags.
`

// Content Type Tagger Agent  
name: "Content Type Classifier"
extendedCapabilityId: "evaltype:tagging:content-type"
primaryInstructions: `
Classify documents by content type:
- Tutorial, Guide, Reference, Opinion, News
- Writing style (technical, casual, academic)
- Structure (how-to, listicle, essay, documentation)
`
```

### 3. Composite Evaluations
Enable multiple eval types on same document:

```typescript
// Document can have:
- Traditional analysis evaluation (existing)
- Technical tagging evaluation
- Audience tagging evaluation
- Fact-checking evaluation

// Each stored as separate Evaluation with different agents
```

## Migration Path

### Phase 1: Proof of Concept
1. Create first tagging agent using existing schema
2. Implement basic tagging workflow
3. Store tags in summary field as JSON
4. Test with small document set

### Phase 2: Production Rollout
1. Add evalType field if needed (Option 2)
2. Create specialized tagging agents
3. Update UI to display tags nicely
4. Add tag filtering/search

### Phase 3: Advanced Features
1. Tag aggregation across documents
2. Tag-based agent matching
3. Tag evolution tracking
4. Community tag suggestions

## UI/UX Considerations

### 1. Evaluation Display
```typescript
// Traditional Evaluation
[Analysis] Technical Review by CodeReviewer v2
Summary: This React tutorial has several issues...
Grade: 72/100

// Tagging Evaluation  
[Tags] Technical Classifier v1
Tags: react, hooks, intermediate, tutorial, frontend
Confidence: 85%
```

### 2. Tag Visualization
- Tag clouds for documents
- Tag filters in document list
- Tag-based document discovery
- Tag agreement across evaluators

## Advanced Possibilities

### 1. Dynamic Workflow Selection
```typescript
// Agent instructions can specify workflow
primaryInstructions: `
[WORKFLOW: custom-tagging-v2]
[OUTPUT: structured-tags]
[VALIDATION: tag-schema-v1]
...
`
```

### 2. Tag Ontology Management
- Define allowed tags per category
- Tag hierarchies and relationships
- Tag deprecation and migration
- Cross-document tag consistency

### 3. Hybrid Evaluations
Single agent produces both analysis AND tags:
```typescript
{
  summary: "Traditional summary text",
  analysis: "Detailed analysis",
  grade: 85,
  metadata: {
    tags: { ... },
    extractedData: { ... }
  }
}
```

## Implementation Priorities

### Must Have (MVP)
1. Basic tagging workflow
2. JSON tag storage in existing fields
3. One specialized tagging agent
4. Simple tag display in UI

### Should Have
1. Multiple tag categories
2. Tag confidence scores
3. Tag filtering in document list
4. Dedicated evalType field

### Nice to Have
1. Tag ontology management
2. Tag-based agent matching
3. Tag evolution over time
4. Community tagging

## Conclusion

Implementing tagging as a type of evaluation leverages existing infrastructure while adding powerful new capabilities. The approach is:

1. **Pragmatic**: Minimal database changes required
2. **Flexible**: Supports many evaluation types beyond tagging
3. **Evolutionary**: Can start simple and grow sophisticated
4. **Unified**: Single system for all document analysis needs

The key insight is that "evaluation" doesn't have to mean "critique" - it can mean any structured analysis of a document, including categorization, fact-checking, or metadata extraction.