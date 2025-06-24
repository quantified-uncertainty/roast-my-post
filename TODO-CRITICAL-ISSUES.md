# Critical Issues to Address

Generated: 2025-01-24

## 🚨 CRITICAL Security Issues

### 1. Missing Authentication on Export Data Endpoint
**File:** `src/app/api/agents/[agentId]/export-data/route.ts`
**Issue:** This endpoint has NO authentication checks, allowing anyone to export all agent evaluation data
**Fix:** Add authentication using the same pattern as other routes

## High Priority Issues

### 2. Incomplete Implementation
**File:** `src/app/docs/[docId]/evaluations/components/VersionDetails.tsx`
**Lines:** 46-47
**Issue:** Hardcoded placeholder values that should be passed as props:
```typescript
documentId: "doc-id", // This would need to be passed in as a prop
documentTitle: "Document", // This would need to be passed in as a prop
```

### 3. Debug Console Statements in Production
Remove console.log/error statements from:
- `src/app/api/agents/[agentId]/export-data/route.ts:282`
- `src/app/api/agents/[agentId]/jobs/route.ts:128`
- `src/components/SlateEditor.tsx:381`
- `src/app/api/validate-key/route.ts` (multiple debug logs)

### 4. Inconsistent Authentication Patterns
**Issue:** Different API routes use different auth methods:
- Some use session-based auth with `auth()`
- Some use API key auth
- Some use hybrid (check API key first, then session)
- Some have NO auth (critical!)

**Recommendation:** Standardize using the hybrid approach from `import/route.ts`

## Medium Priority Issues

### 5. TypeScript `any` Usage
**File:** `src/app/api/agents/[agentId]/export-data/route.ts`
**Lines:** 36, 237
**Issue:** Extensive use of `any` types instead of proper interfaces

### 6. Technical Debt in SlateEditor
**File:** `src/components/SlateEditor.tsx`
**Lines:** 9-13, 27-29
**Issue:** Multiple `@ts-ignore` comments for ESM module imports

### 7. Inconsistent Error Handling
**Issue:** Different error response formats and logging patterns across API routes
**Recommendation:** Create standardized error handling utility

### 8. Database Connection Handling
**Issue:** Inconsistent Prisma disconnect patterns across routes
**Recommendation:** Use middleware or wrapper function for consistent cleanup

## Low Priority Issues

### 9. Import Organization
**Issue:** No consistent import ordering across files
**Recommendation:** Establish convention (React → Next.js → External → Internal → Relative)

### 10. Fixed Limits
**File:** `src/app/api/agents/[agentId]/jobs/route.ts`
**Line:** 52
**Issue:** Hardcoded limit of 100 jobs - should be configurable via query params

## Code Quality Improvements

### 11. Commented Out Code
**File:** `mcp-server/src/index.ts`
**Lines:** 55-60
**Issue:** Commented out type definition should be removed or implemented

### 12. Complex Retry Logic
**File:** `src/components/SlateEditor.tsx`
**Lines:** 484-510
**Issue:** Complex fallback logic could benefit from refactoring

## Testing Gaps

While core auth features have tests, consider adding:
- Integration tests for API endpoints
- Tests for error scenarios in auth flows
- Tests for the export-data endpoint (after adding auth)