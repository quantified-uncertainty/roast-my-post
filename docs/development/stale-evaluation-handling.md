# Document Version & Stale Evaluation Handling

## Overview

When a document is modified in RoastMyPost, all existing evaluations become "stale" because they were performed on an older version of the content. This document outlines the design decisions and implementation strategy for handling stale evaluations.

## Current System Architecture

### Document Versioning
- Each `Document` has multiple `DocumentVersion` records
- Updates create a new `DocumentVersion` with incremented version number
- Content, title, and metadata are stored per version

### Evaluation Versioning
- Each `Evaluation` (agent + document pair) has multiple `EvaluationVersion` records
- Each `EvaluationVersion` is linked to a specific `DocumentVersion`
- Highlights store character offsets that may become invalid when content changes

### Current Issues
1. **No staleness indicators** - UI shows all evaluations regardless of version match
2. **Broken highlights** - Character offsets become invalid with content changes
3. **No automatic re-evaluation** - Users must manually trigger new evaluations
4. **Confusing UX** - Users see outdated evaluations without context

## Key Design Decisions

### 1. Stale Evaluation Visibility

We have three options for handling stale evaluations in the reader view:

#### Option A: Hide All Stale Evaluations (Recommended)
- **Implementation**: Filter evaluations to only show those matching current document version
- **Pros**: 
  - Clean, unambiguous UI
  - No broken highlights
  - Clear user expectations
- **Cons**: 
  - Loss of historical context until re-evaluation
  - May surprise users when evaluations "disappear"
- **Note**: This applies specifically to the `/reader` view. Other views (evaluation history, version details) may still show stale evaluations with appropriate warnings

#### Option B: Show Stale with Clear Warnings
- **Implementation**: Display all evaluations with visual staleness indicators
- **Pros**: 
  - Preserves historical insights
  - Users can reference old evaluations
- **Cons**: 
  - Broken highlights create poor UX
  - Technical complexity for partial validity
  - Potentially confusing

#### Option C: Hybrid - Summary Only for Stale
- **Implementation**: Hide highlights but show analysis/summary with "stale" badge
- **Pros**: 
  - Some context preserved
  - No broken highlights
- **Cons**: 
  - Still potentially confusing
  - Partial information may mislead

### 2. Re-evaluation Triggers

#### Option A: Automatic Re-evaluation (Recommended for MVP)
- **Implementation**: Queue all evaluations immediately on document update
- **Pros**: 
  - Minimal staleness window (evaluations complete in minutes)
  - No user action required
  - Simpler implementation for now
- **Cons**: 
  - Cost implications for API usage
  - May re-run evaluations user doesn't care about
- **Mitigation**: Add warning dialog before document edit/re-upload to inform users

#### Option B: Manual with Choice
- **Implementation**: Show warning dialog on edit, let user choose which to re-run
- **Pros**: 
  - User maintains control
  - Cost-conscious approach
  - Explicit consent for re-evaluation
- **Cons**: 
  - More complex UI/UX
  - Requires user decision
  - Can implement later based on feedback

## Implementation Strategy (Incremental)

### Phase 1: Server-Side Filtering (Immediate)
1. Modify `DocumentModel.getDocumentWithEvaluations()` to filter evaluations at the database level
2. Only return evaluations where the latest evaluation version matches the current document version
3. Add a flag or separate method to fetch all evaluations (for history views)
4. No database schema changes required

**Key changes:**
```typescript
// In DocumentModel.getDocumentWithEvaluations()
// Filter evaluations to only include those matching current document version
const currentVersion = dbDoc.versions[0].version;
const filteredEvaluations = dbDoc.evaluations.filter(evaluation => {
  const latestEvalVersion = evaluation.versions[0];
  return latestEvalVersion?.documentVersion.version === currentVersion;
});
```

**Benefits of server-side filtering:**
- Reduced data transfer to client
- Better performance
- Cleaner separation of concerns
- Easier to add different filtering strategies for different views

### Phase 2: Add Update Warnings with Auto Re-run (Quick Enhancement)
1. Create confirmation dialog component for document edits and re-uploads
2. Show count of evaluations that will become stale and re-run automatically
3. Implement automatic re-evaluation queueing on document update
4. Add similar warning for the "Re-upload" button

**Warning message examples:**

For editing:
> "Updating this document will invalidate 3 existing evaluations. They will be automatically re-run after saving, which will incur API costs. Continue?"

For re-uploading:
> "Re-uploading this document will create a new version and invalidate 3 existing evaluations. They will be automatically re-run, which will incur API costs. Continue?"

### Phase 3: Enhanced Staleness Handling (Future)
1. Add `isStale` field to `EvaluationVersion` model
2. Create background job to mark evaluations as stale
3. Add UI to browse historical evaluation versions
4. Implement partial highlight recovery where possible

## Technical Considerations

### Highlight Validation
- Current system has `isValid` flag on highlights
- Could enhance to validate highlights on document change
- For now, simpler to hide all highlights from old versions

### Performance
- Server-side filtering reduces data transfer
- Single database query can filter by version
- Version comparison is a simple integer check at the database level

### Data Preservation
- All historical evaluations remain accessible via direct URLs
- Example: `/docs/[docId]/evals/[evalId]/versions/[versionNumber]`
- No data is deleted, only filtered from main view

### Auto Re-evaluation Implementation
When `DocumentModel.update()` is called:
1. Create new document version (existing behavior)
2. Find all evaluations for the document
3. Create new PENDING jobs for each evaluation
4. Return success with info about queued evaluations

## Migration Path

1. **Week 1**: Implement Phase 1 (hide stale evaluations)
   - Minimal code changes
   - Immediate UX improvement
   - No breaking changes

2. **Week 2**: Add Phase 2 (update warnings)
   - Gather user feedback on auto-rerun preferences
   - Monitor re-evaluation patterns

3. **Future**: Consider Phase 3 based on user needs
   - Only if users request historical evaluation browsing
   - May not be necessary if re-evaluation is fast enough

## Alternatives Considered

### Alternative: Version-Aware Highlights
- Attempt to map old highlights to new content
- Rejected due to complexity and unreliability
- Would require sophisticated diff algorithms

### Alternative: Soft Deprecation
- Show old evaluations but "grayed out"
- Rejected as it still presents broken/confusing information
- Half-measures tend to create poor UX

## Updated Recommendation

Based on feedback, the recommended approach is:

1. **Hide stale evaluations in reader view** (server-side filtering)
   - Other views can show stale evaluations with warnings
   - Prevents broken highlights in the main reading experience

2. **Automatic re-evaluation with warnings**
   - Simpler implementation for MVP
   - Clear cost warnings before user commits to changes
   - Can add manual selection later based on user feedback

3. **Server-side filtering**
   - Better performance by not sending unnecessary data
   - Cleaner architecture
   - Easier to implement different views with different filtering

This approach provides:
- Immediate fix for broken highlights
- Simple, predictable behavior
- Clear cost expectations via warnings
- Minimal staleness window (minutes)
- Room for future enhancements

The key insight is that with automatic re-evaluation, the staleness window is so short that the complexity of showing stale evaluations may not be worth it.