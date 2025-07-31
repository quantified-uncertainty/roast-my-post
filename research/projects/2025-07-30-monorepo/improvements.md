# Monorepo Improvements & Issues

## Current Issues

### 1. Inconsistent Script Execution
Some scripts use `cd apps/web && tsx` while others use `pnpm --filter`. This is inconsistent and fragile.

**Current:**
```json
"process-jobs": "cd apps/web && tsx src/scripts/process-job.ts",
"db:migrate:reset": "cd internal-packages/db && ../../dev/scripts/safe-prisma.sh migrate reset"
```

**Recommended:**
Create package.json scripts in each workspace and call them:
```json
"process-jobs": "pnpm --filter @roast/web run process-jobs",
"db:migrate:reset": "pnpm --filter @roast/db run migrate:reset:safe"
```

### 2. Missing Turborepo Optimizations

**Current turbo.json issues:**
- No output caching for test commands (except test:unit)
- Missing pipeline dependencies for some tasks
- No inputs defined (Turbo will hash everything)

**Recommended additions:**
```json
{
  "tasks": {
    "test:ci": {
      "dependsOn": ["^build", "@roast/db#gen"],
      "outputs": ["coverage/**"],
      "inputs": ["src/**", "!src/**/*.test.ts"]
    },
    "lint": {
      "dependsOn": ["@roast/db#gen"],
      "outputs": [],
      "inputs": ["src/**", "config/eslint/**"]
    }
  }
}
```

### 3. Workspace Protocol Issues

All internal dependencies use `workspace:*` which means "any version". This can cause issues if packages have different versions.

**Recommended:** Use `workspace:^` for more predictable behavior.

### 4. Missing pnpm Features

Not utilizing pnpm's features:
- No `pnpm-workspace.yaml` catalog for shared dependencies
- No overrides for security patches
- No shared scripts in root package.json using filters

### 5. Dev Environment Setup

Missing standardization for:
- Where .env files should live (root vs packages)
- How to handle multiple .env files in monorepo
- Database URL management across packages

## Recommended Fixes

### 1. Standardize Script Execution

Add to apps/web/package.json:
```json
{
  "scripts": {
    "process-jobs": "tsx src/scripts/process-job.ts",
    "process-jobs:adaptive": "tsx src/scripts/process-jobs-adaptive.ts",
    "cleanup-stale-jobs": "tsx src/scripts/cleanup-stale-jobs.ts"
  }
}
```

Then in root package.json:
```json
{
  "scripts": {
    "process-jobs": "pnpm --filter @roast/web run process-jobs"
  }
}
```

### 2. Fix safe-prisma.sh for Monorepo

Update the script to:
1. Detect monorepo structure
2. Use correct paths for db package
3. Remove hardcoded PROJECT_ROOT assumptions

### 3. Add pnpm Catalog (Optional)

Create centralized dependency management:
```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'internal-packages/*'

catalog:
  # Shared versions
  typescript: ^5.0.0
  '@types/node': ^20.0.0
  eslint: ^8.57.0
```

### 4. Environment Variable Management

Create .env.example files in each package that needs them:
- `/apps/web/.env.example`
- `/apps/mcp-server/.env.example`

Use dotenv-cli in scripts that need env vars:
```json
"with-env": "dotenv -e ../../.env --"
```

### 5. Add Monorepo-Specific Git Hooks

Use husky or similar to:
- Prevent commits with `workspace:*` to registry
- Run affected tests only
- Validate pnpm-lock.yaml

### 6. Missing .gitignore Entries

Add:
```
# Monorepo specific
**/.turbo
**/dist
**/build
**/.next
**/coverage
**/*.tsbuildinfo

# pnpm
.pnpm-store/
```

## Quick Wins

1. **Fix the safe-prisma.sh path issue** - High impact, easy fix
2. **Standardize script execution** - Medium impact, improves maintainability  
3. **Add turbo.json inputs** - Will speed up builds significantly
4. **Document .env file locations** - Prevents confusion

## Long-term Improvements

1. **Consider Nx instead of Turborepo** - Better monorepo features
2. **Add changesets** - For versioning and changelogs
3. **Set up shared ESLint config package** - Consistency across packages
4. **Add workspace-specific TypeScript configs** - Better type isolation