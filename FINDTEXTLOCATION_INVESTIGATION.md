# findTextLocation Usage Investigation

## Summary
The `findTextLocation` function is used in multiple places with different requirements:

## 1. Core textLocationFinder.ts (Shared Module)
- **Location**: `/src/lib/documentAnalysis/shared/textLocationFinder.ts`
- **Current**: Synchronous wrapper around async fuzzy-text-locator
- **Used by**: Multiple plugin wrappers and tests
- **Issue**: Currently calling async function synchronously with LLM disabled

## 2. Plugin Location Wrappers

### 2.1 pluginLocationWrappers.ts
- **Location**: `/src/lib/documentAnalysis/shared/pluginLocationWrappers.ts`
- **Current**: All functions are SYNCHRONOUS
- **Functions**:
  - `findForecastLocation()` - sync
  - `findFactLocation()` - sync
  - `findSpellingErrorLocation()` - sync
  - `findHighlightLocation()` - sync
  - `findTextLocationWithMetadata()` - sync
- **Can change to async?**: YES, but would need to update all callers

### 2.2 simplePluginLocationWrappers.ts
- **Location**: `/src/lib/documentAnalysis/shared/simplePluginLocationWrappers.ts`
- **Current**: All functions are SYNCHRONOUS
- **Functions**:
  - `findSpellingErrorLocation()` - sync
  - `findForecastLocation()` - sync
  - `findFactLocation()` - sync
- **Can change to async?**: YES, but would need to update all callers

### 2.3 enhancedPluginLocationWrappers.ts
- **Location**: `/src/lib/documentAnalysis/shared/enhancedPluginLocationWrappers.ts`
- **Current**: All functions are ASYNC (already properly async)
- **Functions**:
  - `async findSpellingErrorLocation()` - uses LLM fallback
  - `async findForecastLocation()` - uses LLM fallback
  - `async findFactLocation()` - uses LLM fallback
  - `async findMathLocation()` - uses LLM fallback
- **Status**: ✅ Already properly async

## 3. Direct Plugin Usage

### 3.1 TextChunk class
- **Location**: `/src/lib/analysis-plugins/TextChunk.ts`
- **Methods**:
  - `async findText()` - Already async
  - `async findTextAbsolute()` - Already async
- **Status**: ✅ Already properly async

### 3.2 Spelling Plugin
- **Location**: `/src/lib/analysis-plugins/plugins/spelling/index.ts`
- **Usage**: Uses `chunk.findTextAbsolute()` which is already async
- **Status**: ✅ Already properly async

### 3.3 Math Plugin
- **Has its own**: `findMathLocation()` implementation
- **Location**: `/src/lib/analysis-plugins/plugins/math/locationFinder.ts`
- **Status**: Uses its own synchronous implementation

## 4. Test Files
- Multiple test files use `findTextLocation` synchronously
- Would need updates if main function becomes async

## Recommendations

### Option 1: Make Everything Async (Recommended)
1. Keep `findTextLocation` in textLocationFinder.ts as async
2. Update all synchronous wrappers to be async
3. Update all callers to use async/await
4. This allows full feature set including LLM fallback

### Option 2: Dual Implementation
1. Create `findTextLocationSync` that never uses LLM
2. Keep `findTextLocation` as async for enhanced features
3. Let callers choose based on their needs

### Option 3: Keep Current Hack (Not Recommended)
- Continue calling async function synchronously with LLM disabled
- This works but is fragile and limits functionality

## Key Finding
The enhanced wrappers are already async and working properly. The issue is mainly with:
1. The base textLocationFinder.ts trying to be sync
2. The simple/standard plugin wrappers being sync
3. Tests expecting sync behavior

The best path forward is to make everything async since:
- The underlying fuzzy-text-locator is async
- Enhanced features (LLM fallback) require async
- Some code paths are already async (TextChunk, enhanced wrappers)