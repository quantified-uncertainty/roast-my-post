# Docker and pnpm Monorepo Build Guide

## Overview

This guide documents our Docker build strategy for the RoastMyPost pnpm workspace monorepo, including the investigation process, failed approaches, and the final working solution.

## The Challenge

Building Docker images for a pnpm workspace monorepo presents unique challenges:

1. **Symlink Dependencies**: pnpm uses symlinks for workspace packages, which don't work across Docker layers
2. **TypeScript Compilation**: Workspace packages need to be built before deployment
3. **Prisma Integration**: Prisma's postinstall scripts complicate pruning strategies
4. **Branch Development**: Frequent changes to internal packages make publishing impractical

## Investigation Timeline

### Attempt 1: pnpm deploy (Failed)

**Approach**: Use `pnpm deploy --prod` to create a pruned, production-ready deployment.

```dockerfile
# What we tried
RUN pnpm --filter web deploy --prod /app/pruned
```

**Result**: ❌ Runtime error: `Cannot find module '@roast/domain/dist/index.js'`

**Why it failed**: 
- `pnpm deploy` copies dependencies but doesn't build TypeScript packages
- The pruned deployment had source TypeScript files but no compiled JavaScript

### Attempt 2: Turbo Prune (Failed)

**Approach**: Follow Squiggle's pattern using Turborepo's prune feature.

```dockerfile
# What we tried
RUN npx turbo prune @roast/web --docker
COPY --from=installer /app/out/json/ .
RUN pnpm install
```

**Result**: ❌ Build error: `Error: ENOENT: no such file or directory, open 'schema.prisma'`

**Why it failed**:
- Turbo prune doesn't handle Prisma's postinstall scripts correctly
- Prisma needs the schema file during `pnpm install` but it's not included in the pruned JSON

**Why it works for Squiggle**:
- Squiggle publishes packages to NPM, avoiding workspace dependencies
- No Prisma in their stack

### Attempt 3: Publishing Packages (Rejected)

**Approach**: Publish internal packages to GitHub Packages or NPM.

**User feedback**: 
> "This also feels wrong to me. We'll be frequently changing many of the libs"
> "How will this work with branches, where the db is changed?"

**Why rejected**:
- Version management complexity with frequent changes
- Branch development would require unique versions per branch
- Overkill for internal packages that change often

### Final Solution: Build Everything in Docker ✅

**Approach**: Simple, straightforward - copy everything and build in Docker.

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

# Copy entire monorepo
COPY . .

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build packages that need compilation
RUN pnpm --filter @roast/db run build
RUN pnpm --filter @roast/domain run build
# Note: @roast/ai doesn't need building - consumed as TypeScript by tsx

# Runner stage copies everything
FROM node:20-alpine AS runner
COPY --from=builder /app .
```

## Key Discovery: tsx vs node

### The Revelation

During testing, we discovered that the worker uses `tsx` (TypeScript executor), not `node`:

```bash
# Worker's package.json
"process-jobs-adaptive": "tsx src/scripts/process-jobs-adaptive.ts"
```

### Implications

This changes everything about which packages need building:

| Execution Method | Can Run TypeScript? | Needs Compiled JS? |
|-----------------|--------------------|--------------------|
| `node` | ❌ No | ✅ Yes |
| `tsx` | ✅ Yes | ❌ No |
| Next.js | ✅ Yes (via transpilePackages) | ❌ No |

### Package Build Matrix

| Package | Build Required? | Reason |
|---------|----------------|---------|
| `@roast/db` | ✅ Yes | Contains Prisma generated client (always JavaScript) |
| `@roast/domain` | ✅ Yes | May be imported by packages expecting compiled code |
| `@roast/ai` | ❌ No | Worker uses tsx, Next.js uses transpilePackages |

### Testing the Discovery

```bash
# This works (tsx handles TypeScript)
docker run --rm roastmypost-worker:test \
  sh -c 'npx tsx -e "const ai = require(\"@roast/ai\"); console.log(\"✅\")"'

# This fails (node needs compiled JavaScript)  
docker run --rm roastmypost-worker:test \
  sh -c 'node -e "const ai = require(\"@roast/ai\"); console.log(\"❌\")"'
```

## Current Docker Files

### Dockerfile.worker

```dockerfile
# Worker Dockerfile - Simple approach that builds everything in place
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies for build
RUN apk add --no-cache libc6-compat python3 make g++

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy everything
COPY . .

# Install all dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Build the packages that need building (in dependency order)
RUN pnpm --filter @roast/db run build
RUN pnpm --filter @roast/domain run build
# Note: @roast/ai doesn't need building - it's consumed as TypeScript by tsx

