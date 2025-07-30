# Security Vulnerabilities Analysis

## Summary
Multiple critical security vulnerabilities found: unprotected API routes exposing sensitive data, error messages leaking internal information, missing input validation, and potential timing attacks on API key verification.

## Critical Vulnerabilities

### 1. Unprotected API Routes Exposing Sensitive Data

#### VULNERABILITY: Public Access to System Metrics
- **Files Affected**: 
  - `/src/app/api/monitor/evaluations/route.ts` (entire file)
  - `/src/app/api/monitor/jobs/route.ts` (entire file)  
  - `/src/app/api/monitor/stats/route.ts` (entire file)
- **Severity**: CRITICAL
- **Risk**: Exposes cost data, user evaluation content, system performance metrics

**Proof of Concept**:
```bash
# Anyone can access these endpoints
curl http://localhost:3000/api/monitor/stats
curl http://localhost:3000/api/monitor/evaluations  
curl http://localhost:3000/api/jobs/[any-job-id]
```

**Data Exposed**:
- Total costs and token usage
- User evaluation content
- Internal job logs and errors
- User counts and activity

**Fix Required** - Add to each route:
```typescript
// At the start of each GET function
import { authenticateRequest } from "@/lib/auth-helpers";
import { commonErrors } from "@/lib/api-response-helpers";

export async function GET(request: NextRequest) {
  const userId = await authenticateRequest(request);
  if (!userId) {
    return commonErrors.unauthorized();
  }
  
  // Add admin check for monitor routes
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });
  
  if (user?.role !== 'ADMIN') {
    return commonErrors.forbidden();
  }
  
  // ... existing code
}
```

### 2. Information Disclosure in Error Messages

#### VULNERABILITY: Raw Error Messages Exposed to Clients
- **Files**:
  - `/src/app/api/import/route.ts:103-106`
  - `/src/app/api/agents/route.ts:63-74`
  - Multiple other API routes
- **Severity**: HIGH

**Current Code** (example from import route):
```typescript
// Line 103-106 - LEAKS INTERNAL ERRORS!
return errorResponse(
  error instanceof Error ? error.message : "Failed to import document",
  500,
  "IMPORT_ERROR"
);
```

**Leaked Information Examples**:
- Database connection strings
- File system paths
- Internal service URLs
- Stack traces

**Fix**:
```typescript
// Never expose raw errors
return errorResponse(
  "Failed to import document. Please try again.",
  500,
  "IMPORT_ERROR"
);

// Log detailed error server-side only
logger.error("Import failed", { 
  error: error.message,
  stack: error.stack,
  userId,
  url 
});
```

### 3. Missing Input Validation

#### VULNERABILITY: No Validation on User Inputs
- **Files**:
  - `/src/app/api/import/route.ts` - URL input not validated
  - `/src/app/api/agents/[agentId]/eval-batch/route.ts` - targetCount unchecked
  - Multiple routes accepting JSON without validation
- **Severity**: HIGH

**Example - Unvalidated URL Import**:
```typescript
// /src/app/api/import/route.ts:31
const { url, agentIds } = await request.json();
// No validation before using URL!
```

**Risks**:
- SSRF attacks (Server-Side Request Forgery)
- Internal network scanning
- File system access via file:// URLs

**Fix**:
```typescript
import { z } from "zod";

const ImportSchema = z.object({
  url: z.string().url().startsWith("http"),
  agentIds: z.array(z.string().uuid()).optional()
});

const body = await request.json();
const parsed = ImportSchema.safeParse(body);

if (!parsed.success) {
  return badRequestResponse("Invalid request data");
}

const { url, agentIds } = parsed.data;
```

### 4. API Key Timing Attack Vulnerability

#### VULNERABILITY: Non-Constant Time API Key Comparison
- **File**: `/src/lib/auth-helpers.ts`
- **Line**: SHA-256 comparison
- **Severity**: MEDIUM

**Issue**: Using standard string comparison for API key hashes allows timing attacks

**Fix**:
```typescript
import { timingSafeEqual } from 'crypto';

// Use constant-time comparison
const hashBuffer = Buffer.from(hashedKey, 'hex');
const storedHashBuffer = Buffer.from(apiKey.hashedKey, 'hex');

if (!timingSafeEqual(hashBuffer, storedHashBuffer)) {
  return null;
}
```

### 5. Missing Rate Limiting

#### VULNERABILITY: No Rate Limiting on Sensitive Endpoints
- **Affected**: All authentication endpoints, API key validation
- **Severity**: HIGH

**Risks**:
- Brute force attacks on authentication
- API key guessing
- Resource exhaustion

**Fix** - Implement rate limiting:
```typescript
// /src/lib/rate-limiter.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 requests per minute
});

// Use in routes
const identifier = request.ip ?? "anonymous";
const { success } = await ratelimit.limit(identifier);

if (!success) {
  return new Response("Too Many Requests", { status: 429 });
}
```

### 6. CORS and Security Headers

#### VULNERABILITY: Missing Security Headers
- **All API routes lack security headers**
- **Severity**: MEDIUM

**Missing Headers**:
- X-Content-Type-Options
- X-Frame-Options  
- Content-Security-Policy
- Strict-Transport-Security

**Fix** - Add to `next.config.js`:
```javascript
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

### 7. Dependency Vulnerabilities

#### NPM Audit Results
```
1 low severity vulnerability:
- brace-expansion RegEx DoS (in sucrase dependency)
```

**Fix**:
```bash
npm audit fix
```

## Security Checklist

### Immediate Actions (TODAY)
- [ ] Protect ALL monitor routes with authentication
- [ ] Add admin role check to sensitive endpoints
- [ ] Fix error message leakage in all API routes
- [ ] Add URL validation to import endpoint

### High Priority (This Week)
- [ ] Implement rate limiting on auth endpoints
- [ ] Add input validation schemas to all routes
- [ ] Configure security headers
- [ ] Fix timing attack vulnerability
- [ ] Add CORS restrictions

### Testing Commands

```bash
# Test unprotected routes
for route in monitor/stats monitor/evaluations monitor/jobs; do
  echo "Testing /api/$route"
  curl -s http://localhost:3000/api/$route | jq .
done

# Test error leakage
curl -X POST http://localhost:3000/api/import \
  -H "Content-Type: application/json" \
  -d '{"url": "file:///etc/passwd"}'

# Check security headers
curl -I http://localhost:3000/api/agents
```

## Recommended Security Tools

1. **Install security linting**:
```bash
npm install --save-dev eslint-plugin-security
```

2. **Add pre-commit security scan**:
```bash
# .husky/pre-commit
npx audit-ci --low
```

3. **Implement security monitoring**:
- Sentry for error tracking (configured to not leak sensitive data)
- Rate limiting with Upstash or Redis
- WAF rules in production

## Impact Assessment

- **Data at risk**: User evaluations, cost data, system metrics
- **Potential attackers**: Anyone with API knowledge
- **Exploitation difficulty**: Trivial (no auth required)
- **Business impact**: High (data breach, cost exposure)