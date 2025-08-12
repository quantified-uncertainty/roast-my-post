# Fuzzy Text Locator

Multi-strategy text location tool that finds text positions in documents using cascading search methods from exact matching to AI-powered semantic search.

## What it does

- **Locates Text**: Finds exact character positions of text within documents
- **Multiple Strategies**: Uses 5 search methods in order of speed (exact → fuzzy → AI)
- **Handles Variations**: Works with typos, quote differences, partial matches
- **Character Precision**: Returns exact start/end positions in document
- **Confidence Scoring**: Each match includes reliability score (0.0-1.0)

## Search Strategy Cascade

1. **Exact Match**: Perfect character match (fastest, confidence: 1.0)
2. **Quote-Normalized**: Handles smart quotes, apostrophes ("don't" vs "don't")
3. **Partial Match**: Finds truncated text ("The research shows..." matches longer quote)
4. **Fuzzy Match**: Tolerates typos, case differences ("mashine learning" → "machine learning")
5. **LLM Fallback**: AI semantic search for paraphrased content ("car drove fast" → "automobile moved swiftly")

## Key Features

- **Fast Performance**: Simple strategies first (most searches complete in <10ms)
- **Quote Normalization**: Automatic handling of smart quotes, em-dashes, ellipses
- **Partial Matching**: Works with truncated or incomplete text snippets
- **Typo Tolerance**: Configurable fuzzy matching for common errors
- **Semantic Search**: Optional AI fallback for meaning-based matching

## Use Cases

- **Plugin Text Location**: Find error text in documents for highlighting
- **Quote Verification**: Locate quoted text with formatting variations
- **Content Matching**: Find similar text across different documents
- **Error Highlighting**: Position comments and annotations precisely

## Configuration Options

- **normalizeQuotes**: Handle quote/apostrophe variations
- **partialMatch**: Match truncated text
- **maxTypos**: Control fuzzy matching tolerance
- **useLLMFallback**: Enable AI semantic search (slower but more flexible)

## Important Notes

- Strategies tried in speed order (fast → slow)
- Most searches complete without needing AI fallback
- LLM fallback adds 500-2000ms but handles paraphrasing
- Comprehensive test suite with 80+ edge cases
- Used by analysis plugins for precise text positioning

## Limitations

Performance decreases with document size. LLM fallback requires API access and increases response time.