# Error Handling Analysis

## Summary

Critical security issues found with error messages leaking sensitive data and inconsistent error handling patterns throughout the codebase.

## Critical Security Issues

### 1. Sensitive Data Leakage

**Location**: Multiple API routes
**Risk**: Internal error details exposed to clients

Example from `/src/app/api/import/route.ts:103-106`:

```typescript
return errorResponse(
  error instanceof Error ? error.message : "Failed to import document",
  500,
  "IMPORT_ERROR"
);
```

This pattern exposes:

- Database connection errors
- Internal service failures
- Stack traces
- File paths and system information

### 2. Empty Catch Blocks

**Location**: `/src/app/api/import/route.ts:84-87`

```typescript
} catch (error) {
  // Failed to create evaluation for agent
}
```

**Impact**:

- Silent failures hide critical errors
- No logging for debugging
- User operations fail without feedback

## Inconsistent Patterns

### 1. Mixed Error Response Formats

- Some routes use `errorResponse()` helper
- Others use `NextResponse.json({ error: "..." })`
- `/src/app/api/validate-key/route.ts` doesn't use standard helpers

### 2. Console Logging Instead of Proper Logging

- **84 files** using console.log/error
- No centralized logging system
- Logs not useful in production
- No log levels or structured data

### 3. Unhandled Promise Rejections

Example from `/src/app/docs/[docId]/evaluations/EvaluationsClient.tsx:105-108`:

```typescript
} catch (error) {
  console.error("Error fetching agents:", error);
}
```

- Error logged but user gets no feedback
- UI remains in loading/broken state

## Problematic Areas by Priority

### High Priority (Security Risk)

1. **API Routes Exposing Internal Errors**

   - `/src/app/api/import/route.ts`
   - `/src/app/api/agents/route.ts:63-74`
   - Raw error messages exposed to clients

2. **Authentication Errors Not Standardized**
   - Different formats for auth failures
   - Some routes leak user existence information

### Medium Priority (Reliability)

1. **Silent Failures**

   - Empty catch blocks
   - No user feedback for failures
   - Missing React error boundaries

2. **Inconsistent Retry Logic**
   - Job processing has retries
   - Client operations don't retry

### Low Priority (Code Quality)

1. **Console Logging**
   - Should use structured logging
   - No useful production logs
   - Missing correlation IDs

## Recommendations

### 1. Sanitize Error Messages

```typescript
// Bad (current)
} catch (error) {
  console.error("Error:", error);
  return errorResponse(error.message, 500);
}

// Good (recommended)
} catch (error) {
  logger.error("Import failed", {
    error: error.message,
    stack: error.stack,
    userId,
    url
  });

  if (error instanceof ValidationError) {
    return badRequestResponse("Invalid URL format");
  }

  return serverErrorResponse("Failed to import document");
}
```

### 2. Implement Error Boundaries

```typescript
export function DocumentErrorBoundary({ children }) {
  return (
    <ErrorBoundary
      fallback={<ErrorFallback />}
      onError={(error, errorInfo) => {
        logger.error("React error boundary", { error, errorInfo });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
```

### 3. Standardize API Error Responses

```typescript
// Extend api-response-helpers.ts
export const errorTypes = {
  VALIDATION: { status: 400, code: "VALIDATION_ERROR" },
  UNAUTHORIZED: { status: 401, code: "UNAUTHORIZED" },
  FORBIDDEN: { status: 403, code: "FORBIDDEN" },
  NOT_FOUND: { status: 404, code: "NOT_FOUND" },
  CONFLICT: { status: 409, code: "CONFLICT" },
  SERVER_ERROR: { status: 500, code: "SERVER_ERROR" },
} as const;

export function apiError(type: keyof typeof errorTypes, message: string) {
  const { status, code } = errorTypes[type];
  return NextResponse.json({ error: message, code }, { status });
}
```

### 4. Add Structured Logging

```typescript
// lib/logger.ts
import winston from "winston";

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.json(),
  defaultMeta: {
    service: "roast-my-post",
    environment: process.env.NODE_ENV,
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});
```

### 5. Global Error Handler

```typescript
// app/api/middleware.ts
export async function withErrorHandler(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      return await handler(req);
    } catch (error) {
      const requestId = crypto.randomUUID();

      logger.error("Unhandled API error", {
        error: error.message,
        stack: error.stack,
        requestId,
        url: req.url,
        method: req.method,
      });

      return apiError(
        "SERVER_ERROR",
        `An error occurred. Reference: ${requestId}`
      );
    }
  };
}
```

## Action Items

1. [ ] Replace all raw error returns with sanitized messages
2. [ ] Add error boundaries to all major UI sections
3. [ ] Replace console.log with structured logging
4. [ ] Standardize all API error responses
5. [ ] Add global error handler middleware
6. [ ] Implement error monitoring (Sentry)
7. [ ] Add user-friendly error messages
8. [ ] Document error codes for API consumers
