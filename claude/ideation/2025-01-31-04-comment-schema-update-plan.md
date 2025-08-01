# Comment Schema Update Plan

## Overview
Add four new fields to the Comment schema to enable better standardization and plugin flexibility:
- `header` - Concise summary (e.g., "2+2=5 → 2+2=4")
- `level` - Categorization: 'error' | 'warning' | 'info' | 'success'
- `source` - Plugin identifier: 'math' | 'spelling' | 'fact-check' | 'forecast'
- `metadata` - JSONB field for plugin-specific data

## Key Challenges

### 1. Database Schema Mismatch
**Challenge**: The database has separate `EvaluationComment` and `EvaluationHighlight` tables, but our TypeScript `Comment` type combines them.

**Current DB Structure**:
```
EvaluationComment
├── id
├── description
├── importance
├── grade
├── evaluationVersionId
└── highlightId → EvaluationHighlight

EvaluationHighlight
├── id
├── startOffset
├── endOffset
├── prefix
├── quotedText
├── isValid
└── error
```

**Impact**: Need to decide where new fields go - all in `EvaluationComment` or split?

### 2. Existing Data Migration
**Challenge**: ~1000s of existing comments without these fields.

**Patterns to migrate**:
- Parse `source` from description: `[Math]` → 'math'
- Infer `level` from content patterns
- Extract `header` from existing formats like "X → Y"

**Risk**: Parsing errors could corrupt data.

### 3. Plugin Update Coordination
**Challenge**: All 4 plugins need updates simultaneously.

**Each plugin must**:
- Generate `header` appropriately
- Set correct `level`
- Provide `source` identifier
- Structure `metadata` consistently

**Risk**: Partial updates break functionality.

### 4. Backwards Compatibility
**Challenge**: System must work during transition period.

**Considerations**:
- Old agents creating comments without new fields
- UI components expecting old format
- API responses changing shape

### 5. UI Display Logic
**Challenge**: UI currently generates display from description field.

**Current**: Description contains full formatted output with HTML/emojis
**Future**: UI builds display from `source` + `level` + `header` + description

**Risk**: Double-rendering issues during transition.

## Implementation Plan

### Phase 1: Schema Updates (Day 1)

1. **Update Prisma Schema**:
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
  level               String?             // enum in app layer
  source              String?
  metadata            Json?               @db.JsonB
  
  evaluationVersion   EvaluationVersion   @relation(...)
  highlight           EvaluationHighlight @relation(...)
}
```

2. **Run Prisma Migration**:
```bash
pnpm --filter @roast/db run db:migrate
```

3. **Update TypeScript Types**:
```typescript
// In documentSchema.ts
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
  source: z.enum(['math', 'spelling', 'fact-check', 'forecast']).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});
```

### Phase 2: Migration Strategy (Day 1-2)

1. **Create Migration Script**:
```typescript
// scripts/migrate-comments.ts
async function migrateComments() {
  const comments = await prisma.evaluationComment.findMany();
  
  for (const comment of comments) {
    const updates = parseCommentFields(comment.description);
    await prisma.evaluationComment.update({
      where: { id: comment.id },
      data: updates
    });
  }
}

function parseCommentFields(description: string): UpdateData {
  // Extract source
  let source: string | undefined;
  if (description.includes('[Math]')) source = 'math';
  else if (description.includes('[Spelling]')) source = 'spelling';
  // ... etc
  
  // Extract header from patterns like "X → Y"
  const arrowMatch = description.match(/([^→]+)→([^→]+)/);
  const header = arrowMatch ? arrowMatch[0].trim() : undefined;
  
  // Infer level
  let level: string | undefined;
  if (description.includes('🚨') || description.includes('Error')) level = 'error';
  else if (description.includes('✓') || description.includes('verified')) level = 'success';
  // ... etc
  
  return { source, header, level };
}
```

2. **Test on subset first**
3. **Run full migration**
4. **Verify data integrity**

### Phase 3: Plugin Updates (Day 2-3)

1. **Create Shared Interface**:
```typescript
// analysis-plugins/types/comment-builder.ts
interface CommentData {
  description: string;
  header?: string;
  level?: 'error' | 'warning' | 'info' | 'success';
  source: string;
  metadata?: Record<string, any>;
  importance?: number;
  highlight: Highlight;
}
```

2. **Update Each Plugin**:

**Math Plugin**:
```typescript
// Instead of returning just Comment
public async getComment(): Promise<Comment | null> {
  // ...
  return {
    description: message,
    header: this.expression.conciseCorrection || `Math: ${this.expression.originalText}`,
    level: this.expression.hasError ? 'error' : 'info',
    source: 'math',
    metadata: {
      expressionType: this.expression.errorType,
      complexity: this.expression.complexityScore,
      verificationStatus: this.expression.verificationStatus,
    },
    importance: this.commentImportanceScore(),
    highlight: { ... },
    isValid: true,
  };
}
```

**Similar updates for**: Spelling, Fact-check, Forecast plugins

### Phase 4: Backwards Compatibility (Day 3)

1. **Make fields optional in schema**
2. **Add fallback logic in UI**:
```typescript
// In comment display component
const displaySource = comment.source || parseSourceFromDescription(comment.description);
const displayLevel = comment.level || inferLevelFromDescription(comment.description);
```

3. **Gradual rollout**:
- Deploy schema changes
- Update plugins one by one
- Monitor for issues

### Phase 5: UI Updates (Day 4)

1. **Update Comment Display Component**:
```typescript
function CommentDisplay({ comment }: { comment: Comment }) {
  const icon = getIconForLevel(comment.level);
  const color = getColorForLevel(comment.level);
  const sourceLabel = formatSource(comment.source);
  
  return (
    <div>
      {comment.header && <div className="font-bold">{comment.header}</div>}
      <div>
        {icon} [{sourceLabel}] {comment.description}
      </div>
    </div>
  );
}
```

2. **Remove HTML/emoji generation from plugins**
3. **Move styling to UI layer**

### Phase 6: Testing & Verification (Day 4-5)

1. **Test each plugin creates valid comments**
2. **Verify migration worked correctly**
3. **Check UI displays properly**
4. **Test old agents still work**
5. **Performance testing with JSONB queries**

## Rollback Plan

If issues arise:
1. UI can fall back to parsing description
2. Plugins can be reverted individually  
3. Database migration can be reversed (fields are nullable)

## Success Criteria

- [ ] All new comments have source field
- [ ] 90%+ of existing comments successfully migrated
- [ ] No UI regressions
- [ ] Plugin outputs are cleaner (less HTML/formatting)
- [ ] Can query comments by source/level efficiently

## Future Benefits

With this foundation, we can later:
1. Add more specific filtering in UI
2. Generate analytics by plugin type
3. Create plugin-specific comment templates
4. Build the separate Finding table if needed
5. Standardize plugin development further