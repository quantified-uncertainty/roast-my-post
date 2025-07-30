# Staged Monorepo Migration Plan

## Overview
A gradual approach to migrating roast-my-post to a monorepo structure, starting with just the `/apps` directory.

## Stage 1: Basic Apps Structure (Current Focus)

### Goals
- Move the main Next.js app to `apps/web`
- Keep everything else at root level initially
- Minimal disruption to existing workflows

### Directory Structure
```
roast-my-post/
├── apps/
│   └── web/              # Main Next.js application
├── mcp-server/          # Keep at root for now
├── evaluations/         # Keep at root for now
├── scripts/             # Keep at root for now
└── [other files]        # All other files stay at root
```

### Tasks
1. Create `apps/web` directory
2. Move Next.js specific files to `apps/web`:
   - src/
   - public/
   - app-specific config files (next.config.ts, tailwind.config.ts, etc.)
3. Create `apps/web/package.json` with Next.js dependencies
4. Update pnpm-workspace.yaml to only include `apps/*`
5. Update root package.json scripts to use workspace commands
6. Test that everything still works

## Stage 2: Extract Worker (Future)
- Move job processing to `apps/worker`
- Keep using same database/prisma setup

## Stage 3: Move MCP Server (Future)
- Move `mcp-server` to `apps/mcp-server`
- Update Claude configuration paths

## Stage 4: Create Packages (Future)
- Only when we have actual shared code
- Start with `packages/db` for Prisma
- Then `packages/shared` for common utilities

## Stage 5: Internal Packages (Future)
- Only if needed
- Config packages, etc.

## Why This Approach?
1. **Minimal Risk**: Only moving one thing at a time
2. **Quick Wins**: Get monorepo benefits for the main app immediately
3. **Learn as We Go**: Understand what we actually need before creating it
4. **Easy Rollback**: Each stage is independently revertible

## Next Steps for Stage 1
Ready to proceed with moving the Next.js app to `apps/web`?