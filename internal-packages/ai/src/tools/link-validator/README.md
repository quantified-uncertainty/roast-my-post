# Link Validator Tool

## What This Tool Does

The Link Validator tool extracts and validates all external links in documents, providing detailed accessibility status and error categorization. It offers comprehensive link health analysis without using any LLM calls.

Also known as the "Simple Link Validator" agent, this tool checks all external links in documents and reports their accessibility status with clear error categorization and context-aware messaging about link health.

## Core Capabilities

- **Automatic Link Detection**: Finds all URLs in document content (markdown links, HTML links, plain URLs)
- **Multi-Strategy Validation**: Tests HEAD requests first, falls back to GET requests with different user agents
- **Smart Error Classification**: Categorizes failures as 403 Forbidden, 404 Not Found, timeouts, network errors, etc.
- **Highlight Generation**: Creates positioned comments for broken links in documents
- **Context-Aware Reporting**: Adapts messaging based on predominant error types

## Usage

```typescript
import { linkValidator } from '@roast/ai/server';

// Basic usage
const result = await linkValidator.run({
  text: documentContent,
  maxUrls: 20  // optional, defaults to 20
}, {
  logger: console
});

// Result includes:
// - urls: string[] - all URLs found
// - validations: detailed validation results for each URL
// - summary: statistics about link health
```

## Output Structure

### Summary Statistics
```typescript
{
  totalLinks: number,
  workingLinks: number,
  brokenLinks: number,
  errorBreakdown: {
    NotFound: number,
    Forbidden: number,
    Timeout: number,
    NetworkError: number,
    // ... other error types
  }
}
```

### Individual Link Validations
Each URL validation includes:
- `url`: Original URL
- `finalUrl`: URL after redirects (if different)
- `accessible`: Boolean indicating if link works
- `error`: Error details if link failed
- `details`: Response details if link succeeded

## Error Types

- **NotFound** (404): Page doesn't exist
- **Forbidden** (403): Access denied
- **Timeout**: Request timed out
- **NetworkError**: DNS, SSL, or connection errors
- **RateLimited** (429): Too many requests
- **ServerError** (5xx): Server-side errors
- **Unknown**: Other HTTP errors

## Advanced Features

### Highlight Generation
Generate document highlights for link issues:

```typescript
import { generateLinkHighlights } from '@roast/ai/tools/link-validator/linkHighlightGenerator';

const highlights = generateLinkHighlights(
  validationResults,
  urls,
  documentContent,
  targetHighlights // optional limit
);
```

### Analysis Report Generation
Create detailed analysis reports:

```typescript
import { generateLinkAnalysisAndSummary } from '@roast/ai/tools/link-validator/linkAnalysisReporter';

const { analysis, summary, grade } = generateLinkAnalysisAndSummary(
  validationResults,
  documentTitle
);
```

## Example Messages

**Access-restriction focused** (when most errors are 403s):
> 🚫 Links Blocked by Access Restrictions  
> Found 8 inaccessible URLs, primarily due to access restrictions. Many websites block automated access, even though the content exists.

**Broken-links focused** (when most errors are 404s):
> ❌ Broken Links Detected  
> Found 6 broken or non-existent URLs. These may be hallucinated links or references to content that has moved or been deleted.

## When to Use

**Ideal for**: 
- Research papers with citations
- Blog posts with external references
- News articles
- Documentation with external links
- Any content where link quality affects credibility

**Less suitable for**: 
- Documents without external links
- Creative writing
- Internal documentation with private URLs

## Technical Notes

- Uses respectful validation with delays between requests
- Tries multiple user agents to handle basic bot detection  
- 10-second timeout per request for performance
- Processes URLs in batches of 10 to avoid overwhelming servers
- No prescriptive recommendations - focuses on status reporting only
- Zero LLM usage - all validation is done directly