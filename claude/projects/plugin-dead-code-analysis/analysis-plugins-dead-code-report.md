# Analysis Plugins Dead Code Report

## Executive Summary

The `/src/lib/analysis-plugins` directory contains significant dead code. While the plugin system is actively used for document analysis (through `multiEpistemicEval`), many utility files and abstractions are completely unused.

## Active Code Path

The actual usage flow is:
1. `analyzeDocument()` → checks `extendedCapabilityId`
2. For "multi-epistemic-eval" or "spelling-grammar" → `analyzeWithMultiEpistemicEval()`
3. `analyzeWithMultiEpistemicEval()` → creates `PluginManager` instance
4. `PluginManager.analyzeDocument()` → dynamically imports and runs plugins:
   - ✅ Math plugin (enabled)
   - ❌ Spelling plugin (disabled in code)
   - ✅ Fact-check plugin (enabled)
   - ✅ Forecast plugin (enabled)

## Dead Code Categories

### 1. Completely Unused Files (15 files)
These files are not imported anywhere in the codebase:

#### Core Architecture (unused abstractions)
- `PluginContext.ts` - Context passing system (never used)
- `builders/PromptBuilder.ts` - Prompt building utility
- `builders/SchemaBuilder.ts` - Schema building utility
- `analyzers/ErrorPatternAnalyzer.ts` - Error analysis system

#### Utility Files (unused helpers)
- `utils/commentGenerator.ts` - Comment generation utilities
- `utils/extractionHelper.ts` - Extraction helper
- `utils/findTextInChunk.ts` - Text finding in chunks
- `utils/findingToHighlight.ts` - Finding to highlight conversion
- `utils/pluginHelpers.ts` - Various plugin helpers
- `utils/pluginLoggerHelper.ts` - Logging helpers

#### Plugin-specific unused code
- `plugins/math/simpleMathLocationFinder.ts` - Alternative math location finder
- `plugins/forecast/commentGeneration.ts` - Forecast comment generation
- `plugins/index.ts` - Plugin re-exports (plugins are imported directly)

#### Top-level files
- `index.ts` - Main exports file (everything is imported directly)

### 2. Test-Only Files (5 files)
These are only imported by test files:

- `TextChunk.ts` - Only used by tests and internal utilities
- All plugin files when accessed directly (they're dynamically imported in production)

### 3. Disabled Code

#### Spelling Plugin
The spelling plugin is commented out in `PluginManager.ts`:
```typescript
// new (await import("./plugins/spelling")).SpellingPlugin(),
```

This makes all spelling-related code effectively dead:
- `plugins/spelling/index.ts`
- `plugins/spelling/conventionDetector.ts`
- `plugins/spelling/grading.ts`
- `plugins/spelling/commentGeneration.ts`

### 4. Partially Used Code

#### PluginLogger.ts
- The file exports many interfaces and classes
- Only `PluginLogger` class is actually used by `PluginManager`
- Unused exports: `PluginLogEntry`, `PluginExecutionSummary`

## Recommendations

### Immediate Actions
1. **Remove completely unused files** (15 files) - These add confusion and maintenance burden
2. **Remove or fix the spelling plugin** - Either enable it or remove all related code
3. **Consolidate exports** - Remove unused export files like `index.ts` and `plugins/index.ts`

### Code Organization
1. **Inline simple utilities** - Many helper files have single functions that could be inlined
2. **Remove unused abstractions** - PluginContext, builders, and analyzers are over-engineering
3. **Simplify the plugin interface** - The current system has too many layers

### Testing Strategy
1. **Move test utilities to test directories** - Don't keep test-only code in src
2. **Add integration tests** - Ensure the actual code path through `analyzeDocument` is tested

## Impact Analysis

### Removing dead code would:
- Reduce codebase size by ~30% in this directory
- Improve code clarity and navigation
- Reduce TypeScript compilation time
- Make the actual plugin architecture clearer

### Risk Assessment
- **Low risk**: Most dead code is completely unused
- **Medium risk**: Spelling plugin removal needs careful checking
- **Test coverage**: Good test coverage exists for active plugins

## File-by-File Recommendations

| File | Action | Reason |
|------|--------|---------|
| `PluginContext.ts` | Delete | Never used |
| `builders/*` | Delete | Over-engineered, never used |
| `analyzers/*` | Delete | Never used |
| `utils/commentGenerator.ts` | Delete | Functionality exists elsewhere |
| `utils/pluginHelpers.ts` | Review & inline | Some functions might be useful |
| `plugins/spelling/*` | Delete or fix | Currently disabled |
| `index.ts` | Delete | Not needed with direct imports |

## Next Steps

1. **Verify spelling plugin status** - Is it intentionally disabled?
2. **Check with team** - Ensure no planned features depend on dead code
3. **Create cleanup PR** - Remove dead code in phases
4. **Update documentation** - Reflect the actual architecture