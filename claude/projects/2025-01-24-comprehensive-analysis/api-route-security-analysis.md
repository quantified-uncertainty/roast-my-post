# API Route Security Analysis

## Summary
Critical security gaps found in multiple API routes exposing sensitive system data without authentication.

## Critical Security Issues

### 1. Unprotected Monitor Routes (HIGH RISK)
These routes expose sensitive operational data without any authentication:

- `/api/monitor/evaluations` - Returns recent evaluations with detailed data
- `/api/monitor/jobs` - Returns job queue information
- `/api/monitor/stats` - Returns system statistics including costs

**Risk**: Exposes internal system metrics, costs, and operational data to anyone.

### 2. Unprotected Data Routes (HIGH RISK)
- `/api/jobs/[jobId]` - Returns job details including logs and costs
- `/api/agents/[agentId]/evaluations` - Returns agent evaluation data
- `/api/agents/[agentId]/overview` - Returns agent performance overview
- `/api/agents/[agentId]/review` - Returns agent review data

**Risk**: Exposes user data, evaluation content, and cost information.

## Authentication Patterns Found

### Session-First Routes
Used for UI-centric operations:
- User profile management
- Agent management
- Document updates
- API key management

### API-Key-First Routes
Used for programmatic access:
- Document import
- Data export
- API key validation

### Recently Improved Routes ✅
- `/api/agents/route.ts` - Now uses standard response helpers
- `/api/agents/[agentId]/jobs/route.ts` - Now uses `authenticateAndVerifyAgent` helper
- `/api/validate-key/route.ts` - Now uses `authenticateApiKeySimple` helper

## Inconsistency Issues

### 1. Response Format Inconsistency
**Good Pattern** ✅:
```typescript
return commonErrors.unauthorized();
return successResponse({ data });
```

**Bad Pattern** ❌:
```typescript
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
return new Response(JSON.stringify({ error: "message" }), { status: 404 });
```

### 2. Error Handling Inconsistency
- Some routes use try-catch with proper error responses
- Others let errors bubble up unhandled
- Inconsistent error message formats

### 3. RESTful Pattern Violations
- `/api/validate-key` - GET for validation (should be POST)
- `/api/import` - Action-based naming
- `/api/agents/[agentId]/eval-batch` - Nested resource creation

## Immediate Actions Required

### 1. Secure Monitor Routes
```typescript
// Add to all monitor routes:
const userId = await authenticateRequest(request);
if (!userId) {
  return commonErrors.unauthorized();
}

// Consider adding role check:
const user = await prisma.user.findUnique({ where: { id: userId } });
if (!user?.isAdmin) {
  return commonErrors.forbidden();
}
```

### 2. Protect Job and Evaluation Routes
```typescript
// For job routes - verify user owns the job:
const job = await prisma.job.findUnique({
  where: { id: jobId },
  include: { evaluation: true }
});

if (job?.evaluation?.userId !== userId) {
  return commonErrors.forbidden();
}
```

### 3. Standardize All Routes
1. Use `authenticateRequest` or `authenticateRequestSessionFirst` consistently
2. Use `commonErrors` and `successResponse` helpers
3. Add Zod validation for all inputs
4. Implement proper error handling

## Security Checklist
- [ ] Add authentication to all monitor routes
- [ ] Protect job detail routes
- [ ] Secure agent evaluation endpoints
- [ ] Standardize error responses
- [ ] Add rate limiting to public routes
- [ ] Implement audit logging for sensitive operations
- [ ] Add CORS restrictions for API routes
- [ ] Review and update all direct database queries