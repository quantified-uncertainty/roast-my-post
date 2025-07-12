# Experiment 10: Chunked Analysis

This experiment tests analyzing a document in chunks and then consolidating the results, compared to analyzing the entire document at once.

## Purpose

To explore whether breaking a document into chunks for parallel analysis provides:
1. Better error detection (more focused analysis per section)
2. Faster overall processing (parallel API calls)
3. Cost efficiency
4. Better handling of context limitations

## Structure

The input document is split into 3 roughly equal chunks:
- `chunk1.md` - Introduction and "Too much of a good thing?" section
- `chunk2.md` - "The simple graphical explanation" section
- `chunk3.md` - "An intuitive explanation" through the end

## How to Run

1. Set your API key:
   ```bash
   export ANTHROPIC_API_KEY="your-key-here"
   ```

2. Run the chunked analysis:
   ```bash
   node analyze-chunks.js
   ```

## Process Flow

1. **Parallel Chunk Analysis**: All 3 chunks are analyzed simultaneously
2. **Individual Reports**: Each chunk gets its own error analysis
3. **Consolidation**: Results are sent to Claude to create a unified report
4. **Summary Generation**: Timing and cost data saved to `summary.json`

## Output Files

- `chunk1-analysis.md` - Errors found in chunk 1
- `chunk2-analysis.md` - Errors found in chunk 2  
- `chunk3-analysis.md` - Errors found in chunk 3
- `consolidated-report.md` - Final consolidated error report
- `summary.json` - Performance metrics and cost breakdown

## Benefits of Chunking

1. **Parallel Processing**: Multiple API calls run simultaneously
2. **Focused Analysis**: Each chunk gets dedicated attention
3. **Graceful Failure**: If one chunk fails, others still complete
4. **Context Management**: Smaller chunks = more focused prompts

## Trade-offs

1. **Extra Consolidation Step**: Requires additional API call to merge results
2. **Potential Duplication**: Same error might be caught multiple times
3. **Loss of Context**: Errors spanning chunks might be missed
4. **More Complex**: More moving parts than single-shot analysis

## Key Metrics

Compare with single-document analysis:
- Total execution time
- Total cost
- Number of unique errors found
- Quality of error descriptions