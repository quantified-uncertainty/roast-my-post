# Codebase Health Check Guide for roast-my-post

## Overview
This guide provides systematic instructions for conducting deep health checks on the roast-my-post codebase. Each section includes specific tasks, validation criteria, and expected outcomes to ensure code quality, security, and maintainability.

## CRITICAL: Documentation Requirements for All Health Checks

When documenting findings, **ALWAYS** include:

1. **Exact File Paths**: Full paths from project root
   - ✅ Good: `/src/app/api/agents/route.ts:45-67`
   - ❌ Bad: "in the agents API route"

2. **Line Numbers**: Specific lines or ranges
   - ✅ Good: "Empty catch block at lines 84-87"
   - ❌ Bad: "has empty catch blocks"

3. **Code Examples**: Actual code snippets from files
   ```typescript
   // From /src/app/api/import/route.ts:103-106
   return errorResponse(
     error instanceof Error ? error.message : "Failed to import",
     500
   );
   ```

4. **Pattern Counts**: How many occurrences
   - ✅ Good: "Found in 14 files: [list files]"
   - ❌ Bad: "appears multiple times"

5. **Actionable Items**: What to do and where
   - ✅ Good: "Add auth check to `/src/app/api/monitor/stats/route.ts` using `authenticateRequest()` helper"
   - ❌ Bad: "Add authentication to monitor routes"

## Example Finding Format

```markdown
### Issue: Unprotected API Routes
**Severity**: Critical
**Files Affected**: 
- `/src/app/api/monitor/evaluations/route.ts` (entire file)
- `/src/app/api/monitor/jobs/route.ts` (entire file)
- `/src/app/api/monitor/stats/route.ts` (entire file)

**Pattern Found**:
```typescript
// From /src/app/api/monitor/stats/route.ts:8-15
export async function GET() {
  // No authentication check!
  const stats = await prisma.evaluation.aggregate({...});
  return NextResponse.json(stats);
}
```

**Impact**: Exposes system metrics to unauthenticated users
**Fix**: Add at line 8:
```typescript
const userId = await authenticateRequest(request);
if (!userId) return commonErrors.unauthorized();
```
```

---

## Quick Health Check Checklist (< 5 minutes)

### 1. Build & Type Safety
- [ ] **Next.js build succeeds**
  ```bash
  npm run build
  ```
- [ ] **TypeScript compilation passes**
  ```bash
  npm run typecheck
  ```
- [ ] **No ESLint errors**
  ```bash
  npm run lint
  ```

### 2. Security Quick Scan
- [ ] **No hardcoded secrets or API keys**
  ```bash
  # Quick scan for common patterns
  grep -r "sk-\|key\|secret\|password\|token" \
    --include="*.ts" --include="*.tsx" --include="*.js" \
    --exclude-dir=node_modules --exclude-dir=.next .
  ```
- [ ] **All new API routes have auth checks**
- [ ] **No debug code in production**
  - No `console.log()` (except intentional logging)
  - No `debugger` statements
  - No `.only` or `.skip` in tests

### 3. Database Safety
- [ ] **No pending unsafe migrations**
  ```bash
  npx prisma migrate status
  ```
- [ ] **No `--accept-data-loss` commands**
- [ ] **Recent backup exists** (check `/backups/` directory)

---

## Comprehensive Health Checks

### 1. Authentication & Authorization Deep Dive

#### 1.1 NextAuth.js Implementation Audit
- **Provider configuration**
  ```typescript
  // Check auth configuration in:
  // - /app/api/auth/[...nextauth]/route.ts
  // - /lib/auth.ts or similar
  ```
  - Verify secure session configuration
  - Check JWT vs database session strategy
  - Validate callback implementations
  - Review custom pages configuration
  - Ensure proper CSRF protection

- **Session management**
  - Check getServerSession usage in Server Components
  - Validate useSession hooks in Client Components
  - Verify session data doesn't leak sensitive info
  - Check session expiry configuration
  - Review concurrent session handling

