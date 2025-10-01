# Fuzzy Text Locator

Find the location of text within documents using multiple search strategies including exact matching, fuzzy matching, quote normalization, partial matching, and LLM fallback for paraphrased or difficult-to-find text

## How It Works

Uses cascading search strategies to find text within documents, trying faster methods first (exact match, quote normalization) before falling back to slower methods (fuzzy matching, LLM semantic search). Each match returns exact character positions with confidence scores (0.0-1.0).

## Capabilities & Limitations

**Strengths:** Multiple search strategies (exact, quote-normalized, partial, fuzzy, LLM semantic). Handles typos, quote variations, truncated text, and paraphrasing. Fast performance for simple matches (<10ms). Character-precise positioning with confidence scoring. Comprehensive test suite with 80+ edge cases.

**Limitations:** Performance decreases with document size. LLM fallback requires API access and adds 500-2000ms. Cannot handle severe paraphrasing without LLM fallback enabled.

## Technical Details

- Strategy cascade: exact → quote-normalized → (partial | fuzzy | markdown-aware) → LLM
- Confidence scoring: 0.0-1.0 scale
- Configuration options: normalizeQuotes, partialMatch, maxTypos, useLLMFallback
- Primary use case: Precise text positioning for analysis plugin annotations
