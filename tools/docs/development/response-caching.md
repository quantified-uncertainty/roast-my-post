# Response Caching for Development

## Overview

The project uses Helicone for LLM response caching. When `HELICONE_CACHE_ENABLED=true` is set, Helicone can cache and reuse responses for identical requests. However, by default, each job run creates unique session IDs that prevent effective caching.

To enable response caching for development/testing, the tools now use **content-based cache seeds** that remain consistent across runs with identical inputs.

## How It Works

### Helicone Caching

Helicone caching is controlled by these environment variables:
```bash
HELICONE_CACHE_ENABLED=true          # Enable response caching
HELICONE_CACHE_MAX_AGE=3600          # Cache duration in seconds
HELICONE_CACHE_BUCKET_MAX_SIZE=1000  # Max cache entries per bucket
```

### Content-Based Cache Seeds

Each tool generates a deterministic cache seed based on its input:

```typescript
// Example from fact-checking tool
const contentHash = crypto.createHash('sha256')
  .update(input.text + input.instructions + input.minQualityThreshold)
  .digest('hex')
  .substring(0, 16);
const cacheSeed = `fact-extract-${contentHash}`;
```

This ensures that:
- Identical inputs → Same cache seed → Cache hit
- Different inputs → Different cache seed → Cache miss

### Implemented Tools

The following tools now use content-based cache seeds:

1. **extract-factual-claims**: `fact-extract-{hash}`
2. **extract-math-expressions**: `math-extract-{hash}`
3. **extract-forecasting-claims**: `forecast-extract-{hash}`
4. **check-spelling-grammar**: `spelling-{hash}`
5. **check-math**: `math-check-{hash}`
6. **fact-checker**: `fact-check-{hash}`

## Benefits

- **Faster Development**: Re-run analyses without waiting for LLM responses
- **Cost Savings**: Reuse cached responses instead of making new API calls
- **Consistent Testing**: Get identical results for identical inputs
- **Easy A/B Testing**: Compare different agent versions on the same content

## Important Notes

1. **Forecaster Tool**: The forecaster tool intentionally adds randomization to ensure varied predictions. It does NOT use deterministic caching.

Note: The `extract-forecasting-claims` tool (which extracts forecasting statements) DOES use caching, but the `forecaster` tool (which makes predictions) does not.

2. **Session Headers**: While session IDs are still unique per job, the cache seed overrides them for caching purposes.

3. **Cache Invalidation**: Change any input parameter (text, instructions, thresholds) to get fresh results.

## Example Usage

```bash
# First run - makes actual API calls
npm run process-jobs
# Takes ~40 seconds, costs API tokens

# Second run - uses cached responses
npm run process-jobs  
# Takes ~5 seconds, no API costs!

# To force fresh results, change any input parameter
# or clear Helicone's cache through their dashboard
```

## Technical Implementation

The caching is implemented in:
- `/lib/claude/wrapper.ts`: Added `cacheSeed` parameter to Claude API calls
- `/tools/*/index.ts`: Each tool generates its own content-based cache seed
- Helicone uses the `Helicone-Cache-Seed` header to determine cache keys