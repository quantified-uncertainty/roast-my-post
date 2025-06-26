# Fix Static Generation for Docker Build

The Docker build is failing because Next.js tries to statically generate pages that require database access. Add the following to the top of these files:

```typescript
export const dynamic = 'force-dynamic'
```

## Files that need this fix:

1. `/src/app/docs/page.tsx` - calls `DocumentModel.getRecentDocumentsWithEvaluations()`
2. `/src/app/jobs/page.tsx` - likely calls database
3. `/src/app/agents/page.tsx` - likely calls database
4. `/src/app/users/[userId]/agents/page.tsx` - dynamic route with database
5. `/src/app/users/[userId]/documents/page.tsx` - dynamic route with database
6. `/src/app/settings/costs/page.tsx` - likely calls database
7. `/src/app/settings/profile/page.tsx` - likely calls database

## Example fix:

```typescript
// Add at the top of the file, after imports
export const dynamic = 'force-dynamic'

// Rest of your component...
export default async function DocumentsPage() {
  // ...
}
```

## Alternative: Environment Variable

If you prefer not to modify the code, you can add this to the Dockerfile:

```dockerfile
ENV SKIP_BUILD_STATIC_GENERATION=1
```

And check for it in your pages:

```typescript
if (process.env.SKIP_BUILD_STATIC_GENERATION) {
  return { notFound: true }
}
```

Once these fixes are applied, the Docker build should complete successfully and create a much smaller image using the standalone output.