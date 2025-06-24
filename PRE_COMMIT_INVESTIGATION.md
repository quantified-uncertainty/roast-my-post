# Pre-Commit Investigation Guide for open-annotate

## Quick Checks (< 1 minute)

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

### 2. Code Formatting
- [ ] **Prettier formatting applied**
  ```bash
  npm run format:check
  ```
- [ ] **Import order is consistent**
- [ ] **No trailing whitespace**
- [ ] **Files end with newline**
- [ ] **No commented-out code** (except TODO/FIXME with issue numbers)

### 3. Git Hygiene
- [ ] **Review all changes**
  ```bash
  git diff --cached
  git status
  ```
- [ ] **No accidental debug code**
  - No `console.log()` (except intentional logging)
  - No `debugger` statements
  - No `.only` or `.skip` in tests
  - No hardcoded test data
- [ ] **Correct files staged**
  - No `.env` files
  - No `node_modules`
  - No `.DS_Store` or IDE files
  - No generated Prisma client files

---

## Security Checks (2-3 minutes)

### 4. Authentication & Authorization
- [ ] **All new API routes have auth checks**
  ```typescript
  // Check for patterns like:
  const session = await getServerSession(authOptions)
  if (!session) return new Response('Unauthorized', { status: 401 })
  ```
- [ ] **Client components don't expose sensitive data**
- [ ] **API routes validate user permissions**
- [ ] **No auth tokens in URLs or logs**

### 5. Data Security
- [ ] **No hardcoded secrets or API keys**
  ```bash
  # Quick scan for common patterns
  grep -r "sk-\|key\|secret\|password\|token" \
    --include="*.ts" --include="*.tsx" --include="*.js" \
    --exclude-dir=node_modules --exclude-dir=.next .
  ```
- [ ] **Environment variables used for secrets**
- [ ] **No sensitive data in error messages**
- [ ] **Input validation on all user data**
  ```typescript
  // Ensure Zod schemas for all inputs
  const schema = z.object({
    title: z.string().min(1).max(200),
    content: z.string().max(50000)
  })
  ```

### 6. Database Security
- [ ] **All queries use Prisma (no raw SQL)**
- [ ] **No string concatenation in queries**
- [ ] **Proper error handling doesn't leak schema**
- [ ] **User data properly scoped in queries**
  ```typescript
  // Good: Scoped to user
  await prisma.document.findMany({
    where: { userId: session.user.id }
  })
  ```

---

## Functional Checks (3-5 minutes)

### 7. Test Coverage
- [ ] **All tests pass**
  ```bash
  npm test
  ```
- [ ] **New features have tests**
  - Unit tests for utilities/helpers
  - Integration tests for API routes
  - Component tests for UI changes
- [ ] **Edge cases covered**
  - Error states
  - Empty states
  - Loading states
  - Boundary conditions

### 8. Agent System Integrity
- [ ] **Agent TOML files are valid**
  ```bash
  # If modifying agents
  find scripts/agents -name "*.toml" -exec npx @iarna/toml '{}' \;
  ```
- [ ] **Agent instructions follow conventions**
  - Clear primaryInstructions
  - Appropriate selfCritiqueInstructions
  - Correct purpose type (ASSESSOR/ADVISOR/ENRICHER/EXPLAINER)
- [ ] **Version bumped if modifying agent**

### 9. Database Changes
- [ ] **Schema changes reviewed**
  ```bash
  # Check for pending migrations
  npx prisma migrate status
  ```
- [ ] **Migration is safe**
  - No data loss without backups
  - Backwards compatible if possible
  - Tested on copy of production data
- [ ] **Indexes added for new queries**
- [ ] **No breaking changes to API**

---

## Performance Checks (2-3 minutes)

### 10. Frontend Performance
- [ ] **No unnecessary re-renders**
  - Proper key props in lists
  - useMemo/useCallback where needed
  - No inline function definitions in props
- [ ] **Images optimized**
  - Using Next.js Image component
  - Appropriate sizes specified
  - Lazy loading implemented
- [ ] **Bundle size impact checked**
  ```bash
  # Before and after comparison
  npm run analyze
  ```

### 11. API Performance
- [ ] **No N+1 queries**
  ```typescript
  // Bad: N+1 query
  const docs = await prisma.document.findMany()
  for (const doc of docs) {
    const evals = await prisma.evaluation.findMany({
      where: { documentId: doc.id }
    })
  }
  
  // Good: Include related data
  const docs = await prisma.document.findMany({
    include: { evaluations: true }
  })
  ```
- [ ] **Large datasets paginated**
- [ ] **Appropriate caching headers**
- [ ] **No blocking operations in request handlers**

### 12. Job Processing
- [ ] **New jobs have retry logic**
- [ ] **Job payloads are reasonable size**
- [ ] **Error handling includes context**
- [ ] **Dead letter queue considered**
- [ ] **Rate limits respected for external APIs**

---

## Code Quality Checks (2-3 minutes)

### 13. Component Architecture
- [ ] **Components follow established patterns**
  - Server vs Client components appropriate
  - Props properly typed
  - Error boundaries where needed
- [ ] **No business logic in UI components**
- [ ] **Shared components truly reusable**
- [ ] **Accessibility considered**
  - ARIA labels where needed
  - Keyboard navigation works
  - Focus management proper

### 14. Error Handling
- [ ] **All async operations have error handling**
  ```typescript
  try {
    const result = await riskyOperation()
  } catch (error) {
    // Proper error handling, not just console.log
    logger.error('Operation failed', { error, context })
    // User-friendly error message
  }
  ```
