# Quick Reference: Common Fixes

## 🔐 Add Authentication to Route

```typescript
// Add to any unprotected route
import { authenticateRequest } from "@/lib/auth-helpers";
import { commonErrors } from "@/lib/api-response-helpers";

export async function GET(request: NextRequest) {
  const userId = await authenticateRequest(request);
  if (!userId) {
    return commonErrors.unauthorized();
  }
  
  // Your route logic here
}
```

## 🛡️ Fix Error Handling

```typescript
// ❌ BAD - Leaks internal errors
catch (error) {
  return errorResponse(error.message, 500);
}

// ✅ GOOD - Safe error handling
catch (error) {
  logger.error('Operation failed', { error, userId });
  return commonErrors.serverError("Operation failed. Please try again.");
}
```

## 🎯 Add Input Validation

```typescript
import { z } from "zod";

const RequestSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(50000),
  url: z.string().url().startsWith("http"),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = RequestSchema.safeParse(body);
  
  if (!parsed.success) {
    return badRequestResponse("Invalid request data");
  }
  
  const { title, content, url } = parsed.data;
}
```

## 📄 Add Pagination

```typescript
// Parse query params
const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');

// Query with pagination
const items = await prisma.model.findMany({
  skip: (page - 1) * limit,
  take: limit,
  orderBy: { createdAt: 'desc' }
});

const total = await prisma.model.count();

return successResponse({
  items,
  pagination: {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit)
  }
});
```

## 🏃 Fix Type Safety

```typescript
// ❌ BAD - Using any
export async function GET(req: NextRequest, context: any) {
  const id = context.params.id;
}

// ✅ GOOD - Properly typed
interface RouteContext {
  params: {
    id: string;
  };
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = context.params;
}
```

## 🗄️ Use Shared Prisma Client

```typescript
// ❌ BAD - Creates new connection
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// ✅ GOOD - Uses shared instance
import { prisma } from "@/lib/prisma";
```

## 🚦 Add Rate Limiting

```typescript
import { rateLimit } from "@/lib/rate-limiter";

export async function POST(request: NextRequest) {
  const identifier = request.ip || 'anonymous';
  const { success } = await rateLimit.check(identifier);
  
  if (!success) {
    return new Response("Too Many Requests", { status: 429 });
  }
  
  // Continue with request
}
```

## 🔍 Common Search Commands

```bash
# Find unprotected routes
rg "export async function (GET|POST|PUT|DELETE)" --type ts | grep -v authenticateRequest

# Find any types
rg ":\s*any" --type ts

# Find console.log
rg "console\.(log|error)" --type ts

# Find missing pagination
rg "findMany\(" --type ts | grep -v "take:"

# Find new PrismaClient
rg "new PrismaClient" --type ts
```

## 📋 Checklist for New Routes

- [ ] Authentication check added
- [ ] Input validation with Zod
- [ ] Error handling doesn't leak info
- [ ] Pagination for list endpoints
- [ ] No `any` types used
- [ ] Using shared Prisma client
- [ ] Rate limiting if needed
- [ ] Proper TypeScript types
- [ ] Returns standard response format