#### 1.2 API Key Authentication System
- **API key generation and storage**
  - Verify secure key generation (crypto.randomBytes)
  - Check hashing before storage (bcrypt/scrypt)
  - Validate key format and length
  - Ensure keys have expiration dates
  - Review key rotation mechanisms

- **API key usage patterns**
  - Check consistent header usage (X-API-Key)
  - Verify key validation in all API routes
  - Test rate limiting per API key
  - Validate key scoping/permissions
  - Ensure proper error messages

#### 1.3 Route Protection Patterns
- **Protected page implementation**
  ```typescript
  // Every protected route should have:
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  ```
  - Map all routes requiring authentication
  - Verify consistent protection patterns
  - Check for authorization beyond authentication
  - Validate role-based access where needed
  - Test redirect behavior

- **API route protection**
  ```typescript
  // Check pattern consistency:
  export async function GET(req: Request) {
    const auth = await validateRequest(req)
    if (!auth) return new Response('Unauthorized', { status: 401 })
    // ...
  }
  ```

### 2. Data Model & Database Integrity

#### 2.1 Prisma Schema Analysis
- **Model relationship audit**
  - Verify all foreign keys are properly defined
  - Check cascade rules (onDelete, onUpdate)
  - Validate required vs optional fields
  - Review unique constraints
  - Check composite indexes

- **Type safety validation**
  - Ensure Prisma types are generated and used
  - Check for any type assertions bypassing safety
  - Validate Zod schemas match Prisma models
  - Review custom type definitions
  - Check for proper enum usage

#### 2.2 Data Migration Safety
- **Migration practices**
  - Review all migrations in /prisma/migrations
  - Check for data loss potential
  - Validate rollback strategies
  - Ensure migrations are idempotent
  - Document breaking changes

- **Schema evolution**
  - Track schema version compatibility
  - Document field deprecations
  - Plan for zero-downtime migrations
  - Validate data backfilling strategies

#### 2.3 Query Performance Analysis
- **Common query patterns**
  ```typescript
  // Check for N+1 queries:
  const documents = await prisma.document.findMany({
    include: {
      evaluations: {
        include: {
          agent: true,
          comments: true
        }
      }
    }
  })
  ```
  - Use query logging to identify slow queries
  - Check for missing indexes
  - Validate pagination implementation
  - Review complex aggregations
  - Monitor connection pool usage

### 3. Agent System Architecture

#### 3.1 Agent Definition Validation
- **TOML configuration audit**
  - Validate all agent TOML files syntax
  - Check required fields presence
  - Verify instruction clarity
  - Review purpose categorization
  - Ensure version control

- **Agent type consistency**
  - ASSESSOR agents have grading logic
  - ADVISOR agents provide recommendations
  - ENRICHER agents add context
  - EXPLAINER agents clarify content
  - Check type-specific requirements

#### 3.2 Agent Versioning System
- **Version control implementation**
  - Every agent change creates new version
  - Previous versions remain accessible
  - Version comparison capabilities
  - Rollback mechanisms
  - Change tracking

- **Instruction management**
  - primaryInstructions clarity and completeness
  - selfCritiqueInstructions effectiveness
  - Instruction template consistency
  - Variable interpolation safety
  - Character limit validation

### 4. Security Audit Checklist

#### 4.1 Input Validation & Sanitization
- **Zod schema validation**
  ```typescript
  // Check all API inputs have schemas:
  const CreateDocumentSchema = z.object({
    title: z.string().min(1).max(200),
    content: z.string().max(50000),
    metadata: z.record(z.unknown()).optional()
  })
  ```
  - Map all user inputs to validation
  - Check for SQL injection protection
  - Validate file upload restrictions
  - Test XSS prevention
  - Review URL parameter validation

#### 4.2 Security Headers Implementation
- **Next.js security configuration**
  ```typescript
  // Check next.config.js for:
  const securityHeaders = [
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-XSS-Protection', value: '1; mode=block' },
    // ... more headers
  ]
  ```

#### 4.3 Secrets Management
- **Environment variable audit**
  - No secrets in code repository
  - All keys in .env files
  - .env.example maintained
  - Production secrets secure
  - Regular key rotation

