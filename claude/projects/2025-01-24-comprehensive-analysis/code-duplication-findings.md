# Code Duplication Analysis

## Summary
Significant code duplication found across API routes, authentication patterns, and data transformation logic.

## Critical Duplication Issues

### 1. API Route Error Handling Pattern (High Priority)
**Occurrences**: 20+ API routes

**Pattern**:
```typescript
try {
  const userId = await authenticateRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... route logic ...
} catch (error) {
  console.error("Error in [route name]:", error);
  return NextResponse.json(
    { error: "Failed to [action]" },
    { status: 500 }
  );
}
```

**Recommendation**: Create a standardized API wrapper function.

### 2. Agent Schema Conversion Pattern (High Priority)
**Occurrences**: 3+ times in Agent.ts, multiple API routes

**Pattern**: Complex conversion from Prisma agent data to Zod-validated schema with nested version data.

**Recommendation**: Create `transformPrismaAgentToSchema()` utility function.

### 3. Authentication Check Pattern (High Priority)
**Occurrences**: 14+ API routes

Despite having helper functions, the authentication check and 401 response pattern is duplicated.

**Recommendation**: Include authentication in the API wrapper function.

### 4. Database Query Pattern for Documents (Medium Priority)
**Occurrences**: Multiple API routes and models

**Pattern**: Complex include patterns for documents with versions and submittedBy relations.

**Recommendation**: Create shared Prisma include objects.

### 5. Button Styling Pattern (Medium Priority)
**Occurrences**: 43+ component files

Despite having a Button component, inline button styles are duplicated throughout.

**Recommendation**: Enforce Button component usage through linting.

### 6. Prisma Client Creation (Medium Priority)
**Occurrences**: Several routes

Some routes create new PrismaClient instances instead of using the shared one.

**Recommendation**: Always import from `@/lib/prisma`.

## Proposed Solutions

### 1. API Wrapper Function
```typescript
// lib/api-utils.ts
export async function withApiHandler<T>(
  request: NextRequest,
  requireAuth: boolean,
  handler: (userId?: string) => Promise<T>
) {
  try {
    let userId: string | undefined;
    if (requireAuth) {
      userId = await authenticateRequest(request);
      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
    const result = await handler(userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
```

### 2. Shared Prisma Includes
```typescript
// lib/prisma-includes.ts
export const documentWithLatestVersion = {
  versions: {
    orderBy: { version: "desc" as const },
    take: 1,
  },
  submittedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
};
```

## Impact
- **Lines of code that could be eliminated**: ~500-800
- **Maintenance improvement**: High
- **Bug reduction potential**: High (consistent error handling)
- **Developer experience**: Significantly improved