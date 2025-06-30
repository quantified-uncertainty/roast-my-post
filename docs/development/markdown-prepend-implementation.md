# markdownPrepend Implementation

## Overview

This document tracks the implementation of the `markdownPrepend` feature, which adds document metadata (title, author, publication, date) to the beginning of document content. This ensures consistency between what evaluation agents analyze and what users see in the UI.

## Rationale

- **Consistency**: Evaluation agents see exactly what gets displayed to users
- **Metadata Highlighting**: Allows comments on title, author, publication, date fields
- **Backward Compatibility**: Existing evaluations remain valid as their offsets include the prepend
- **Flexibility**: Display format can change without invalidating existing evaluations

## Implementation Status

### Phase 1: Database Schema ✅
- [x] Created branch `markdown-prepend-feature`
- [ ] Add `markdownPrepend String?` field to DocumentVersion model
- [ ] Run database migration

### Phase 2: Utility Functions ✅
- [x] Create `generateMarkdownPrepend` utility function
- [x] Add tests for utility function

### Phase 3: Document Analysis Updates ✅
- [x] Update `comprehensiveAnalysis/prompts.ts` to use markdownPrepend
- [x] Update `commentExtraction/prompts.ts` to use markdownPrepend  
- [x] Update `linkAnalysis/prompts.ts` to use markdownPrepend
- [x] Ensure LineBasedHighlighter receives content with prepend
- [x] Update URL extraction in linkAnalysisWorkflow

### Phase 4: Display Updates ✅
- [x] Update DocumentWithEvaluations to use markdownPrepend from database
- [x] Add fallback for documents without markdownPrepend

### Phase 5: Document Import Updates 📋
- [ ] Update articleImport.ts to generate markdownPrepend on import
- [ ] Update any other document creation endpoints

### Phase 6: Testing ✅
- [x] Create test utilities for handling prepend
- [x] Update existing tests to handle both cases (with/without prepend)
- [x] Add new tests for prepend functionality
- [x] Run full test suite - All tests passing!

## Technical Details

### markdownPrepend Format
```markdown
# [Document Title]

**Author:** [Author Name]

**Publication:** [Platform Names]

**Date Published:** [Month DD, YYYY]

---

```

### Key Challenges

1. **Line Number Offsets**: When prepend is added, all line numbers in the original content shift down
2. **Character Offsets**: All character-based highlight positions shift by the prepend length
3. **Test Data**: Existing tests use hard-coded line references that assume no prepend
4. **Backward Compatibility**: Must handle documents created before this feature

### Solutions

1. **Conditional Prepend**: Check if `document.versions[0]?.markdownPrepend` exists
2. **Test Utilities**: Create helpers to adjust line references in tests
3. **Gradual Rollout**: Use feature detection rather than requiring all documents to have prepend

## Testing Strategy

### Unit Tests
- Test generateMarkdownPrepend with various inputs
- Test prompt generation with and without prepend
- Test line number adjustments

### Integration Tests  
- Test full document analysis workflow with prepend
- Test highlight position accuracy
- Test backward compatibility

### Manual Testing
- Import new document and verify prepend is created
- Run evaluation and verify highlights align correctly
- Check existing documents still work

## Known Issues

### Issue 1: Test Line References
- **Problem**: Tests reference specific line numbers that change with prepend
- **Solution**: Create test utilities to adjust line references dynamically

### Issue 2: Exact Format Matching
- **Problem**: Any difference in prepend format breaks highlight alignment
- **Solution**: Single source of truth for prepend generation

## Progress Log

### 2024-06-30
- Created implementation plan
- Started with Phase 3 (Document Analysis Updates) per user request
- Created this documentation file

---

*This document will be updated as implementation progresses.*