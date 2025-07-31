# Monorepo Migration - Systematic Issue Audit

Generated: Wed Jul 30 13:54:58 PDT 2025

## 1. CRITICAL: Old Prisma Import Paths

      65
files still use '@/lib/prisma' instead of '@roast/db'

## 2. Other Old Import Paths

### @/lib/ imports that should use @roast/web:
     273
files use '@/lib/*' (excluding prisma)

### Relative imports from ../src/:
       8
files use relative '../src/' imports

## 3. Environment Variable Issues

### Scripts loading .env from wrong paths:
      32
files reference .env files

## 4. Package.json Script Issues

### npm run references (should be pnpm):
       3
package.json files still use 'npm run'

## 5. Jest/Test Configuration Issues

### Mock imports that may be broken:
      63
test files use jest.mock with '@/' paths

## 6. Docker Configuration Issues

### Dockerfile references to check:
       2
Docker files to verify

## 7. Configuration File Issues

### Config files that may reference old paths:
       6
config files to check

## 8. Hardcoded Path References

### Files with '/src/' hardcoded paths:
       0
files with hardcoded '/src/' paths


## Specific Examples of Critical Issues

### 1. Files still importing '@/lib/prisma':
apps/web/src/app/settings/costs/page.tsx:import { prisma } from "@/lib/prisma";
apps/web/src/app/settings/profile/page.tsx:import { prisma } from "@/lib/prisma";
apps/web/src/app/agents/page.tsx:import { prisma } from "@/lib/prisma";
apps/web/src/app/docs/[docId]/evals/[agentId]/versions/[versionNumber]/logs/page.tsx:import { prisma } from "@/lib/prisma";
apps/web/src/app/docs/[docId]/evals/[agentId]/versions/[versionNumber]/logs/page.tsx:import { evaluationWithAllVersions } from "@/lib/prisma/evaluation-includes";
apps/web/src/app/docs/[docId]/evals/[agentId]/versions/[versionNumber]/page.tsx:import { prisma } from "@/lib/prisma";
apps/web/src/app/docs/[docId]/evals/[agentId]/versions/[versionNumber]/page.tsx:import { evaluationWithAllVersions } from "@/lib/prisma/evaluation-includes";
apps/web/src/app/docs/[docId]/evals/[agentId]/versions/page.tsx:import { prisma } from "@/lib/prisma";
apps/web/src/app/docs/[docId]/evals/[agentId]/logs/page.tsx:import { prisma } from "@/lib/prisma";
apps/web/src/app/docs/[docId]/evals/[agentId]/logs/page.tsx:import { evaluationWithCurrentJob } from "@/lib/prisma/evaluation-includes";

### 2. Jest mock files with wrong paths:
apps/web/src/tools/check-math/check-math.test.ts:jest.mock('@/lib/claude/wrapper');
apps/web/src/tools/extract-forecasting-claims/extract-forecasting-claims.test.ts:jest.mock("@/lib/claude/wrapper");
apps/web/src/tools/extract-factual-claims/extract-factual-claims.test.ts:jest.mock('@/lib/claude/wrapper', () => ({
apps/web/src/tools/check-spelling-grammar/check-spelling-grammar.test.ts:jest.mock('@/lib/claude/wrapper', () => ({
apps/web/src/tools/extract-math-expressions/extract-math-expressions.test.ts:jest.mock('@/lib/claude/wrapper');

### 3. Package.json files with npm run:
./package.json
./apps/web/package.json
./apps/mcp-server/package.json


## Priority Action Plan

### CRITICAL (Must Fix Immediately)
1. **Fix 65 files importing '@/lib/prisma'** → should import from '@roast/db'
   - This will cause runtime failures
   - Need global find/replace across apps/web/src/

2. **Fix 63 jest.mock paths** → update mock paths for monorepo
   - Test failures likely occurring
   - Update all '@/' mock paths

### HIGH Priority  
3. **Fix 273 other '@/lib/*' imports** → may need @roast/web prefix for external scripts
   - Could cause import failures
   - Need to determine which are internal vs external references

4. **Check 3 package.json npm run references** → convert to pnpm
   - Could cause script execution failures

### MEDIUM Priority
5. **Fix 8 relative '../src/' imports** → update to workspace imports
   - Likely in dev/ scripts

6. **Review 32 .env file references** → ensure correct paths in monorepo
   - Environment loading issues

7. **Verify 2 Docker files** → ensure correct build context and paths
   - Deployment failures

8. **Check 6 config files** → ensure paths work in monorepo
   - Build/lint/test configuration issues

### Testing Strategy
After each fix:
1. Run `pnpm --filter @roast/web run typecheck`
2. Run `pnpm --filter @roast/web run test:ci`  
3. Test dev server startup
4. Verify imports work correctly

### Tools Needed
- Global find/replace for import paths
- Systematic testing after each category of fixes
- Verification that all workspace references resolve correctly

## Notes
- This audit reveals the monorepo migration was incomplete
- Many files still reference the old single-repo structure
- Need systematic fix approach to avoid breaking more things
EOF < /dev/null