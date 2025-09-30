# Link Checker

An automated link validation agent that checks all external URLs in documents for accessibility, validity, and potential issues. Provides detailed reporting on broken links, redirects, and connection problems.

## Tools Used

- **[Link Validator](/tools/link-validator)** - Extracts and validates all URLs from a text, checking their accessibility and returning detailed validation results



## Configuration

**Processing Limits:**
- Maximum URLs to check per document: **50**
- Timeout per URL check: **10 seconds**
- Maximum redirects to follow: **5**

**Grading:**
- Grade = (Working Links / Total Links) × 100
- 100% = All links working
- 0% = All links broken

**Automatic Processing:**
- This plugin runs on **all documents** automatically (no routing needed)
- No LLM usage - pure HTTP validation (zero cost)

## How It Works

Extracts all external URLs from the document and validates each one by checking HTTP status codes and following redirects. The agent identifies broken links (404s), server errors (5xx), excessive redirects, and connection timeouts. Results are provided with exact text locations for easy correction.

## Capabilities

- **Comprehensive URL extraction** - Finds all external links in markdown, HTML, and plain text formats
- **Status code validation** - Checks HTTP/HTTPS responses and categorizes issues
- **Redirect chain analysis** - Follows and reports redirect chains up to reasonable limits
- **Timeout handling** - Gracefully handles slow or unresponsive servers
- **Bulk processing** - Efficiently validates multiple URLs with parallel checking
- **Detailed reporting** - Provides exact link text and surrounding context for each issue

## Error Categories

- **404 Not Found**: Page doesn't exist
- **5xx Server Errors**: Server-side problems
- **Connection Timeouts**: Server too slow or unreachable
- **Too Many Redirects**: Excessive redirect chains
- **Network Errors**: DNS, SSL, or connection issues

## Technical Details

- **Supported protocols:** HTTP, HTTPS
- **Validation method:** HTTP HEAD requests with GET fallback
- **User agent rotation:** Attempts multiple user agents to avoid bot detection
- **Cost:** $0 (no LLM usage)

---
*This documentation is programmatically generated from source code. Do not edit manually.*
