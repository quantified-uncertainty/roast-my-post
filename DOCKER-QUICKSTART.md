# Docker Quick Debugging Guide

## 🚨 When Docker Builds Fail

### 1-Minute Health Check
```bash
# Run this first - catches 90% of issues
pnpm run docker:validate
```

### Common Fixes (in order of likelihood)

#### 1. "Cannot find module @roast/domain" or similar
```bash
# Packages need building
pnpm --filter @roast/db run gen
pnpm --filter @roast/domain run build
```

#### 2. "ENOENT: schema.prisma not found"
```bash
# Prisma needs regeneration
cd internal-packages/db
pnpm run gen
```

#### 3. Test if it's actually broken
```bash
# Quick local test (takes ~2 min)
pnpm run docker:test
```

#### 4. TypeScript errors in Docker but not locally
```bash
# Check if packages compile
pnpm run typecheck
pnpm run lint
```

## 🎯 Prevention Checklist

Before pushing changes that touch packages:
```bash
# Quick validation (30 seconds)
pnpm run docker:validate

# Full test (2-3 minutes) 
pnpm run docker:quick
```

## 🔍 Understanding the Build

### What Gets Built vs What Doesn't

| Package | Needs Build? | Why |
|---------|-------------|------|
| @roast/db | ✅ Yes | Prisma generates JavaScript |
| @roast/domain | ✅ Yes | Other packages expect dist/ |
| @roast/ai | ❌ No | Worker uses tsx (runs TypeScript directly) |

### Key Insight: tsx vs node
- **Worker**: Uses `tsx` → Can run TypeScript directly
- **Regular node**: Needs compiled JavaScript
- **Next.js**: Has `transpilePackages` config

## 🛠️ Debugging Tools

### See what's in the Docker image
```bash
docker run --rm -it roastmypost-worker:test sh
ls -la /app/internal-packages/*/
```

### Test package loading
```bash
docker run --rm roastmypost-worker:test \
  npx tsx -e "require('@roast/domain'); console.log('✅')"
```

### Check CI status (non-blocking)
The `docker-test.yml` workflow runs on PRs but won't block merging. Check it for early warnings.

## 📚 Full Documentation

For complete details, see:
- `/dev/docs/infrastructure/docker-monorepo.md` - Full investigation and rationale
- `CLAUDE.md` - Docker build strategy section
- `/dev/scripts/test-docker-builds.sh` - Test script source