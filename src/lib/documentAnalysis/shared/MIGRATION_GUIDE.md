# Text Location Finder Migration Guide

This guide shows how to migrate existing location finding code to use the new unified `textLocationFinder`.

## Overview

The new unified text location finder provides:

- **Multiple search strategies** (exact, fuzzy, context-based, normalized)
- **Consistent interfaces** across all plugins
- **Rich location metadata** (line numbers, confidence scores, strategy used)
- **Extensible architecture** for plugin-specific needs
- **Better performance** through optimized strategy ordering

## Migration Examples

### 1. Forecast Plugin Migration

**Before:**
```typescript
// src/lib/documentAnalysis/plugin-system/plugins/forecast/locationFinder.ts
export function findForecastLocation(
  searchText: string,
  documentText: string,
  options: {
    allowPartialMatch?: boolean;
    normalizeQuotes?: boolean;
  } = {}
): ForecastLocation | null {
  // Custom implementation with multiple strategies
  // ~200 lines of code
}
```

**After:**
```typescript
// Import the unified finder and wrapper
import { findForecastLocation } from '@/lib/documentAnalysis/shared/pluginLocationWrappers';

// Usage remains exactly the same!
const location = findForecastLocation(searchText, documentText, {
  allowPartialMatch: true,
  normalizeQuotes: true
});
```

**Benefits:**
- Maintains existing API compatibility
- Reduces code duplication from ~200 lines to 0
- Adds new fuzzy matching capabilities automatically
- Gets confidence scores and strategy information

### 2. Fact-Check Plugin Migration

**Before:**
```typescript
// Custom strategy pattern implementation
class ExactMatchStrategy implements LocationStrategy {
  // Implementation
}
class NormalizedMatchStrategy implements LocationStrategy {
  // Implementation  
}
// ... more strategies

export function findFactLocation(claimText: string, documentText: string) {
  // Try each strategy manually
}
```

**After:**
```typescript
import { findFactLocation } from '@/lib/documentAnalysis/shared/pluginLocationWrappers';

// Same API, better implementation
const location = findFactLocation(claimText, documentText, {
  allowFuzzy: true,
  context: additionalContext
});

// Now includes line numbers, confidence, and strategy info
console.log(`Found via ${location.strategy} with confidence ${location.confidence}`);
```

### 3. Spelling Plugin Migration

**Before:**
```typescript
export function findSpellingErrorLocation(
  errorText: string,
  chunkText: string,
  options: FindOptions = {}
): LocationResult | null {
  // Simple exact + context matching
}
```

**After:**
```typescript
import { findSpellingErrorLocation } from '@/lib/documentAnalysis/shared/pluginLocationWrappers';

// API unchanged, enhanced functionality
const location = findSpellingErrorLocation(errorText, chunkText, {
  allowPartialMatch: true,
  context: options.context
});
```

### 4. Highlight Extraction Migration

**Before:**
```typescript
// Manual line-based parsing in highlightExtraction/index.ts
const lineMatch = insight.location.match(/[Ll]ines?\\s*(\\d+)(?:\\s*-\\s*(\\d+))?/);
let startLine = 1;
let endLine = 1;

if (lineMatch) {
  startLine = parseInt(lineMatch[1]);
  endLine = lineMatch[2] ? parseInt(lineMatch[2]) : startLine;
}

// Manual character snippet extraction
let startCharacters = startLineContent.slice(0, 10).trim();
let endCharacters = endLineContent.length > 10 
  ? endLineContent.slice(-10).trim() 
  : endLineContent.trim();
```

**After:**
```typescript
import { findHighlightLocation } from '@/lib/documentAnalysis/shared/pluginLocationWrappers';

// Simplified, more robust
const location = findHighlightLocation(insight.suggestedHighlight, fullContent, {
  lineNumber: startLine,
  contextBefore: beforeContext,
  contextAfter: afterContext
});

// Gets all the metadata automatically
const highlight: LineBasedHighlight = {
  description: insight.suggestedHighlight,
  importance: 5,
  highlight: {
    startLineIndex: location.startLineIndex,
    endLineIndex: location.endLineIndex,
    startCharacters: location.startCharacters,
    endCharacters: location.endCharacters,
  },
};
```

## Advanced Usage

### Custom Key Phrase Extractors

For plugin-specific fuzzy matching, you can provide custom key phrase extractors:

```typescript
import { findTextLocationWithMetadata } from '@/lib/documentAnalysis/shared/pluginLocationWrappers';

const location = findTextLocationWithMetadata(searchText, documentText, {
  allowFuzzy: true,
  keyPhraseExtractors: [
    // Domain-specific extractor
    (text: string) => {
      const patterns = [
        /\\b(hypothesis|conclusion|finding)\\s+\\w+/gi,
        /\\d+\\.\\d+%\\s+\\w+/g,
        /\\b(significant|correlation|p-value)\\b.{0,20}/gi
      ];
      
      const phrases: string[] = [];
      for (const pattern of patterns) {
        const matches = text.match(pattern);
        if (matches) phrases.push(...matches);
      }
      return phrases;
    }
  ]
});
```

### Boundary Expansion

Control how matches are expanded:

```typescript
const location = findTextLocationWithMetadata(searchText, documentText, {
  allowPartialMatch: true,
  expandToBoundaries: 'sentence', // 'sentence' | 'paragraph' | 'none'
  minPartialMatchLength: 30
});
```

### Multiple Text Locations

Process multiple searches efficiently:

```typescript
import { findMultipleTextLocations } from '@/lib/documentAnalysis/shared/textLocationFinder';

const searches = [
  { text: 'first claim', context: 'surrounding context 1' },
  { text: 'second claim', context: 'surrounding context 2' },
  { text: 'third claim' }
];

const results = await findMultipleTextLocations(searches, documentText, {
  allowFuzzy: true,
  normalizeWhitespace: true
});

for (const [text, location] of results) {
  if (location) {
    console.log(`Found "${text}" via ${location.strategy} at offset ${location.startOffset}`);
  }
}
```

## Migration Checklist

When migrating existing location finding code:

- [ ] **Import the appropriate wrapper** from `pluginLocationWrappers.ts`
- [ ] **Update function calls** to use the new API (usually just changing the import)
- [ ] **Test with existing data** to ensure compatibility
- [ ] **Consider enabling new features** like fuzzy matching or boundary expansion
- [ ] **Update tests** to expect the new return format (if using full metadata)
- [ ] **Remove old location finder files** once migration is complete

## Performance Considerations

The new unified finder is generally faster because:

- **Strategy ordering** tries fastest approaches first
- **Early termination** stops at the first successful match
- **Optimized text processing** with better algorithms
- **Parallel processing** for multiple searches

## Backward Compatibility

All wrapper functions maintain 100% API compatibility with existing code. The only changes needed are import statements.

## Getting Full Metadata

If you want access to all the new metadata (confidence scores, strategy used, line information), use the main function:

```typescript
import { findTextLocationWithMetadata } from '@/lib/documentAnalysis/shared/pluginLocationWrappers';

const location = findTextLocationWithMetadata(searchText, documentText, options);

if (location) {
  console.log(`Strategy: ${location.strategy}`);
  console.log(`Confidence: ${location.confidence}`);
  console.log(`Line: ${location.lineNumber}`);
  console.log(`Line text: ${location.lineText}`);
}
```

This is particularly useful for debugging and analytics.