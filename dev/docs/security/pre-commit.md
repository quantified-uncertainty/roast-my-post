# Pre-Commit Security Checklist

## Overview
This checklist ensures code security and quality before committing to the roast-my-post repository. Following these checks prevents security vulnerabilities and maintains code quality standards.

## Quick Security Scan (< 2 minutes)

### 1. Secrets & Credentials Check
```bash
# Scan for potential API keys and secrets
grep -r "sk-[a-zA-Z0-9]\{48\}\|AIza[a-zA-Z0-9_-]\{35\}\|rmp_[a-zA-Z0-9]\{64\}" \
  --include="*.ts" --include="*.tsx" --include="*.js" \
  --exclude-dir=node_modules --exclude-dir=.next .
```

**Look for:**
- Anthropic API keys: `sk-ant-...`
- OpenAI API keys: `sk-...`
- Roast My Post API keys: `rmp_...`
- Database URLs with credentials
- JWT secrets or session keys
- Email service API keys

### 2. Authentication Verification
**Check new/modified API routes:**
```typescript
// Every API route should start with:
export async function GET/POST/PUT/DELETE(request: Request) {
  const userId = await authenticateRequest(request);
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }
  // ... rest of logic
}
```

**Verify:**
- [ ] All API routes have authentication checks
- [ ] Admin routes have additional authorization checks
- [ ] No auth bypasses or TODO comments about auth
- [ ] Error responses don't leak sensitive information

### 3. Database Safety Check
```bash
# Check for unsafe database operations
grep -r "prisma.*push.*--accept-data-loss\|DROP TABLE\|DELETE FROM.*WHERE 1=1" \
  --include="*.json" --include="*.sh" --include="*.ts" .
```

**Dangerous patterns:**
- `prisma db push --accept-data-loss` (NEVER use - drops and recreates columns, destroying data)
- Raw SQL queries with user input
- Unscoped DELETE operations
- Missing WHERE clauses in updates

## Code Quality Checks

### 4. Build & Type Safety
```bash
# Must pass before commit
npm run typecheck  # TypeScript compilation
npm run lint       # ESLint checks
npm run build      # Next.js build
```

### 5. Input Validation
**Check new API endpoints have Zod validation:**
```typescript
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(100000),
});

const validated = schema.safeParse(requestBody);
if (!validated.success) {
  return badRequest('Invalid input');
}
```

### 6. Error Handling
**Verify proper error handling:**
```typescript
try {
  const result = await riskyOperation();
} catch (error) {
  // Log error with context (not just console.log)
  logger.error("Operation failed", { error, context });
  // Return user-friendly error (don't leak internals)
  return serverError('Processing failed');
}
```

## Agent System Security

### 7. Agent Instructions Validation
**When modifying agent instructions:**
- [ ] No hardcoded API keys or secrets in instructions
- [ ] Instructions don't contain system prompts that could be exploited
- [ ] Self-critique instructions don't expose internal logic
- [ ] Test instructions with potentially malicious documents

### 8. Agent Access Control
**Verify agent operations:**
- [ ] Agent creation/modification requires admin privileges
- [ ] Agent instructions are properly escaped
- [ ] No arbitrary code execution in agent logic
- [ ] Version control prevents unauthorized changes

## Database & Data Security

### 9. Migration Safety
**Before applying database migrations:**
```bash
# Create backup first
npm run backup:create

# Check migration for safety
cat prisma/migrations/*/migration.sql
```

**Red flags in migrations:**
- Column drops without rename strategy
- Missing data preservation steps
- Cascade deletes affecting critical data
- Index drops on production tables

### 10. Data Access Patterns
**Review data queries for security:**
```typescript
// Good: Scoped to authenticated user
const documents = await prisma.document.findMany({
  where: { userId: session.user.id }
});

// Bad: Global access without filtering
const documents = await prisma.document.findMany(); // DANGEROUS
```

## Client-Side Security

### 11. React Component Security
**Check client components:**
- [ ] No sensitive data in client component props
- [ ] API calls include proper authentication headers
- [ ] User inputs are validated before sending to server
- [ ] No XSS vulnerabilities in dynamic content rendering

### 12. Environment Variable Usage
**Verify environment variables:**
```typescript
// Public variables only in client code
const publicApiUrl = process.env.NEXT_PUBLIC_API_URL;

// Server-only variables never in client
if (typeof window === 'undefined') {
  const privateKey = process.env.PRIVATE_API_KEY; // OK
}
```

