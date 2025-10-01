# Link Validator

Extracts and validates all URLs from a text, checking their accessibility and returning detailed validation results

## What it does

- **Finds All Links**: Automatically detects URLs in markdown, HTML, and plain text
- **Multi-Strategy Validation**: Tests HEAD requests first, falls back to GET with different user agents
- **Categorizes Errors**: Classifies failures (403 Forbidden, 404 Not Found, timeouts, network errors)
- **Generates Statistics**: Provides link health summary and error breakdown
- **Creates Highlights**: Positions comments for broken links in documents
- **Zero LLM Usage**: Pure HTTP validation - fast and cost-effective

## Error Types

**NotFound (404)**: Page doesn't exist
**Forbidden (403)**: Access denied (common with bot detection)
**Timeout**: Request timed out
**NetworkError**: DNS, SSL, or connection issues
**RateLimited (429)**: Too many requests
**ServerError (5xx)**: Server-side problems

## Key Features

- **Respectful Validation**: Uses delays between requests, tries multiple user agents
- **Context-Aware Messages**: Adapts reporting based on predominant error types
- **Batch Processing**: Handles up to 20 URLs per request (configurable)
- **Redirect Handling**: Tracks final URLs after redirects
- **Performance Focused**: 10-second timeout per request

## Use Cases

- **Research Papers**: Verify citation links and references
- **Blog Posts**: Check external links for accessibility
- **Documentation**: Ensure all referenced links work
- **Content Quality**: Identify broken or inaccessible resources

## Example Output

**Access-restricted focus** (many 403s):
"🚫 Links Blocked by Access Restrictions - Found 8 inaccessible URLs, primarily due to access restrictions."

**Broken links focus** (many 404s):
"❌ Broken Links Detected - Found 6 broken or non-existent URLs that may need updating."

## Important Notes

- No prescriptive recommendations - focuses on status reporting only
- Many websites block automated access even when content exists
- Always verify important links manually for critical documents
- 403 errors often indicate bot detection, not broken content
- Best used as first pass before human review

## Limitations

Cannot access paywalled content. Some sites block all automated requests regardless of content availability.
