# Spelling/Grammar Analysis Refactoring Notes

## Issues Identified

### 1. Code Duplication
- `splitIntoChunks` function duplicated in both workflow files
- `getCharacterOffsetForLine` function duplicated
- Similar error processing logic in multiple places

### 2. Type Safety
- Multiple uses of `any` type that should be properly typed
- Missing type imports in some files

### 3. File Organization
- Very large files (600+ lines) that could be split
- Test files contain console.log statements

### 4. Performance Considerations
- Parallel workflow could potentially be the default with concurrency parameter
- Consider caching convention detection for large documents

## Recommended Refactoring Steps

### Phase 1: Extract Shared Utilities ✅
- Created `utils.ts` with shared functions
- Need to update both workflow files to import from utils

### Phase 2: Improve Type Safety
- Replace all `any` types with proper interfaces
- Create proper type exports in types.ts

### Phase 3: Consolidate Workflows
- Consider merging parallel and sequential workflows
- Use a single workflow with optional concurrency parameter

### Phase 4: Clean Up Tests
- Remove or conditionally include console.log statements
- Consider using a proper test reporter

### Phase 5: Performance Optimizations
- Cache convention detection results
- Optimize chunk size based on document length
- Consider streaming for very large documents

## Implementation Priority
1. Extract utilities (High) - Reduces duplication
2. Fix type safety (High) - Prevents runtime errors
3. Clean up tests (Medium) - Better CI/CD experience
4. Consolidate workflows (Low) - Nice to have
5. Performance optimizations (Low) - For future scaling