## File Upload & Content Security

### 13. File Upload Validation
**When handling file uploads:**
```typescript
const ALLOWED_TYPES = ['text/plain', 'text/markdown'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

if (!ALLOWED_TYPES.includes(file.type)) {
  throw new Error('Invalid file type');
}
if (file.size > MAX_SIZE) {
  throw new Error('File too large');
}
```

### 14. Content Sanitization
**For user-generated content:**
```typescript
import DOMPurify from 'dompurify';

// Sanitize HTML before rendering
const sanitized = DOMPurify.sanitize(userContent);
```

## Git & Repository Security

### 15. Git Hygiene
```bash
# Review all staged changes
git diff --cached

# Check for accidentally staged files
git status
```

**Avoid committing:**
- `.env` files with real values
- `node_modules` directory
- Log files with sensitive data
- Database dumps or backups
- IDE configuration files

### 16. Commit Message Security
**Don't include in commit messages:**
- API keys or passwords
- Internal server names or IPs
- User emails or personal data
- Security vulnerability details

## Testing & Validation

### 17. Security Test Coverage
**Before committing security-related changes:**
```bash
# Run security-focused tests
npm test -- --testNamePattern="auth|security|validation"

# Check test coverage for security modules
npm run test:coverage
```

### 18. Manual Security Testing
**For new features:**
- [ ] Test with invalid/malicious inputs
- [ ] Verify access controls work as expected
- [ ] Check error messages don't leak information
- [ ] Test rate limiting and abuse prevention

## Automated Pre-Commit Setup

### Install Pre-Commit Hooks
```bash
# Install husky for git hooks
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

### Custom Security Hook
```bash
#!/bin/sh
# .husky/pre-commit

echo "🔍 Running security checks..."

# 1. Check for secrets
if grep -r "sk-[a-zA-Z0-9]\{48\}\|rmp_[a-zA-Z0-9]\{64\}" \
  --include="*.ts" --include="*.tsx" --include="*.js" \
  --exclude-dir=node_modules --exclude-dir=.next .; then
  echo "❌ Possible API keys detected!"
  exit 1
fi

# 2. Check for unsafe database operations
if grep -r "prisma.*push.*--accept-data-loss" \
  --include="*.json" --include="*.sh" .; then
  echo "❌ Unsafe database command detected!"
  exit 1
fi

# 3. Type checking
npm run typecheck || {
  echo "❌ TypeScript errors found."
  exit 1
}

# 4. Linting
npm run lint || {
  echo "❌ ESLint errors found."
  exit 1
}

# 5. Build check
npm run build || {
  echo "❌ Build failed."
  exit 1
}

echo "✅ All security checks passed!"
```

## Emergency Procedures

### Skip Hooks (Use Sparingly!)
```bash
# Only for genuine emergencies
git commit --no-verify -m "EMERGENCY: [reason]"

# Immediately create follow-up task
echo "TODO: Fix pre-commit issues from emergency commit" >> TODO.md
```

### Quick Fixes for Common Issues
```bash
# Auto-fix formatting
npm run format

# Auto-fix linting
npm run lint:fix

# Clear build cache
rm -rf .next

# Reset if you committed something sensitive
git reset --soft HEAD~1  # Keep changes, undo commit
git reset --hard HEAD~1  # Discard everything
```

## Security Incident Response

### If Secrets Are Committed
1. **Immediately revoke** the exposed credentials
2. **Force push** to remove from history (if caught quickly)
3. **Notify team** of credential rotation
4. **Generate new keys** and update environment variables
5. **Review logs** for any unauthorized access

### If Vulnerability Is Discovered
1. **Don't commit the fix** immediately to main branch
2. **Create private branch** for security fix
3. **Coordinate with team** on disclosure timeline
4. **Test fix thoroughly** before deployment
5. **Document incident** for future prevention

## Team Security Agreement

By committing to this repository, I confirm:

1. ✅ **Code builds and tests pass**
2. ✅ **No secrets or credentials exposed**  
3. ✅ **Authentication properly implemented**
4. ✅ **Database operations are safe**
5. ✅ **Input validation is in place**
6. ✅ **Error handling doesn't leak information**
7. ✅ **All changes have been security reviewed**

**Remember**: These 5 minutes of security checks prevent hours of incident response and potential data breaches!