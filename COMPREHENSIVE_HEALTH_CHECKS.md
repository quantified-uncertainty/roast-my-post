# Comprehensive Codebase Health Check Guide for open-annotate

## Overview
This guide provides systematic instructions for conducting deep health checks on the open-annotate codebase. Each section includes specific tasks, validation criteria, and expected outcomes to ensure code quality, security, and maintainability.

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

## 1. Architecture & Code Organization Audit

### 1.1 Next.js App Router Architecture
- **Route organization validation**
  - Check all routes follow app directory conventions
  - Verify proper use of route groups (parentheses)
  - Validate layout.tsx hierarchy and inheritance
  - Ensure loading.tsx and error.tsx are properly placed
  - Check for orphaned page components
  
- **Server vs Client component boundaries**
  - Verify "use client" directives are minimal and justified
  - Check data fetching happens in Server Components
  - Validate client components only handle interactivity
  - Ensure no unnecessary client-side data fetching
  - Review component composition patterns

- **API route structure**
  - All routes under /app/api follow RESTful patterns
  - Consistent use of route.ts files
  - Proper HTTP method handlers (GET, POST, PUT, DELETE)
  - Dynamic routes use [param] syntax correctly
  - No business logic in route handlers (use services)

### 1.2 Component Architecture Review
- **Component hierarchy analysis**
  ```
  /components
    /ui          - Reusable UI primitives
    /features    - Feature-specific components
    /layouts     - Page layout components
  ```
  - Verify components are in correct directories
  - Check for proper component composition
  - Validate prop drilling vs context usage
  - Ensure consistent naming (PascalCase)

- **Slate.js editor architecture**
  - Review SlateEditor.tsx and related components
  - Check custom node/mark renderers
  - Validate plugin architecture
  - Ensure proper TypeScript typing for Slate
  - Review highlight rendering performance

### 1.3 Service Layer Organization
- **Database access patterns**
  - All database queries go through Prisma
  - No raw SQL unless absolutely necessary
  - Consistent error handling in database operations
  - Proper transaction usage where needed
  - Connection pooling configuration

- **External service integration**
  - Anthropic API client configuration
  - OpenAI integration patterns
  - Consistent error handling for API failures
  - Proper timeout configuration
  - Rate limiting implementation

---

## 2. Authentication & Authorization Deep Dive

### 2.1 NextAuth.js Implementation Audit
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

### 2.2 API Key Authentication System
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

### 2.3 Route Protection Patterns
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

---

## 3. Data Model & Database Integrity

### 3.1 Prisma Schema Analysis
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

### 3.2 Data Migration Safety
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

### 3.3 Query Performance Analysis
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

---

## 4. Agent System Architecture

### 4.1 Agent Definition Validation
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

### 4.2 Agent Versioning System
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

### 4.3 Agent Performance Monitoring
- **Success rate tracking**
  - Monitor evaluation completion rates
  - Track error types per agent
  - Measure response quality metrics
  - Identify problematic agents
  - Cost per evaluation tracking

---

## 5. Job Processing & Background Tasks

### 5.1 Job Queue Implementation
- **Queue reliability**
  - Verify job persistence in database
  - Check retry logic implementation
  - Validate exponential backoff
  - Test job timeout handling
  - Monitor queue depth

- **Job processing patterns**
  ```typescript
  // Verify consistent job structure:
  interface Job {
    id: string
    type: JobType
    payload: unknown
    attempts: number
    maxAttempts: number
    nextRunAt: Date
    error?: string
  }
  ```

### 5.2 Async Operation Safety
- **Concurrency control**
  - Check for race conditions
  - Validate job locking mechanisms
  - Test parallel job execution
  - Monitor resource contention
  - Implement job priorities

- **Error recovery**
  - Comprehensive error logging
  - Graceful degradation strategies
  - Dead letter queue implementation
  - Manual retry capabilities
  - Alert on repeated failures

---

## 6. Frontend Performance & UX

### 6.1 React Component Optimization
- **Render performance**
  - Identify unnecessary re-renders
  - Check React.memo usage
  - Validate useMemo/useCallback
  - Review key prop usage in lists
  - Monitor component tree depth

- **State management efficiency**
  - Check for prop drilling issues
  - Validate context usage patterns
  - Review local vs global state
  - Monitor state update frequency
  - Check for state initialization costs

### 6.2 Document Viewer Performance
- **Highlight rendering optimization**
  - Profile SlateEditor performance
  - Check highlight calculation efficiency
  - Validate scroll performance
  - Test with large documents
  - Monitor memory usage

- **Split-pane functionality**
  - Smooth resizing behavior
  - Proper event handling
  - Mobile responsiveness
  - Keyboard navigation
  - Focus management

### 6.3 Bundle Size Analysis
- **Code splitting strategy**
  - Dynamic imports for large components
  - Route-based code splitting
  - Third-party library optimization
  - Tree shaking effectiveness
  - Source map configuration

---

## 7. API Design & Documentation

### 7.1 RESTful API Consistency
- **Endpoint naming audit**
  ```
  GET    /api/documents           - List documents
  POST   /api/documents           - Create document
  GET    /api/documents/[id]      - Get document
  PUT    /api/documents/[id]      - Update document
  DELETE /api/documents/[id]      - Delete document
  ```
  - Verify consistent patterns
  - Check plural resource names
  - Validate nested resource URLs
  - Ensure no actions in URLs
  - Review query parameter usage

