# Legacy Code Cleanup Plan for @roast/ai Package

## Executive Summary
This document outlines a systematic approach to remove ~800+ lines of legacy code from the @roast/ai package while ensuring all tests continue to pass.

## Current State Analysis
- **Total legacy code identified**: ~800 lines across 15+ files
- **Safe to delete immediately**: ~300 lines (0 dependencies)
- **Requires migration**: ~500 lines (active dependencies with clear replacements)
- **Test coverage**: All critical paths have existing tests

## Cleanup Phases

### ✅ Phase 0: Completed Removals
- [x] `generateLinkAnalysis` function and exports
- [x] `findTextLocationWithMetadata` passthrough function

### 🚀 Phase 1: Zero-Risk Deletions (Immediate)
**Goal**: Remove completely unused code with no dependencies

#### Files to Delete:
1. `internal-packages/ai/src/workflows/documentAnalysis/shared/enhancedTextLocationFinder.ts`
   - 341 lines of unused legacy text finding logic
   - Already replaced by `fuzzy-text-locator/core.ts`
   
2. `internal-packages/ai/src/workflows/documentAnalysis/shared/simpleTextLocationFinder.ts`
   - 144 lines of unused legacy text finding logic
   - Already replaced by `fuzzy-text-locator/core.ts`

#### Expected Impact:
- **Lines removed**: ~485
- **Risk**: Zero (no imports found)
- **Tests affected**: None

### 🔄 Phase 2: Type Alias Migration
**Goal**: Remove backward compatibility type aliases

#### Migration Steps:

##### 2.1 TextLocationOptions Migration
1. Update `internal-packages/ai/src/analysis-plugins/TextChunk.ts`:
   ```typescript
   // OLD
   import { findTextLocation, type SimpleLocationOptions, type EnhancedLocationOptions } from '../tools/fuzzy-text-locator';
   
   // NEW
   import { findTextLocation, type TextLocationOptions } from '../tools/fuzzy-text-locator';
   ```

2. Update method signatures in TextChunk.ts:
   - Line 86: `SimpleLocationOptions` → `TextLocationOptions`
   - Line 136: `EnhancedLocationOptions` → `TextLocationOptions`

3. Remove aliases from:
   - `internal-packages/ai/src/tools/fuzzy-text-locator/types.ts` (lines 30-31)
   - `internal-packages/ai/src/tools/fuzzy-text-locator/index.ts` (lines 219-220)

##### 2.2 LineBasedLocation Migration
1. Update imports in:
   - `workflows/documentAnalysis/highlightGeneration/types.ts`
   - `workflows/documentAnalysis/highlightGeneration/highlightValidator.ts`
   
   ```typescript
   // OLD
   import { LineSnippetHighlight } from '../../../text-location/line-based';
   
   // NEW
   import { LineBasedLocation } from '../../../text-location/line-based';
   ```

2. Update function calls:
   - Replace `createHighlight()` with `lineLocationToOffset()`
   - Replace `convertOffsetToLineBased()` with `offsetToLineLocation()`

3. Remove from `text-location/line-based/index.ts`:
   - Line 23: Type alias export
   - Lines 403-411: `createHighlight` function
   - Lines 416-422: `convertOffsetToLineBased` function

#### Expected Impact:
- **Lines changed**: ~20
- **Lines removed**: ~30
- **Risk**: Low (simple type replacements)
- **Tests affected**: May need import updates

### 🔧 Phase 3: Plugin Location Wrapper Simplification
**Goal**: Remove unnecessary abstraction layers

#### Current State:
```typescript
// Each wrapper adds ~40 lines of boilerplate
findHighlightLocation() → findTextLocation()
findFactLocation() → findTextLocation()
findSpellingErrorLocation() → findTextLocation()
findForecastLocation() → findTextLocation()
```

#### Migration Steps:
1. Update `highlightExtraction/index.ts` to use `findTextLocation` directly
2. Remove `pluginLocationWrappers.ts` entirely (~212 lines)