### 5. Performance & Code Quality

#### 5.1 Frontend Performance
- **React Component Optimization**
  - Identify unnecessary re-renders
  - Check React.memo usage
  - Validate useMemo/useCallback
  - Review key prop usage in lists
  - Monitor component tree depth

- **Bundle Size Analysis**
  - Dynamic imports for large components
  - Route-based code splitting
  - Third-party library optimization
  - Tree shaking effectiveness
  - Source map configuration

#### 5.2 API Performance
- **Query optimization checklist**
  - Enable query logging in development
  - Identify queries >100ms
  - Check for full table scans
  - Validate index usage
  - Monitor connection pool

#### 5.3 Job Processing & Background Tasks
- **Queue reliability**
  - Verify job persistence in database
  - Check retry logic implementation
  - Validate exponential backoff
  - Test job timeout handling
  - Monitor queue depth

### 6. Error Handling & Monitoring

#### 6.1 Error Handling Patterns
- **API Error Responses**
  - Check all API routes have try-catch blocks
  - Verify consistent error response format
  - Ensure errors don't leak sensitive information
  - Check for proper HTTP status codes
  - Verify error logging is comprehensive

- **Frontend Error Boundaries**
  - Ensure React Error Boundaries are in place
  - Check for proper error UI states
  - Verify network error handling
  - Check for loading and error states in data fetching
  - Ensure user-friendly error messages

#### 6.2 Logging Strategy
- **Structured logging implementation**
  ```typescript
  logger.info('Evaluation created', {
    evaluationId: eval.id,
    agentId: agent.id,
    documentId: doc.id,
    duration: endTime - startTime,
    tokenCount: tokens
  })
  ```
  - Consistent log levels
  - Contextual information
  - Error stack traces
  - Performance metrics
  - User action tracking

---

## Automated Health Check Scripts

### Daily Checks
```bash
#!/bin/bash
# daily-health-check.sh

echo "Running daily health checks..."

# Type checking
npm run typecheck || exit 1

# Linting
npm run lint || exit 1

# Unit tests
npm run test:unit || exit 1

# Security audit
npm audit --production || exit 1

echo "Daily checks passed!"
```

### Weekly Comprehensive Check
```bash
#!/bin/bash
# weekly-health-check.sh

echo "Running weekly comprehensive checks..."

# Full test suite
npm run test:all || exit 1

# Coverage report
npm run test:coverage
if [ $(cat coverage/coverage-summary.json | jq '.total.lines.pct') -lt 80 ]; then
  echo "Coverage below 80%"
  exit 1
fi

# Bundle size check
npm run build
npm run analyze

# Database query analysis
npm run db:analyze-queries

echo "Weekly checks completed!"
```

---

## Red Flags Requiring Immediate Action

1. **Any authentication bypass vulnerability**
2. **Exposed API keys or secrets in code**
3. **SQL injection vulnerabilities**
4. **Missing authorization checks on sensitive endpoints**
5. **Unencrypted sensitive data storage**
6. **Critical dependencies with known vulnerabilities**
7. **Production database without backups**
8. **Unhandled promise rejections in production**
9. **Memory leaks causing server crashes**
10. **API endpoints exposing internal errors**

---

## Success Metrics

### Code Quality
- Test coverage: >80%
- Code duplication: <5%
- TypeScript strict mode: enabled
- Zero critical vulnerabilities
- All PRs pass quality gates

### Performance
- API response time: <200ms p95
- Database queries: <50ms p95
- Job processing rate: >95% success
- Zero unhandled errors in production
- Page load time: <3s on 3G

### Security
- All endpoints authenticated
- Zero high-severity vulnerabilities
- Security headers score: A+
- Regular penetration testing
- Automated security scanning

### Developer Experience
- Setup time: <30 minutes
- Build time: <2 minutes
- Test suite: <5 minutes
- Clear documentation
- Helpful error messages

---

## Quick Reference Commands

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Security audit
npm audit

# Test coverage
npm run test:coverage

# Bundle analysis
npm run analyze

# Database status
npx prisma migrate status

# Create backup
npm run backup:create
```