# Custom ESLint Rules Documentation

## Overview

This project includes comprehensive custom ESLint rules designed to enforce security, type safety, performance, and consistency patterns specific to our Next.js/React/TypeScript codebase.

## Rule Categories

### 1. Authentication Consistency (`local/auth-consistency`)

**Purpose**: Prevents authentication inconsistencies that could create security vulnerabilities.

**What it catches**:
- Direct usage of `auth()` in API routes (should use `authenticateRequest()`)
- API routes missing authentication entirely
- Inconsistent auth patterns across endpoints

**Examples**:
```typescript
// ❌ BAD - Inconsistent auth
import { auth } from "@/lib/auth";
export async function GET() {
  const session = await auth();
  // Only works with sessions, not API keys
}

// ✅ GOOD - Consistent auth
import { authenticateRequest } from "@/lib/auth-helpers";
export async function GET(request: NextRequest) {
  const userId = await authenticateRequest(request);
  // Works with both sessions and API keys
}
```

### 2. API Security (`local/api-security`)

**Purpose**: Enforces security best practices in API routes.

**What it catches**:
- Missing input validation with Zod schemas
- Raw error message exposure to clients
- Timing-unsafe string comparisons for sensitive data
- Missing rate limiting on public endpoints

**Examples**:
```typescript
// ❌ BAD - No input validation
export async function POST(request: NextRequest) {
  const body = await request.json(); // Unsafe!
}

// ✅ GOOD - Validated input
const schema = z.object({ title: z.string() });
export async function POST(request: NextRequest) {
  const body = schema.parse(await request.json());
}

// ❌ BAD - Raw error exposure
return NextResponse.json({ 
  error: error instanceof Error ? error.message : "Unknown error" 
});

// ✅ GOOD - Sanitized errors
return commonErrors.internalServerError();
```

### 3. Type Safety (`local/type-safety`)

**Purpose**: Enforces strict TypeScript usage to prevent runtime errors.

**What it catches**:
- Unsafe type assertions without runtime validation
- Missing return type annotations on functions
- Usage of `@ts-ignore` (prefer `@ts-expect-error`)
- Usage of `any` type

**Examples**:
```typescript
// ❌ BAD - Unsafe type assertion
const result = response as ApiResponse;

// ✅ GOOD - Validated assertion
const schema = z.object({ data: z.string() });
const result = schema.parse(response);

// ❌ BAD - Missing return type
function processData(input) {
  return input.map(x => x.value);
}

// ✅ GOOD - Explicit return type
function processData(input: InputType[]): string[] {
  return input.map(x => x.value);
}
```

### 4. Database Performance (`local/database-performance`)

**Purpose**: Prevents common database performance and safety issues.

**What it catches**:
- Creating new `PrismaClient` instances (use singleton)
- `findMany()` queries without pagination
- Deep nested includes (>3 levels)
- Missing transactions for multiple operations
- Unsafe raw SQL queries

**Examples**:
```typescript
// ❌ BAD - No pagination
const users = await prisma.user.findMany();

// ✅ GOOD - Paginated
const users = await prisma.user.findMany({
  take: 50,
  skip: page * 50
});

// ❌ BAD - Deep includes
const posts = await prisma.post.findMany({
  include: {
    author: {
      include: {
        profile: {
          include: {
            settings: {
              include: { preferences: true }
            }
          }
        }
      }
    }
  }
});

// ✅ GOOD - Optimized query
const posts = await prisma.post.findMany({
  select: {
    id: true,
    title: true,
    author: {
      select: { name: true, email: true }
    }
  }
});
```

### 5. Error Handling (`local/error-handling`)

**Purpose**: Ensures consistent and safe error handling patterns.

**What it catches**:
- Empty catch blocks
- Console.log statements in production code
- Inconsistent error response formats
- Unhandled Promise rejections
- Generic error messages without context

**Examples**:
```typescript
// ❌ BAD - Empty catch
try {
  await dangerousOperation();
} catch (error) {
  // Silent failure!
}

// ✅ GOOD - Proper error handling
try {
  await dangerousOperation();
} catch (error) {
  logger.error('Failed to process operation', { error, context });
  throw new ProcessingError('Operation failed', { cause: error });
}

// ❌ BAD - Generic error
return NextResponse.json({ error: "Something went wrong" });

// ✅ GOOD - Specific error
return NextResponse.json({ 
  error: "Failed to create user: invalid email format" 
});
```

## Rule Severity Levels

- **Error**: Blocks builds and CI/CD
  - `auth-consistency`: Critical security issue
  - `api-security`: Security vulnerabilities
  - `type-safety`: Type safety violations

- **Warning**: Allows builds but should be fixed
  - `database-performance`: Performance issues
  - `error-handling`: Code quality issues

## Configuration

Rules are configured in `.eslintrc.json`:

```json
{
  "rules": {
    "local/auth-consistency": "error",
    "local/api-security": "error", 
    "local/type-safety": "error",
    "local/database-performance": "warn",
    "local/error-handling": "warn"
  }
}
```

## Running ESLint

```bash
# Check all files
npm run lint

# Auto-fix what can be fixed
npm run lint -- --fix

# Check specific file
npx eslint src/app/api/documents/route.ts

# Check only API routes
npx eslint "src/app/api/**/*.ts"
```

## Disabling Rules

Only disable rules with clear justification:

```typescript
// eslint-disable-next-line local/type-safety -- Legacy API requires any type
function legacyFunction(data: any) {
  // ...
}

// For entire files (rare cases only)
/* eslint-disable local/database-performance */
// Bulk data migration script
```

## Integration with CI/CD

ESLint runs in CI and blocks deployments on errors:

```yaml
# .github/workflows/ci.yml
- name: Lint
  run: npm run lint
```

## Adding New Rules

1. Create rule file in `/eslint-rules/`
2. Add to `/eslint-rules/index.js`
3. Configure in `.eslintrc.json`
4. Update this documentation
5. Test with existing codebase

## Related Files

- `/eslint-rules/` - Custom rule implementations
- `.eslintrc.json` - ESLint configuration
- `/docs/security/api-authentication.md` - Authentication standards
- `/docs/development/` - Other development guidelines

## Benefits

✅ **Security**: Prevents auth bypasses and data leaks  
✅ **Type Safety**: Catches errors at build time  
✅ **Performance**: Prevents expensive database queries  
✅ **Consistency**: Enforces team coding standards  
✅ **Quality**: Reduces bugs and technical debt