#### Expected Impact:
- **Lines removed**: ~212
- **Risk**: Medium (requires careful testing)
- **Tests affected**: Integration tests for highlight extraction

### 📦 Phase 4: Legacy Client Export Migration
**Goal**: Remove legacy Anthropic/OpenAI client exports

#### Migration Steps:
1. Find and update all usages of:
   ```typescript
   // OLD
   anthropic.messages.create()
   openai.chat
   
   // NEW
   createAnthropicClient().messages.create()
   createOpenAIClient().chat
   ```

2. Remove legacy exports from `types/openai.ts` (lines 75-102)

#### Expected Impact:
- **Lines removed**: ~30
- **Risk**: Medium-High (external dependencies possible)
- **Tests affected**: Math verification tests

## Testing Strategy

### After Each Phase:
```bash
# Run type checking
pnpm --filter @roast/ai run typecheck

# Run linting
pnpm --filter @roast/ai run lint

# Run unit tests
pnpm --filter @roast/ai run test:unit

# Run integration tests (if phase affects them)
pnpm --filter @roast/ai run test:integration
```

### Full Test Suite After All Phases:
```bash
# Run all tests including expensive LLM tests
pnpm --filter @roast/ai run test
```

## Success Metrics
- ✅ All existing tests pass
- ✅ No TypeScript errors
- ✅ No new lint errors
- ✅ ~800 lines of code removed
- ✅ Improved maintainability score
- ✅ Reduced cognitive complexity

## Rollback Plan
Each phase is committed separately. If issues arise:
1. `git revert HEAD` to undo the last phase
2. Debug and fix the issue
3. Re-apply the phase with corrections

## Timeline
- Phase 1: Immediate (5 minutes)
- Phase 2: 30 minutes
- Phase 3: 1 hour
- Phase 4: 1 hour

Total estimated time: ~3 hours

## Current Status
- [x] Phase 0: Initial cleanup complete
- [x] Phase 1: Complete - Removed 485 lines of unused legacy text finders
- [x] Phase 2: Complete - Migrated all type aliases and removed backward compatibility functions  
- [x] Phase 3: Complete - Removed plugin location wrapper abstraction layers
- [x] Phase 4: Complete - Removed all legacy client exports (no migration needed!)

## Cleanup Results (ALL PHASES COMPLETE!)
- **Lines removed**: ~800+ lines
- **Files deleted**: 3 (enhancedTextLocationFinder.ts, simpleTextLocationFinder.ts, pluginLocationWrappers.ts)
- **Type aliases removed**: 4 (SimpleLocationOptions, EnhancedLocationOptions, LineSnippetHighlight)
- **Backward compatibility functions removed**: 5 (createHighlight, convertOffsetToLineBased, generateLinkAnalysis, findTextLocationWithMetadata, improvedTokenEstimate)
- **Legacy exports removed**: 2 (anthropic, openai objects)
- **Legacy comments cleaned**: 2 test runner files
- **Abstraction layers removed**: 1 (plugin location wrappers with 4 wrapper functions)
- **Tests status**: All passing ✅

## Phase 3 Details (Completed)
- **Removed**: `pluginLocationWrappers.ts` (212 lines) - contained 4 wrapper functions:
  - `findForecastLocation()` - unused forecast wrapper
  - `findFactLocation()` - unused fact-check wrapper  
  - `findSpellingErrorLocation()` - unused spelling wrapper
  - `findHighlightLocation()` - used by highlight extraction
- **Migrated**: `highlightExtraction/index.ts` to use `findTextLocation` directly
- **Added**: Local `findHighlightLocation` function with same logic inline
- **Benefit**: Removed unnecessary abstraction layer, improved maintainability

## Phase 4 Details (Completed)
- Discovered that NO code was actually using the legacy `anthropic` and `openai` exports
- Both files that appeared to use them were already using the factory functions
- Removed `anthropic` object export from types/openai.ts
- Removed `openai` object export from types/openai.ts  
- Bonus: Removed unused `improvedTokenEstimate` function
- Bonus: Cleaned up legacy comments from test runners