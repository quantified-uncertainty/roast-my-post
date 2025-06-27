# Simple Link Validator

## What This Agent Does

The Simple Link Validator checks all external links in documents and reports their accessibility status. It provides clear error categorization and context-aware messaging about link health.

## Core Capabilities

- **Automatic Link Detection**: Finds all URLs in document content
- **Multi-Strategy Validation**: Tests HEAD requests first, falls back to GET requests with different user agents
- **Smart Error Classification**: Categorizes failures as 403 Forbidden, 404 Not Found, timeouts, or network errors
- **Context-Aware Reporting**: Adapts messaging based on predominant error types

## Output

### Analysis Report
- **Link Health Overview**: Total links, working vs broken counts, percentages
- **Contextual Error Message**: Specific explanation based on error types found
- **Reliability Score**: 0-100% rating based on link success rate

### Individual Comments
- ✅ **Verified Links**: Working links with HTTP status
- 🚫 **Access Denied**: 403 Forbidden errors
- ❌ **Broken Links**: 404 Not Found errors
- ⏱️ **Timeouts**: Network timeout issues

## Example Messages

**Access-restriction focused** (when most errors are 403s):
> 🚫 Links Blocked by Access Restrictions  
> Found 8 inaccessible URLs, primarily due to access restrictions. Many websites block automated access, even though the content exists.

**Broken-links focused** (when most errors are 404s):
> ❌ Broken Links Detected  
> Found 6 broken or non-existent URLs. These may be hallucinated links or references to content that has moved or been deleted.

## When to Use

**Ideal for**: Research papers, blog posts with citations, news articles, any content where link quality affects credibility

**Less suitable for**: Documents without external links, creative writing, internal documentation

## Technical Notes

- Uses respectful validation with delays between requests
- Tries multiple user agents to handle basic bot detection  
- 10-second timeout per request for performance
- No prescriptive recommendations - focuses on status reporting only