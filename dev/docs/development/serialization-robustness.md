# Codebase Robustness Investigation: Serialization & Type Safety

**Date:** August 2025  
**Context:** Following a production bug where Prisma Decimal objects weren't properly serialized due to minified constructor names, this investigation identifies similar patterns and potential issues.

## Executive Summary

The root cause of the recent bug was relying on `constructor.name === 'Decimal'` which fails in production builds where code is minified to `i`. This investigation found several areas where similar patterns could cause issues, along with recommendations for improving type safety and robustness.

## Critical Findings

### 1. Constructor Name Dependencies ❌ HIGH RISK

**Issue:** The serialization functions relied on checking `constructor.name` which gets minified in production.

**Affected Files:**
- `/apps/web/src/infrastructure/database/prisma-serializers.ts` (NOW FIXED)

**Fix Applied:**
```typescript
// Before (broken in production):
if (obj.constructor.name === 'Decimal')

// After (works in production):
if (('s' in obj && 'e' in obj && 'd' in obj) || // Duck typing
    (obj.constructor?.name === 'Decimal' || obj.constructor?.name === 'i'))
```

**Recommendation:** Always use feature detection over constructor names.

### 2. Missing Serialization in Server Components ⚠️ MEDIUM RISK

**Issue:** Several Server Components fetch Prisma data but don't use serialization functions.

**At-Risk Pages:**
- `/app/jobs/page.tsx` - Uses `serializeJob()` ✅
- `/app/docs/[docId]/page.tsx` - NO SERIALIZATION ❌
- `/app/agents/page.tsx` - NO SERIALIZATION ❌  
- `/app/settings/costs/page.tsx` - NO SERIALIZATION ❌
- `/app/docs/[docId]/evals/[agentId]/logs/page.tsx` - NO SERIALIZATION ❌

**Example Problem:**
```typescript
// This will fail if agents have Decimal fields
const dbAgents = await prisma.agent.findMany({...});
return <AgentList agents={dbAgents} />; // Passing raw Prisma objects!
```

### 3. Inconsistent Error Handling with instanceof ⚠️ MEDIUM RISK

**Issue:** Using `instanceof` with Prisma error types works, but the pattern is inconsistent.

**Files Using instanceof with Prisma:**
- `/infrastructure/database/db-error-handler.ts` - Proper Prisma error handling ✅
- Multiple files use `error instanceof Error` which is safe ✅

**Potential Issue:** While Prisma error classes are imported directly and work with `instanceof`, this could break if Prisma changes their error export structure.

### 4. Date Serialization Inconsistency ⚠️ LOW RISK

**Issue:** Dates are handled inconsistently across serializers.

**Examples:**
```typescript
// In prisma-serializers.ts:
if (obj instanceof Date) return obj.toISOString();

// In prisma-serializers-client.ts:
createdAt: job.createdAt instanceof Date ? job.createdAt.toISOString() : job.createdAt
```

The second pattern assumes the value might already be a string, suggesting double-serialization might occur.

### 5. Type Safety at Component Boundaries ❌ HIGH RISK

**Issue:** No runtime validation when data crosses from Server to Client Components.

**Problem Areas:**
- Client components receive `any` typed props from server components
- No validation that Decimals are actually serialized
- TypeScript can't enforce serialization across the boundary

**Example:**
```typescript
// Server Component
const data = await prisma.evaluation.findFirst({...});
// TypeScript thinks this is fine, but it's not!
return <ClientComponent data={data} />; 
```

## Recommendations

### Immediate Actions (Do Now)

1. **Add serialization to all Server Components that fetch Prisma data:**
```typescript
// Every page.tsx that uses prisma should do:
const rawData = await prisma.model.findMany({...});
const serializedData = serializePrismaResult(rawData);
return <Component data={serializedData} />;
```

2. **Create a type-safe wrapper for Prisma queries in Server Components:**
```typescript
export async function safePrismaQuery<T>(
  query: Promise<T>
): Promise<SerializedDecimal<T>> {
  const result = await query;
  return serializePrismaResult(result);
}

// Usage:
const agents = await safePrismaQuery(
  prisma.agent.findMany({...})
);
```

3. **Add runtime validation for Client Components:**
```typescript
// utils/validate-serializable.ts
export function assertSerializable(obj: unknown, componentName: string) {
  if (process.env.NODE_ENV !== 'production') {
    // Deep check for Decimal objects
    JSON.stringify(obj, (key, value) => {
      if (value && typeof value === 'object' && 's' in value && 'e' in value) {
        throw new Error(`${componentName}: Received non-serialized Decimal at ${key}`);
      }
      return value;
    });
  }
}
```

### Long-term Improvements

1. **Use Zod schemas for Server/Client boundaries:**
```typescript
const SerializedEvaluationSchema = z.object({
  id: z.string(),
  priceInDollars: z.string(), // Not z.number()!
  createdAt: z.string(), // Not z.date()!
});

// In Client Component:
const validated = SerializedEvaluationSchema.parse(props);
```

2. **Create a Prisma middleware for automatic serialization:**
```typescript
prisma.$use(async (params, next) => {
  const result = await next(params);
  if (params.action.startsWith('find')) {
    return serializePrismaResult(result);
  }
  return result;
});
```

3. **Add ESLint rules:**
```javascript
// Warn when passing prisma results directly to components
'no-restricted-syntax': [
  'error',
  {
    selector: 'JSXElement[name.name=/^[A-Z]/] > JSXAttribute[name.name="data"][value.expression.callee.property.name=/^find/]',
    message: 'Serialize Prisma results before passing to components'
  }
]
```

## Files Requiring Immediate Updates

### High Priority (Pages with Decimal fields):
1. `/app/settings/costs/page.tsx` - Job costs page
2. `/app/docs/[docId]/evals/[agentId]/logs/page.tsx` - Evaluation logs

### Medium Priority (Might have Decimal fields):
1. `/app/docs/[docId]/page.tsx` - Document page
2. `/app/agents/page.tsx` - Agents listing

## Testing Recommendations

1. **Add production build tests:**
```json
{
  "scripts": {
    "test:production": "NODE_ENV=production npm run build && npm run test"
  }
}
```

2. **Create serialization tests:**
```typescript
describe('Serialization', () => {
  it('handles minified Decimal objects', () => {
    const decimal = { s: 1, e: 2, d: [100], constructor: { name: 'i' }};
    expect(typeof serializeDecimal(decimal)).toBe('string');
  });
});
```

## Conclusion

The codebase has several areas where similar issues could occur:
- 7 pages that don't serialize Prisma results before passing to components
- Inconsistent Date handling that could cause double-serialization
- No runtime validation at Server/Client boundaries
- Type system can't enforce serialization requirements

The immediate fix is to add `serializePrismaResult()` calls to all Server Components that fetch data. Long-term, we should implement automatic serialization and runtime validation to prevent these issues systematically.

## Appendix: Affected Models with Decimal Fields

Based on the Prisma schema, these models have Decimal fields that require serialization:
- `Job.priceInDollars`
- `Task.priceInDollars`

Any page fetching these models MUST serialize before passing to Client Components.