# ================================ Runner ================================
FROM node:20-alpine AS runner
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@latest --activate

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy the entire built application from builder
COPY --from=builder --chown=nextjs:nodejs /app .

# Switch to non-root user
USER nextjs

# Set working directory to the web app
WORKDIR /app/apps/web

# Run the adaptive job processor
CMD ["pnpm", "run", "process-jobs-adaptive"]
```

### Key Points

1. **Build stage**: Compiles only necessary packages
2. **Runner stage**: Copies everything (including source TypeScript for @roast/ai)
3. **tsx execution**: Worker commands use tsx, enabling direct TypeScript execution

## Testing Docker Builds

### Local Test Script

```bash
#!/bin/bash
set -euo pipefail

# Build the worker image
docker build -f Dockerfile.worker -t roastmypost-worker:test .

# Test runtime package access
docker run --rm roastmypost-worker:test \
  sh -c 'cd /app/apps/web && npx tsx -e "
    console.log(\"Testing package access...\");
    const domain = require(\"@roast/domain\");
    console.log(\"✅ @roast/domain loaded\");
    const db = require(\"@roast/db\");
    console.log(\"✅ @roast/db loaded\");
    const ai = require(\"@roast/ai\");
    console.log(\"✅ @roast/ai loaded\");
  "'
```

## Trade-offs and Benefits

### Benefits of Our Approach

✅ **Simple and predictable** - No complex pruning or publishing
✅ **Works with any branch** - No version conflicts
✅ **Fast iteration** - Change and rebuild without publishing
✅ **Preserves monorepo structure** - Familiar paths and imports

### Trade-offs

⚠️ **Larger images** - Includes all source code (~200MB vs potential ~100MB)
⚠️ **Longer build times** - Builds in Docker rather than CI
⚠️ **Not optimized** - Could be smaller with more complexity

### Why We Accept These Trade-offs

1. **Development velocity** > Image size optimization
2. **Simplicity** > Complex build pipelines  
3. **Reliability** > Marginal performance gains

## Comparison with Other Approaches

### Squiggle's Approach

**What they do**:
- Publish packages to NPM
- Use Turbo prune for Docker builds
- Minimal runtime dependencies

**Why it works for them**:
- Stable packages that rarely change
- No Prisma (avoids postinstall issues)
- Public packages benefit community

### Vercel's Approach

**What they recommend**:
- Turbo prune with remote caching
- Optimized for Vercel platform
- Assumes CI/CD build pipeline

**Why we differ**:
- Self-hosted deployment
- Frequent internal package changes
- Prisma requirements

## Troubleshooting

### Common Issues

#### 1. "Cannot find module" errors

**Check**:
- Is the package listed in `package.json`?
- Does it need building? (Check Package Build Matrix)
- Is it using `tsx` or `node` for execution?

#### 2. Prisma client errors

**Solution**:
```bash
# Always rebuild Prisma after schema changes
RUN pnpm --filter @roast/db run build
```

#### 3. TypeScript type errors in Docker

**Check**:
- Are you building packages that import it?
- Is TypeScript configuration consistent?

### Debugging Commands

```bash
# Check what's in the Docker image
docker run --rm -it roastmypost-worker:test sh
ls -la /app/internal-packages/*/dist/

# Test specific package loading
docker run --rm roastmypost-worker:test \
  npx tsx -e "console.log(require('@roast/domain'))"

# Check tsx vs node behavior
docker run --rm roastmypost-worker:test \
  sh -c 'echo "tsx:" && npx tsx -e "console.log(1)" && echo "node:" && node -e "console.log(1)"'
```

## Future Considerations

### Potential Optimizations

1. **Multi-stage caching**: Cache pnpm store between builds
2. **Selective copying**: Only copy needed files in runner stage
3. **Build outside Docker**: Build in CI, copy artifacts
4. **Layer caching**: Optimize COPY order for better caching

### When to Revisit

Consider alternative approaches when:
- Docker images exceed 500MB
- Build times exceed 10 minutes
- Deploying to multiple environments with different requirements
- Package stabilization allows for publishing

## Summary

Our Docker build strategy prioritizes simplicity and developer experience over optimization. By building everything in Docker and leveraging `tsx` for TypeScript execution, we achieve a reliable, branch-friendly deployment process that supports rapid iteration on our pnpm workspace monorepo.

The key insight that `tsx` can execute TypeScript directly eliminates the need to build certain packages, simplifying our build process while maintaining full functionality.