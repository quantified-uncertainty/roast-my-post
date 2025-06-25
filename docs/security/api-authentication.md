# API Authentication Standards

## Overview

All API endpoints MUST use consistent authentication that supports both API keys and session-based authentication. This document defines the mandatory patterns to prevent security vulnerabilities.

## Critical Security Issue

**NEVER use `auth()` directly in API routes.** This creates inconsistent authentication where some endpoints only work with sessions while others work with API keys, creating security gaps and user experience issues.

## Required Authentication Patterns

### 1. Use `authenticateRequest()` (Recommended)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  const userId = await authenticateRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Your handler logic here
}
```

### 2. Use `withAuth()` Wrapper (For Complex Routes)

```typescript
import { withAuthGET, withAuthPOST } from "@/lib/auth-wrapper";

export const GET = withAuthGET(async (request, userId) => {
  // Your handler logic here
  // userId is guaranteed to be present
});

export const POST = withAuthPOST(async (request, userId) => {
  // Your handler logic here
});
```

### 3. Routes with Parameters

```typescript
import { withAuthParams } from "@/lib/auth-wrapper";

export const GET = withAuthParams(async (request, params, userId) => {
  // Access to params.id, params.slug, etc.
  // userId is guaranteed to be present
});
```

## Authentication Flow

1. **API Key First**: Checks for `Authorization: Bearer rmp_...` header
2. **Session Fallback**: If no API key, checks for valid session
3. **Unified Response**: Returns consistent 401 if neither auth method works

## Security Features

- **Dual Authentication**: Supports both API keys and browser sessions
- **Consistent Behavior**: All endpoints work the same way
- **Rate Limiting**: API keys are rate-limited automatically
- **Audit Trail**: API key usage is tracked with `lastUsedAt` timestamps
- **Expiration**: API keys can have expiration dates

## ESLint Enforcement

A custom ESLint rule prevents direct usage of `auth()` in API routes:

```javascript
// ❌ FORBIDDEN - Inconsistent auth
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

// ✅ REQUIRED - Consistent auth
import { authenticateRequest } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  const userId = await authenticateRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
```

## API Key Format

- **Prefix**: All API keys start with `rmp_`
- **Length**: Minimum 40 characters
- **Storage**: Keys are hashed using SHA-256 before database storage
- **Headers**: Sent as `Authorization: Bearer rmp_...`

## Testing Authentication

```bash
# Test API key auth
curl -H "Authorization: Bearer rmp_your_key_here" http://localhost:3000/api/documents/search?q=test

# Test session auth (browser will send cookies automatically)
curl -b cookies.txt http://localhost:3000/api/documents/search?q=test
```

## Migration Guide

If you find an endpoint using `auth()` directly:

1. **Replace imports**:
   ```typescript
   // Old
   import { auth } from "@/lib/auth";
   
   // New
   import { authenticateRequest } from "@/lib/auth-helpers";
   ```

2. **Update handler signature**:
   ```typescript
   // Old
   export async function GET(request: Request) {
   
   // New
   export async function GET(request: NextRequest) {
   ```

3. **Replace auth logic**:
   ```typescript
   // Old
   const session = await auth();
   if (!session?.user?.id) {
     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }
   
   // New
   const userId = await authenticateRequest(request);
   if (!userId) {
     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }
   ```

## Enforcement

- **ESLint Rule**: `local/auth-consistency` catches violations
- **Code Review**: All API routes must be reviewed for auth consistency
- **Testing**: MCP server tests ensure API key auth works on all endpoints

## Exception Cases

Very rare cases might need session-only auth (like user settings pages that shouldn't work with API keys). In these cases:

1. **Document the reason** in code comments
2. **Add to ESLint ignore** with justification
3. **Get security review approval**

## Related Files

- `/src/lib/auth-helpers.ts` - Main authentication functions
- `/src/lib/auth-wrapper.ts` - HOC wrappers for routes
- `/src/lib/auth-api.ts` - API key authentication logic
- `/eslint-rules/auth-consistency.js` - ESLint rule