### 7.2 Request/Response Standards
- **Response format consistency**
  ```typescript
  // Standard success response:
  { data: T, meta?: MetaInfo }
  
  // Standard error response:
  { error: { code: string, message: string, details?: any } }
  ```
  - Validate all endpoints follow standards
  - Check error response consistency
  - Verify pagination format
  - Review sorting parameters
  - Ensure ISO date formats

### 7.3 API Documentation
- **OpenAPI/Swagger generation**
  - Document all endpoints
  - Include authentication requirements
  - Provide request/response examples
  - Document error codes
  - Maintain version history

---

## 8. Security Audit Checklist

### 8.1 Input Validation & Sanitization
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

### 8.2 Security Headers Implementation
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

### 8.3 Secrets Management
- **Environment variable audit**
  - No secrets in code repository
  - All keys in .env files
  - .env.example maintained
  - Production secrets secure
  - Regular key rotation

---

## 9. Testing Strategy & Coverage

### 9.1 Test Coverage Analysis
- **Coverage targets**
  - Unit tests: >80% line coverage
  - Critical paths: 100% coverage
  - API routes: Integration tests
  - UI components: Component tests
  - E2E: Critical user journeys

- **Test quality metrics**
  ```bash
  # Run coverage analysis:
  npm run test:coverage
  
  # Check for:
  - Meaningful test descriptions
  - Proper test isolation
  - Appropriate mocking
  - Edge case coverage
  ```

### 9.2 Test Organization
- **Test file structure**
  ```
  __tests__/
    unit/         - Business logic tests
    integration/  - API and service tests
    e2e/          - User journey tests
    fixtures/     - Test data
    utils/        - Test helpers
  ```

### 9.3 Continuous Testing
- **CI/CD test pipeline**
  - Pre-commit hooks (lint, format)
  - PR checks (tests, types, build)
  - Post-merge tests
  - Nightly E2E runs
  - Performance benchmarks

---

## 10. Performance Monitoring & Optimization

### 10.1 Application Performance
- **Core Web Vitals tracking**
  - Largest Contentful Paint (LCP)
  - First Input Delay (FID)
  - Cumulative Layout Shift (CLS)
  - Time to First Byte (TTFB)
  - First Contentful Paint (FCP)

- **Runtime performance**
  - Memory leak detection
  - CPU usage profiling
  - Network request optimization
  - WebSocket connection management
  - Service worker caching

### 10.2 Database Performance
- **Query optimization checklist**
  - Enable query logging in development
  - Identify queries >100ms
  - Check for full table scans
  - Validate index usage
  - Monitor connection pool

- **Data access patterns**
  - Implement query result caching
  - Use database views for complex queries
  - Batch similar operations
  - Implement cursor-based pagination
  - Monitor transaction duration

---

## 11. Monitoring & Observability

### 11.1 Logging Strategy
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

### 11.2 Error Tracking
- **Sentry or similar integration**
  - All errors captured with context
  - User identification (without PII)
  - Release tracking
  - Performance monitoring
  - Custom error boundaries

### 11.3 Application Metrics
- **Key metrics to track**
  - API response times
  - Database query duration
  - Job processing rates
  - Error rates by endpoint
  - Active user sessions
  - AI API costs

---

## 12. Documentation & Knowledge Management

### 12.1 Code Documentation
- **JSDoc standards**
  ```typescript
  /**
   * Creates a new evaluation for a document using the specified agent
   * @param documentId - The document to evaluate
   * @param agentId - The agent to use for evaluation
   * @param options - Additional evaluation options
   * @returns The created evaluation with highlights
   * @throws {AgentNotFoundError} If the agent doesn't exist
   */
  ```

### 12.2 System Documentation
- **Essential documentation**
  - Architecture decision records (ADRs)
  - API endpoint documentation
  - Database schema documentation
  - Deployment procedures
  - Troubleshooting guides
  - Performance tuning guide

### 12.3 Developer Onboarding
- **Setup documentation**
  - Prerequisites and dependencies
  - Environment setup steps
  - Database initialization
  - Running tests locally
  - Common development tasks
  - Debugging techniques

---

## Implementation Roadmap

### Week 1: Critical Security & Data Integrity
- [ ] Complete authentication audit
- [ ] Fix any authorization bypasses
- [ ] Implement missing security headers
- [ ] Validate all user inputs
- [ ] Review database backup procedures

### Week 2: Performance & Reliability
- [ ] Profile application performance
- [ ] Optimize slow database queries
- [ ] Implement caching strategy
- [ ] Set up monitoring alerts
- [ ] Review job processing reliability

### Week 3: Code Quality & Testing
- [ ] Achieve 80% test coverage
- [ ] Eliminate code duplication >5%
- [ ] Standardize error handling
- [ ] Complete API documentation
- [ ] Set up automated quality checks

### Week 4: Documentation & Process
- [ ] Update all documentation
- [ ] Create architecture diagrams
- [ ] Document operational procedures
- [ ] Set up knowledge base
- [ ] Plan ongoing maintenance

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