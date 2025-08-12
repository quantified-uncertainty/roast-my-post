# TypeScript Build Issues in Monorepo

## Problem: TypeScript Not Generating Declaration Files

### Symptoms
- Module resolution errors: `Cannot find module '@roast/db'` or similar
- Missing `.d.ts` files in `dist/` directories
- TypeScript compilation succeeds but no declaration files are created
- CI/CD pipeline failures with hundreds of TypeScript errors

### Root Cause
TypeScript composite projects (with `"composite": true` in tsconfig.json) require using `tsc --build` instead of plain `tsc` to generate declaration files properly.

### Solution

1. **Update all package.json build scripts** to use `tsc --build`:
   ```json
   {
     "scripts": {
       "build": "tsc --build",  // NOT just "tsc"
       "typecheck": "tsc --noEmit"  // NOT "tsc --build --noEmit"
     }
   }
   ```

2. **Clean incremental build cache** when issues persist:
   ```bash
   # Remove all tsbuildinfo files
   find . -name "*.tsbuildinfo" -delete
   
   # Clean all dist directories
   rm -rf internal-packages/*/dist
   
   # Rebuild
   pnpm -w run build
   ```

3. **Ensure proper exports** in package index files:
   ```typescript
   // internal-packages/db/src/index.ts
   export { prisma } from './client';
   export { Prisma, type PrismaClient } from './client';
   export * from './types';
   ```

## Problem: Circular Dependencies with Prisma

### Symptoms
- TypeScript fails silently when processing Prisma types
- `exclude` in tsconfig.json includes the Prisma generated directory
- Types from Prisma client not being exported

### Solution

1. **Import Prisma types through an intermediate file**:
   ```typescript
   // client.ts - imports from generated
   export { Prisma, type PrismaClient } from '../generated';
   
   // types.ts - imports from client (not generated directly)
   export type { User, Document } from './client';
   
   // index.ts - re-exports both
   export * from './client';
   export * from './types';
   ```

2. **Exclude generated directory** in tsconfig.json:
   ```json
   {
     "exclude": ["node_modules", "dist", "generated"]
   }
   ```

## Problem: Project References with --noEmit

### Symptoms
- Error: `Referenced project may not disable emit`
- Occurs when using `tsc --build --noEmit` for typecheck

### Solution

Use plain `tsc --noEmit` for type checking (not `tsc --build --noEmit`):
```json
{
  "scripts": {
    "build": "tsc --build",        // For building
    "typecheck": "tsc --noEmit"    // For type checking
  }
}
```

## Common Commands

```bash
# Full rebuild from clean state
pnpm -w run clean
pnpm -w run build

# Check for TypeScript errors
pnpm -w run check

# Run CI tests
pnpm --filter @roast/web run test:ci

# Debug module resolution
npx tsc --traceResolution | grep "@roast"
```

## Key Insights

1. **Composite projects are different**: They require `--build` flag for proper compilation
2. **Declaration generation can fail silently**: Always verify `.d.ts` files exist after build
3. **Incremental builds can get stuck**: Delete tsbuildinfo files when in doubt
4. **Monorepo dependencies matter**: Build packages in dependency order

## References

- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [TypeScript Composite Projects](https://www.typescriptlang.org/tsconfig#composite)
- Issue resolved: PR #161 (jobs-extraction branch)