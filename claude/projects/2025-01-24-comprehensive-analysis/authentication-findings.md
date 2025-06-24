# Authentication Implementation Analysis

## Summary
The application uses NextAuth.js v5 (beta.28) with a dual authentication system supporting both session-based and API key authentication.

## Key Findings

### Authentication Providers
- **Email Authentication Only**: Uses Resend provider for magic link authentication
- **No OAuth Providers**: Currently only email-based authentication is implemented
- **Database Sessions**: Not using JWT, sessions stored in PostgreSQL

### Dual Authentication System

1. **Session Authentication** (via NextAuth):
   - Used primarily for web UI interactions
   - Sessions stored in database with expiry tracking
   - No custom middleware file - authentication handled per-route

2. **API Key Authentication**:
   - Keys prefixed with `oa_` (e.g., `oa_xxxxx...`)
   - Stored as SHA-256 hashes in the database
   - Support for expiration dates and usage tracking
   - 32 bytes of entropy (256 bits) generated using `crypto.randomBytes`
   - Maximum 10 API keys per user

### Authentication Helpers
Two standardized authentication helpers in `/src/lib/auth-helpers.ts`:

1. **`authenticateRequest()`**: API key first, then session
   - Used for routes that prioritize programmatic access
   - Example: `/api/import/route.ts`

2. **`authenticateRequestSessionFirst()`**: Session first, then API key
   - Used for routes that prioritize web UI access
   - Example: `/api/agents/route.ts`

## Security Strengths
1. ✅ API keys are properly hashed before storage (SHA-256)
2. ✅ Strong entropy for API key generation (256 bits)
3. ✅ Proper error handling with typed error enums
4. ✅ API key format validation (`oa_` prefix, minimum length)
5. ✅ Support for key expiration
6. ✅ Rate limiting on usage tracking (updates lastUsedAt only once per hour)
7. ✅ Comprehensive auth error types for debugging

## Security Concerns
1. ⚠️ No apparent rate limiting on authentication attempts
2. ⚠️ No middleware-level authentication - each route must implement checks
3. ⚠️ SHA-256 for API keys is fast but consider if timing attacks are a concern
4. ⚠️ No apparent audit logging for authentication events
5. ⚠️ Bearer token scheme might expose keys in logs/proxies if not careful

## Recommendations
1. Implement rate limiting on authentication attempts
2. Consider middleware-level authentication to avoid per-route implementation
3. Add audit logging for authentication events
4. Consider using Argon2 or bcrypt for API key hashing to prevent timing attacks
5. Ensure proper log sanitization to prevent API key exposure