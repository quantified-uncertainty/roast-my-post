# Evaluation Recommendations Feature

## Overview
A simple system for document owners to recommend which agents should evaluate their documents, providing guidance to readers while maintaining flexibility.

## Problem Statement
- With many agents available, users may not know which evaluations are most relevant
- Document authors often have insights about which evaluations would be most valuable
- Need a balance between guidance and flexibility

## Proposed Solution: EvaluationListRecommendation

### Database Schema
```sql
CREATE TABLE "EvaluationListRecommendation" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "documentId" TEXT NOT NULL,
  "agentIds" TEXT[] NOT NULL, -- Ordered list of recommended agent IDs
  "createdBy" TEXT NOT NULL, -- User who created this recommendation
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE,
  FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE,
  UNIQUE("documentId") -- One recommendation list per document
);
```

### Prisma Model
```prisma
model EvaluationListRecommendation {
  id         String   @id @default(uuid())
  documentId String   @unique
  agentIds   String[] // Ordered list of recommended agents
  createdBy  String
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  creator    User     @relation(fields: [createdBy], references: [id], onDelete: Cascade)
}
```

### API Design
```typescript
// Set recommendations
POST /api/documents/{documentId}/recommendations
{
  agentIds: ["grammar-check", "fact-check", "style-review"]
}

// Get recommendations
GET /api/documents/{documentId}/recommendations
```

### UI Mockup
```tsx
// In document view - recommended agents appear at top
<div className="mb-4 rounded-lg bg-blue-50 p-4">
  <h4 className="mb-2 text-sm font-medium text-blue-900">
    Recommended Evaluations
  </h4>
  <div className="flex flex-wrap gap-2">
    {recommendation.agents.map((agent, index) => (
      <Button
        key={agent.id}
        onClick={() => handleCreateEvaluation(agent.id)}
        variant={hasEvaluation(agent.id) ? "secondary" : "primary"}
        className="flex items-center gap-1"
      >
        <span className="text-xs opacity-60">#{index + 1}</span>
        {agent.name}
        {hasEvaluation(agent.id) && <CheckIcon className="h-3 w-3" />}
      </Button>
    ))}
  </div>
</div>
```

## Benefits
1. **Simple**: Just one table, one relationship
2. **Flexible**: Users can still run any agent
3. **Guiding**: Clear recommendations from document owner
4. **Ordered**: Priority is expressed through order
5. **Optional**: Documents work fine without recommendations

## Future Enhancements

### Auto-Suggestions (Phase 2)
```typescript
// Suggest agents based on document characteristics
const suggestAgents = (document: Document) => {
  const suggestions = [];
  
  // Content analysis
  if (hasLinks(document.content)) suggestions.push("fact-checker");
  if (hasQuotes(document.content)) suggestions.push("source-verifier");
  if (hasTechnicalTerms(document.content)) suggestions.push("technical-reviewer");
  
  return suggestions;
};
```

### Community Recommendations (Phase 3)
- Track which agents are commonly run together
- Suggest based on similar documents
- Learn from usage patterns

### Smart Defaults (Phase 4)
- Platform-specific defaults (LessWrong → rationality-checker)
- Content-type defaults (Academic → methodology-reviewer)
- User preference learning

## Implementation Notes
- Start with manual recommendations only
- Document owner can set/update recommendations
- Show recommendations prominently but non-intrusively
- Track click-through rates for future improvements

## When to Implement
- After we have 10+ agents (currently too few to need filtering)
- When users start asking "which evaluations should I run?"
- As part of a larger "document owner tools" feature set

## Related Features
- Evaluation templates (run standard sets of agents)
- Auto-run recommended agents on document creation
- Evaluation completion badges/indicators
- Agent categories/tags for easier discovery