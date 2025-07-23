# Location Finding Improvement

## Problem
The original implementation searched the entire document for each forecast text, which was:
- Inefficient (O(n*m) where n = forecasts, m = document length)
- Error-prone (could match the wrong occurrence if text appears multiple times)
- Ignoring valuable chunk position information

## Solution
Now we:
1. Store the chunk ID and chunk text with each forecast
2. Find the location within the chunk first (much smaller search space)
3. Use the chunk's position metadata to convert to document-relative positions

## Benefits
- **More accurate**: Finds the exact occurrence that was analyzed
- **More efficient**: Searches within chunks instead of entire document
- **More reliable**: Can't accidentally match text from a different part of the document

## Implementation Details
```typescript
// Old approach
const location = findForecastLocation(forecast.originalText, this.documentText, {...});

// New approach
// 1. Find within chunk
const chunkLocation = findForecastLocation(forecast.originalText, forecast.chunkText, {...});

// 2. Get chunk position
const chunk = this.chunks.find(c => c.id === forecast.chunkId);

// 3. Convert to document position
const documentLocation = {
  startOffset: chunk.metadata.position.start + chunkLocation.startOffset,
  endOffset: chunk.metadata.position.start + chunkLocation.endOffset,
  quotedText: chunkLocation.quotedText,
};
```

This ensures we always highlight the exact text that was analyzed, not just any matching text in the document.