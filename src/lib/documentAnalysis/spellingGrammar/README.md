# Spelling & Grammar Analysis Module

This module provides document analysis for spelling and grammar errors using LLM-based analysis.

## Key Features

- **Chunk-based Analysis**: Divides documents into manageable chunks for analysis
- **Precise Line Numbers**: Tracks exact line numbers for accurate highlight placement
- **Word-level Precision**: Identifies specific words or phrases with errors
- **Clear Explanations**: Provides actionable corrections for each error

## Architecture

```
spellingGrammar/
├── analyzeChunk.ts         # Core LLM analysis function
├── highlightConverter.ts   # Converts line-based to character offsets
├── types.ts               # TypeScript interfaces
├── index.ts               # Module exports
└── __tests__/            # Comprehensive test suite
```

## Usage

```typescript
import { analyzeChunk, convertHighlightsToComments } from './spellingGrammar';

// Create a chunk with line numbers
const chunk: ChunkWithLineNumbers = {
  content: "This have an error.",
  startLineNumber: 10,
  lines: ["This have an error."]
};

// Analyze for errors
const highlights = await analyzeChunk(chunk, {
  agentName: "Grammar Agent",
  primaryInstructions: "Find spelling and grammar errors"
});

// Convert to UI format
const comments = convertHighlightsToComments(highlights, fullDocumentContent);
```

## Highlight Format

The module uses a clean format that includes the actual error text:

```typescript
{
  lineStart: 10,           // 1-based line number
  lineEnd: 10,             // Same as lineStart for single-line
  highlightedText: "have", // Exact text with error
  description: "Grammar error: 'This' (singular) requires 'has'. Suggested correction: 'has'"
}
```

## Testing

- **Unit Tests**: Mock LLM responses for fast testing
- **LLM Tests**: Real API calls for integration testing
- **Line Number Tests**: Extensive tests for offset accuracy

Run tests:
```bash
npm run test:unit -- src/lib/documentAnalysis/spellingGrammar/
npm run test:llm -- src/lib/documentAnalysis/spellingGrammar/
```

## Future Enhancements

1. **Full Workflow**: Create `spellingGrammarWorkflow.ts` for complete document processing
2. **Document Chunking**: Smart chunking that respects paragraph boundaries
3. **Batch Processing**: Process multiple chunks in parallel
4. **Caching**: Cache results for repeated analyses