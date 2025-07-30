# Monorepo Improvement Plan - Detailed Analysis

## Overview
This document provides a detailed analysis of each proposed improvement, evaluating whether it makes sense now or should be deferred.

## Proposed Improvements Analysis

### 1. Root TypeScript Configuration ⚠️ **DEFER**

**What it would involve:**
- Create `/tsconfig.json` with shared compiler options
- Update `apps/web/tsconfig.json` to extend from root
- Update `apps/mcp-server/tsconfig.json` to extend from root
- Update `internal-packages/db/tsconfig.json` if it exists

**Benefits:**
- Consistent TypeScript settings across packages
- Single source of truth for compiler options
- Easier to update TypeScript settings globally

**Risks:**
- **HIGH RISK**: Different packages may need different settings
  - Next.js requires specific compiler options for JSX, module resolution
  - MCP server is a Node.js app with different requirements
  - DB package is minimal and may not need complex settings
- Could break existing builds if settings conflict
- May complicate per-package customization

**Recommendation: DEFER**
- Current setup is working fine
- Each package has appropriate settings for its use case
- Risk of breaking builds outweighs minor benefit of DRY

---

### 2. pnpm Configuration File (.npmrc) ✅ **DO NOW**

**What it would involve:**
- Create `/.npmrc` with:
  ```
  auto-install-peers=true
  strict-peer-dependencies=false
  shamefully-hoist=true
  ```

**Benefits:**
- Consistent dependency resolution across developers
- Prevents "peer dependency not found" errors
- Ensures CI behaves same as local development

**Risks:**
- **LOW RISK**: These are standard pnpm settings
- No breaking changes expected

**Recommendation: IMPLEMENT NOW**
- Simple addition with immediate benefits
- Prevents common pnpm issues
- No maintenance burden

---

### 3. Husky Pre-commit Hooks ⚠️ **DEFER**

**What it would involve:**
- Install husky as dev dependency
- Create `.husky/pre-commit` with:
  ```bash
  pnpm run check
  pnpm run test:ci
  ```
- Setup husky install in package.json prepare script

**Benefits:**
- Catches errors before commit
- Enforces code quality standards
- Prevents broken commits

**Risks:**
- **MEDIUM RISK**: May slow down development workflow
- Can be annoying if tests are slow
- Developers can bypass with `--no-verify`
- Another dependency to maintain
- May conflict with existing Git hooks

**Recommendation: DEFER**
- Team should decide on this together
- Consider faster alternatives (lint-staged for only changed files)
- Current CI catches issues adequately

---

### 4. Shared ESLint Config Package ❌ **DON'T DO**

**What it would involve:**
- Create `internal-packages/eslint-config/`
- Extract ESLint rules to shared package
- Update all packages to use shared config
- Maintain and version the config package

**Benefits:**
- Consistent linting rules
- Single source of truth for code style

**Risks:**
- **HIGH COMPLEXITY**: Significant overhead for minimal benefit
- Only two packages currently use ESLint (web and mcp-server)
- Web app has Next.js-specific rules
- Adds complexity to monorepo structure
- More packages to maintain

**Recommendation: DON'T DO**
- Over-engineering for current needs
- ESLint config rarely changes
- Current setup is simple and works

---

### 5. Package Health Check Scripts ✅ **DO NOW**

**What it would involve:**
- Add to root package.json:
  ```json
  "check:all": "turbo run lint typecheck test:ci --parallel",
  "check:deps": "pnpm -r exec pnpm outdated || true",
  "check:security": "pnpm audit"
  ```

**Benefits:**
- Easy way to verify entire monorepo health
- Catches issues across all packages
- Useful for pre-release checks

**Risks:**
- **LOW RISK**: Just convenience scripts
- No breaking changes

**Recommendation: IMPLEMENT NOW**
- Simple addition with high value
- Makes maintenance easier
- No downsides

---

### 6. Fix Auth Adapter Type Compatibility ✅ **DO NOW**

**Current issue:**
```typescript
// TODO: Fix type compatibility between @auth/prisma-adapter v2.10.0 and Prisma Client v6.13.0
```

**What it would involve:**
- Investigate the type mismatch
- Either:
  - Update @auth/prisma-adapter version
  - Add type overrides/patches
  - Create wrapper types

**Benefits:**
- Removes TODO from codebase
- Ensures type safety
- Prevents potential runtime issues

**Risks:**
- **LOW-MEDIUM RISK**: May require dependency updates
- Could affect authentication if done wrong

**Recommendation: IMPLEMENT NOW**
- Active TODO that should be addressed
- Type issues can hide bugs
- Better to fix now than accumulate tech debt

---

### 7. Missing Environment Variables in Turbo ✅ **DO NOW**

**What it would involve:**
- Audit all `process.env` usage in codebase
- Add missing vars to `turbo.json` globalEnv:
  - NEXT_PUBLIC_API_URL
  - DIFFBOT_KEY
  - Any other missing vars

**Benefits:**
- Proper build caching in Turborepo
- Prevents mysterious cache invalidation
- Documents all env vars in one place

**Risks:**
- **NO RISK**: Just configuration update
- Makes builds more predictable

**Recommendation: IMPLEMENT NOW**
- Critical for Turborepo to work correctly
- Simple fix with immediate benefits
- Improves build performance

---

### 8. Fix Inconsistent Script Patterns ⚠️ **PARTIAL**

**Current issue:**
- Some scripts use `dotenv -e .env.local`
- This doesn't load root `.env` files
- Inconsistent with monorepo env strategy

**What it would involve:**
- Update scripts to load env files hierarchically
- Or remove dotenv usage if pnpm handles it

**Benefits:**
- Consistent environment variable loading
- Follows documented ENV_STRATEGY.md

**Risks:**
- **MEDIUM RISK**: May break local developer workflows
- Need to ensure all env vars still load correctly

**Recommendation: INVESTIGATE FIRST**
- Check if current setup is intentional
- May be needed for local overrides
- Fix only if causing actual issues

---

## Implementation Priority

### Do Now (Low Risk, High Value):
1. **pnpm Configuration (.npmrc)**
   - 5 minute task
   - Prevents common issues

2. **Package Health Scripts**
   - 10 minute task
   - Immediate value for maintenance

3. **Environment Variables in Turbo**
   - 30 minute task
   - Critical for build performance

4. **Auth Adapter Type Fix**
   - 1-2 hour investigation
   - Removes tech debt

### Defer (Higher Risk or Lower Value):
1. **Root TypeScript Config**
   - Risk of breaking builds
   - Current setup works fine

2. **Husky Pre-commit Hooks**
   - Team decision needed
   - May slow development

3. **Script Pattern Investigation**
   - Needs investigation first
   - May be intentional

### Don't Do:
1. **Shared ESLint Config Package**
   - Over-engineering
   - Too few packages to benefit

## Recommended Next Steps

1. Implement the "Do Now" items in order
2. Create GitHub issues for deferred items to revisit later
3. Document any decisions about what not to implement

This pragmatic approach avoids over-engineering while addressing real issues that improve developer experience and code quality.