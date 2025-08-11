# Link Validator

Extracts and validates all URLs from text using parallel HTTP requests. Provides detailed validation results including redirects, status codes, and error categorization.

## How It Works

Extracts URLs from text using regex patterns (supports http/https), then validates each link using the existing link validation infrastructure from the imports system. Performs actual HTTP requests to check accessibility, follows redirects to get final URLs, and categorizes errors by type (timeout, DNS, connection, HTTP status).

## Capabilities & Limitations

**Strengths:** Zero cost - no LLM usage. Parallel validation for efficiency. Detailed error breakdown by type. Captures final URLs after redirects. Returns content type and status codes. Configurable URL limit (default 20).

**Limitations:** Some sites block automated requests. Cannot validate JavaScript-rendered content or pages behind authentication. Limited to http/https URLs. May trigger rate limiting on aggressive validation. Uses HEAD requests which some servers reject.

## Technical Details

- **Validation method:** HTTP requests with timeout handling
- **Default limit:** 20 URLs per validation
- **Error types:** timeout, DNS failure, connection refused, HTTP errors
- **Output:** URL list, validation results, summary statistics
- **Location:** Implementation in `/internal-packages/ai/src/tools/link-validator/`