- [ ] **User-friendly error messages**
- [ ] **Errors logged with context**
- [ ] **No empty catch blocks**

### 15. Code Maintainability
- [ ] **No obvious code duplication**
- [ ] **Functions have single responsibility**
- [ ] **Complex logic documented**
- [ ] **Magic numbers replaced with constants**
  ```typescript
  // Bad
  if (retries > 5) { ... }
  
  // Good
  const MAX_RETRY_ATTEMPTS = 5
  if (retries > MAX_RETRY_ATTEMPTS) { ... }
  ```

---

## Documentation Checks (1-2 minutes)

### 16. Code Documentation
- [ ] **New functions have JSDoc**
  ```typescript
  /**
   * Creates an evaluation for a document using the specified agent
   * @param documentId - The document to evaluate
   * @param agentId - The agent performing evaluation
   * @returns The created evaluation
   * @throws {AgentNotFoundError} If agent doesn't exist
   */
  ```
- [ ] **Complex algorithms explained**
- [ ] **API changes documented**
- [ ] **Breaking changes noted**

### 17. Project Documentation
- [ ] **README updated if needed**
- [ ] **CLAUDE.md updated for AI context**
- [ ] **API documentation current**
- [ ] **Environment variables documented**
  ```bash
  # Check .env.example is updated
  diff .env .env.example
  ```

---

## Dependency Checks (1 minute)

### 18. Package Management
- [ ] **No unnecessary dependencies**
- [ ] **Dependencies vs devDependencies correct**
- [ ] **Package versions locked**
- [ ] **Security audit passes**
  ```bash
  npm audit --production
  ```
- [ ] **License compatibility verified**

---

## Automated Pre-Commit Setup

### Install Pre-Commit Hooks

```bash
# Install husky and lint-staged
npm install --save-dev husky lint-staged

# Initialize husky
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npx lint-staged"
```

### Configure lint-staged

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ],
    "*.prisma": [
      "npx prisma format"
    ]
  }
}
```

### Custom Pre-Commit Script

```bash
#!/bin/sh
# .husky/pre-commit

echo "🔍 Running pre-commit checks for open-annotate..."

# 1. Type checking
echo "📘 Checking TypeScript..."
npm run typecheck || {
  echo "❌ TypeScript errors found."
  exit 1
}

# 2. Linting
echo "📝 Running ESLint..."
npm run lint || {
  echo "❌ ESLint errors found."
  exit 1
}

# 3. Format check
echo "🎨 Checking formatting..."
npm run format:check || {
  echo "❌ Formatting issues found. Run 'npm run format' to fix."
  exit 1
}

# 4. Test suite
echo "🧪 Running tests..."
npm test || {
  echo "❌ Tests failed."
  exit 1
}

# 5. Build check
echo "🏗️  Checking build..."
npm run build || {
  echo "❌ Build failed."
  exit 1
}

# 6. Security check
echo "🔒 Checking for secrets..."
if grep -r "sk-[a-zA-Z0-9]\{48\}\|AIza[a-zA-Z0-9_-]\{35\}" \
  --include="*.ts" --include="*.tsx" --include="*.js" \
  --exclude-dir=node_modules --exclude-dir=.next .; then
  echo "⚠️  Possible API keys detected!"
  exit 1
fi

# 7. Database safety check
echo "💾 Checking for unsafe database operations..."
if grep -r "prisma.*push.*--accept-data-loss" \
  --include="*.json" --include="*.sh" .; then
  echo "⚠️  Unsafe database command detected! Use migrations instead."
  exit 1
fi

echo "✅ All checks passed!"
```

---

## Quick Reference

### 🚫 Commit Blockers
```
❌ Build failures
❌ TypeScript errors
❌ Failing tests
❌ ESLint errors
❌ Exposed secrets/keys
❌ Broken authentication
❌ Data loss migrations
```

### ⚠️  Should Fix
```
⚠️  Missing tests
⚠️  No error handling
⚠️  Code duplication
⚠️  Poor performance
⚠️  Missing documentation
⚠️  Accessibility issues
```

### 🎯 Project-Specific Checks
- [ ] Agent TOML files valid
- [ ] Highlight system performance checked
- [ ] Job retry logic implemented
- [ ] API route auth verified
- [ ] Prisma schema changes safe
- [ ] Environment variables documented

---

## Emergency Procedures

### Skip Hooks (Use Sparingly!)
```bash
# When you absolutely must commit
git commit --no-verify -m "EMERGENCY: [reason]"

# But immediately create a follow-up task
echo "TODO: Fix pre-commit issues from emergency commit" >> TODO.md
```

### Quick Fixes
```bash
# Auto-fix formatting
npm run format

# Auto-fix linting
npm run lint:fix

# Update snapshots
npm test -- -u

# Clear Next.js cache
rm -rf .next
```

### Rollback Procedures
```bash
# If you committed something bad
git reset --soft HEAD~1  # Undo last commit, keep changes
git reset --hard HEAD~1  # Undo last commit, discard changes

# If you pushed something bad
git revert HEAD  # Create a new commit that undoes the last one
```

---

## Team Agreement

By committing to this repository, I confirm that:

1. ✅ My code compiles and all tests pass
2. ✅ I've reviewed all my changes
3. ✅ No secrets or credentials are exposed
4. ✅ Authentication is properly implemented
5. ✅ The code is ready for production

**Remember**: These checks prevent issues in production. Taking 5 minutes now saves hours of debugging later!