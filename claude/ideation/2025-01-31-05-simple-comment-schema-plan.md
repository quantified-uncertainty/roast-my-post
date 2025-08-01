# Simple Comment Schema Update Plan

## Goal
Add 4 new fields to EvaluationComment table and start using them in plugins.

## Step 1: Database Schema Update

```prisma
model EvaluationComment {
  id                  String              @id @default(uuid())
  description         String
  importance          Int?
  grade               Int?
  evaluationVersionId String
  highlightId         String              @unique
  
  // New fields
  header              String?
  level               String?             
  source              String?
  metadata            Json?               @db.JsonB
  
  evaluationVersion   EvaluationVersion   @relation(fields: [evaluationVersionId], references: [id], onDelete: Cascade)
  highlight           EvaluationHighlight @relation(fields: [highlightId], references: [id], onDelete: Cascade)
}
```

## Step 2: TypeScript Updates

```typescript
// documentSchema.ts
export const CommentSchema = z.object({
  description: z.string(),
  title: z.string().optional(),
  observation: z.string().optional(),
  significance: z.string().optional(),
  importance: z.number().optional(),
  grade: z.number().optional(),
  highlight: HighlightSchema,
  isValid: z.boolean(),
  error: z.string().optional(),
  
  // New fields
  header: z.string().optional(),
  level: z.enum(['error', 'warning', 'info', 'success']).optional(),
  source: z.string().optional(), // 'math', 'spelling', etc.
  metadata: z.record(z.string(), z.any()).optional(),
});
```

## Step 3: Plugin Updates (Examples)

### Math Plugin
```typescript
return {
  description: message,
  header: expression.conciseCorrection || undefined,
  level: expression.hasError ? 'error' : 'info',
  source: 'math',
  metadata: {
    errorType: expression.errorType,
    verificationStatus: expression.verificationStatus,
    complexity: expression.complexityScore,
  },
  importance: this.commentImportanceScore(),
  highlight: { ... },
  isValid: true,
};
```

### Spelling Plugin
```typescript
return {
  description: message,
  header: error.conciseCorrection, // "teh → the"
  level: 'error',
  source: 'spelling',
  metadata: {
    errorType: error.type,
    confidence: error.confidence,
  },
  importance,
  highlight: { ... },
  isValid: true,
};
```

## Step 4: UI Fallback Logic

```typescript
// Comment display component
function getSourceLabel(comment: Comment): string {
  if (comment.source) return comment.source;
  
  // Fallback for old comments
  if (comment.description.includes('[Math]')) return 'math';
  if (comment.description.includes('[Spelling]')) return 'spelling';
  // etc...
  return 'unknown';
}

function getLevel(comment: Comment): string {
  if (comment.level) return comment.level;
  
  // Fallback for old comments
  if (comment.description.includes('🚨') || comment.description.includes('Error')) return 'error';
  if (comment.description.includes('✓')) return 'success';
  // etc...
  return 'info';
}
```

## Rollout Order

1. **Database migration** - Add nullable fields
2. **TypeScript types** - Update schemas
3. **One plugin** - Start with spelling (simplest)
4. **UI updates** - Add fallback logic
5. **Test** - Verify new comments work
6. **Other plugins** - Roll out to math, fact-check, forecast

## No Breaking Changes

- All fields nullable
- UI handles both old and new formats
- Existing comments keep working
- Gradual plugin updates

## Benefits

- Cleaner comment data structure
- Plugin-specific metadata preserved
- Better UI control over display
- Foundation for future improvements