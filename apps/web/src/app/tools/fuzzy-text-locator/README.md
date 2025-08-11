# Fuzzy Text Locator

Multi-strategy text location finder that can locate text in documents even with variations, using strategies from exact matching to LLM-based paraphrase detection.

## How It Works

Attempts multiple search strategies in sequence: exact match, normalized quotes (smart/curly to straight), whitespace normalization, partial matching, fuzzy matching with edit distance, and optional LLM fallback for paraphrased text. Returns character offsets for precise highlighting. Can use line number hints to narrow search scope.

## Capabilities & Limitations

**Strengths:** Multiple fallback strategies ensure high success rate. Handles quote variations, whitespace differences, and minor text changes. Optional LLM fallback can find paraphrased content. Returns confidence scores for each match. Free for non-LLM strategies.

**Limitations:** LLM fallback adds cost and latency (~$0.01). May return false positives with fuzzy matching on short strings. Performance degrades on very large documents (>100k chars). Line number hints are approximate and may not perfectly align.

## Technical Details

- **Strategies:** exact, quote normalization, whitespace, partial, fuzzy, LLM
- **Options:** normalizeQuotes, partialMatch, useLLMFallback
- **Output:** Character offsets, confidence score, strategy used
- **Location:** Implementation in `/internal-packages/ai/src/tools/fuzzy-text-locator/`