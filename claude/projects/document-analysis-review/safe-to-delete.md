# DocumentAnalysis - Safe to Delete Files

## Verified Completely Unused Files (Safe to Delete)

These files have been verified to have zero imports from any source:

### 1. Main Export File
- `index.ts` - Unused barrel export (everything imported directly)

### 2. Demo/Test Data
- `multiEpistemicEval/demo-metadata.ts` - Demo metadata (3KB)

### 3. Unused Location Utilities
- `utils/LocationUtils.ts` - Location utilities (9.2KB) 
- `shared/simplePluginLocationWrappers.ts` - Plugin wrappers (1.9KB)
- `shared/enhancedPluginLocationWrappers.ts` - Enhanced wrappers (3.6KB)

### 4. Unused Shared Utilities
- `shared/types.ts` - Shared types (0.6KB)
- `shared/retryUtils.ts` - Retry logic (1.8KB)
- `shared/errorCategorization.ts` - Error categorization (4.6KB)

### 5. Unused Prompt Files
- `linkAnalysis/prompts.ts` - Link analysis prompts (2.1KB)

### 6. Unused Type Files
- `highlightGeneration/types.ts` - Highlight types (0.8KB)

## Total Impact
- **10 files**
- **~31KB of code**
- **23% of the directory**

## Deletion Script

```bash
#!/bin/bash
cd /Users/ozziegooen/Documents/Github/ui-cleanup

# Delete unused files
git rm src/lib/documentAnalysis/index.ts
git rm src/lib/documentAnalysis/multiEpistemicEval/demo-metadata.ts
git rm src/lib/documentAnalysis/utils/LocationUtils.ts
git rm src/lib/documentAnalysis/shared/types.ts
git rm src/lib/documentAnalysis/shared/simplePluginLocationWrappers.ts
git rm src/lib/documentAnalysis/shared/retryUtils.ts
git rm src/lib/documentAnalysis/shared/errorCategorization.ts
git rm src/lib/documentAnalysis/shared/enhancedPluginLocationWrappers.ts
git rm src/lib/documentAnalysis/linkAnalysis/prompts.ts
git rm src/lib/documentAnalysis/highlightGeneration/types.ts
```

## Files That Need Further Investigation

### Test-Only Files (Might be needed for tests)
- `testUtils.ts` - Used only by test files
- `shared/textLocationFinder.ts` - Used only by test files

### Potentially Duplicative (But Still Used)
These files are still imported but represent duplication:
- `shared/simpleTextLocationFinder.ts` - Should use /tools/fuzzy-text-locator
- `shared/enhancedTextLocationFinder.ts` - Should use /tools/fuzzy-text-locator
- `shared/pluginLocationWrappers.ts` - Might be consolidatable

## Recommendations

1. **Delete the 10 verified unused files immediately**
2. **Keep test-only files** if tests are still passing
3. **Plan refactor** for location finding consolidation in a separate task