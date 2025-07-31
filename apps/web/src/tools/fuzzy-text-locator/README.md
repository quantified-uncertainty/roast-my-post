# Fuzzy Text Locator

A powerful text location tool that finds text within documents using multiple search strategies, from exact matching to AI-powered semantic search.

## Overview

The Fuzzy Text Locator uses a cascade of search strategies to find text positions in documents:

1. **Exact Match** - Fastest, requires perfect character-for-character match
2. **Quote-Normalized Match** - Handles smart quotes, apostrophes, and similar variations
3. **Partial Match** - Finds the longest matching substring for truncated text
4. **Fuzzy Match (uFuzzy)** - Tolerates typos, case differences, and minor variations
5. **LLM Fallback** - Uses AI to find paraphrased or semantically similar text

## Key Features

- **Multi-strategy approach**: Tries simple strategies first, falls back to complex ones
- **Character-level precision**: Returns exact start/end positions in the document
- **Confidence scoring**: Each strategy provides a confidence score (0.0-1.0)
- **Quote normalization**: Handles smart quotes, em-dashes, ellipses automatically
- **Partial matching**: Finds truncated quotes or partial text
- **Semantic search**: Optional LLM fallback for paraphrased content

## Usage

### Basic Example

```typescript
import { findTextLocation } from '@/tools/fuzzy-text-locator';

const result = await findTextLocation(
  "sample document",
  "This is a sample document with some text.",
  { normalizeQuotes: true }
);
// Returns: { startOffset: 10, endOffset: 25, quotedText: "sample document", strategy: "exact", confidence: 1.0 }
```

### Options

```typescript
interface TextLocationOptions {
  // Basic options
  normalizeQuotes?: boolean;    // Handle quote/apostrophe variations
  partialMatch?: boolean;       // Match partial/truncated text
  caseSensitive?: boolean;      // Case-sensitive matching (default: false)
  
  // Fuzzy matching options
  maxTypos?: number;           // Maximum typos allowed in fuzzy search
  
  // LLM options
  useLLMFallback?: boolean;    // Use AI for semantic search
  llmContext?: string;         // Context to help AI understand
  pluginName?: string;         // For tracking/logging
}
```

## Search Strategies

### Exact Match
- **Speed**: Fastest
- **Use case**: When you have the exact text
- **Confidence**: 1.0

### Quote-Normalized Match
- **Speed**: Fast
- **Use case**: Text with smart quotes, apostrophes, em-dashes
- **Confidence**: 1.0
- **Example**: "don't" matches "don't"

### Partial Match
- **Speed**: Fast
- **Use case**: Truncated quotes or first part of long text
- **Confidence**: 0.65-0.7
- **Example**: "The research shows" matches longer quote starting with those words

### Fuzzy Match (uFuzzy)
- **Speed**: Medium
- **Use case**: Text with typos, case differences, minor variations
- **Confidence**: 0.6-0.95
- **Example**: "mashine learning" matches "machine learning"

### LLM Fallback
- **Speed**: Slow (API call)
- **Use case**: Paraphrased text, semantic similarity
- **Confidence**: 0.5-0.9
- **Example**: "car drove fast" matches "automobile moved swiftly"

## Architecture

```
fuzzy-text-locator/
├── index.ts          # Main tool class and exports
├── core.ts           # Core search orchestration logic
├── exactSearch.ts    # Simple exact string matching
├── uFuzzySearch.ts   # Fuzzy matching with uFuzzy library
├── llmSearch.ts      # LLM-based semantic search
├── types.ts          # Shared TypeScript types
└── tests/            # Comprehensive test suite
```

## Testing

The tool includes a comprehensive test suite with 80+ test cases covering:
- Basic exact matching
- Quote and punctuation variations
- Whitespace handling
- Unicode characters
- Partial matches
- Typos and fuzzy matching
- Long documents
- Edge cases

Run tests:
```bash
npm test -- src/tools/fuzzy-text-locator/tests/
```

## Performance Considerations

- Strategies are tried in order from fastest to slowest
- Most searches complete in < 10ms without LLM
- LLM fallback adds 500-2000ms depending on text length
- For large documents, consider chunking for better performance

## Integration with Plugins

The tool is designed to be used by analysis plugins:

```typescript
import { findTextLocation } from '@/tools/fuzzy-text-locator';

// In your plugin
const location = await findTextLocation(
  errorText,
  documentText,
  {
    normalizeQuotes: true,
    useLLMFallback: true,
    pluginName: 'my-plugin'
  }
);
```

## Future Improvements

- [ ] Add caching for repeated searches
- [ ] Implement parallel search strategies
- [ ] Add support for regex patterns
- [ ] Optimize for very large documents
- [ ] Add more language-specific normalizations