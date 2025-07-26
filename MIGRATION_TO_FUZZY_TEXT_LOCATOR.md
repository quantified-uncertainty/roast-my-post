# Migration Guide: Using the Unified Fuzzy Text Locator

## Overview

We've consolidated multiple `findTextLocation` implementations across the codebase into a single, unified tool: `fuzzy-text-locator`. This guide helps you migrate from the old implementations to the new unified API.

## What Changed

### Before (4 different implementations):
- `/lib/analysis-plugins/utils/locationFinder.ts` - Plugin system's location finder
- `/lib/documentAnalysis/shared/textLocationFinder.ts` - Document analysis location finder  
- `/lib/documentAnalysis/shared/pluginLocationWrappers.ts` - Plugin-specific wrappers
- Inline implementations in various plugins

### After (1 unified implementation):
- `/tools/fuzzy-text-locator/core.ts` - Single source of truth

## Migration Steps

### 1. Update Imports

#### Old imports:
```typescript
// From plugin utilities
import { findTextLocation } from '@/lib/analysis-plugins/utils/locationFinder';

// From document analysis
import { findTextLocation } from '@/lib/documentAnalysis/shared/textLocationFinder';

// From plugin wrappers
import { findForecastLocation, findFactLocation } from '@/lib/documentAnalysis/shared/pluginLocationWrappers';
```

#### New import:
```typescript
import { findTextLocation } from '@/tools/fuzzy-text-locator/core';
```

### 2. Update Function Calls

#### Basic usage (no changes needed):
```typescript
const location = findTextLocation(searchText, documentText);
```

#### With options:

**Old:**
```typescript
const location = findTextLocation(searchText, documentText, {
  fuzzyMatch: true,
  lineNumber: 42,
  maxDistance: 100
});
```

**New:**
```typescript
const location = findTextLocation(searchText, documentText, {
  partialMatch: true,
  maxTypos: 2,
  // lineNumber and maxDistance are no longer needed
});
```

### 3. Option Mapping

| Old Option | New Option | Notes |
|------------|------------|-------|
| `fuzzyMatch` | `maxTypos` | Use `maxTypos: 2` for fuzzy matching |
| `allowPartialMatch` | `partialMatch` | Renamed for consistency |
| `caseInsensitive` | `caseSensitive` | Inverted - default is now case-insensitive |
| `context` | `llmContext` | Renamed to clarify it's for LLM fallback |
| `allowFuzzy` | `maxTypos` | Use `maxTypos: 2` or `3` |
| `normalizeWhitespace` | (removed) | Always normalized |
| `expandToBoundaries` | (removed) | Not used in practice |

### 4. Plugin-Specific Migrations

#### Forecast Plugin:
```typescript
// Old
import { findForecastLocation } from '@/lib/documentAnalysis/shared/pluginLocationWrappers';
const location = findForecastLocation(text, doc, { allowPartialMatch: true });

// New
import { findTextLocation } from '@/tools/fuzzy-text-locator/core';
const location = findTextLocation(text, doc, { 
  partialMatch: true,
  maxTypos: 2,
  pluginName: 'forecast'
});
```

#### Fact-Check Plugin:
```typescript
// Old
import { findFactLocation } from '@/lib/documentAnalysis/shared/pluginLocationWrappers';
const location = findFactLocation(claim, doc, { allowFuzzy: true, context: ctx });

// New
import { findTextLocation } from '@/tools/fuzzy-text-locator/core';
const result = findTextLocation(claim, doc, {
  maxTypos: 2,
  llmContext: ctx,
  caseSensitive: true,
  pluginName: 'fact-check'
});

// Add line information if needed
if (result) {
  const lineNumber = getLineNumberAtPosition(doc, result.startOffset);
  const lineText = getLineAtPosition(doc, result.startOffset);
}
```

### 5. Return Value Changes

The return value structure remains the same:
```typescript
interface TextLocation {
  startOffset: number;
  endOffset: number;
  quotedText: string;
  strategy: string;     // Which search strategy found it
  confidence: number;   // 0-1 confidence score
}
```

Note: Some wrappers added extra fields like `lineNumber` and `lineText`. You'll need to calculate these separately if needed:

```typescript
import { getLineNumberAtPosition, getLineAtPosition } from '@/lib/analysis-plugins/utils/textHelpers';

const location = findTextLocation(searchText, documentText);
if (location) {
  const lineNumber = getLineNumberAtPosition(documentText, location.startOffset);
  const lineText = getLineAtPosition(documentText, location.startOffset);
}
```

## Benefits of Migration

1. **Consistency**: One implementation means consistent behavior across all uses
2. **Performance**: Optimized search strategies with proper fallback cascade
3. **Accuracy**: Better fuzzy matching with uFuzzy library
4. **LLM Fallback**: Optional LLM-based search for difficult cases
5. **Maintenance**: Single codebase to maintain and improve

## Need Help?

- See `/docs/tools/fuzzy-text-locator.md` for detailed API documentation
- Check `/tools/fuzzy-text-locator/README.md` for usage examples
- Run tests: `npm test src/tools/fuzzy-text-locator/tests/`