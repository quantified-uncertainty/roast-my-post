# Monorepo Migration Plan - Following Squiggle Patterns

## Overview
This document outlines the migration plan to restructure roast-my-post into a formal monorepo following the patterns used by Squiggle.

## Directory Structure

```
roast-my-post/
├── apps/
│   ├── web/                 # Main Next.js application
│   ├── worker/              # Background job processor
│   └── evaluation-server/   # Python evaluation service
├── packages/
│   ├── @roast/ui/          # Shared UI components (if extracted)
│   └── @roast/agent-sdk/   # SDK for agent development
└── internal-packages/
    ├── @roast/configs/     # Shared configs (TypeScript, ESLint, Prettier)
    ├── @roast/db/          # Prisma client and schemas
    └── @roast/ai/          # AI/LLM utilities and wrappers
```

## Key Changes from Squiggle Patterns

### 1. Package Manager and Build Tool
- **Tool**: pnpm + Turbo (same as Squiggle)
- **Workspace Config**: `pnpm-workspace.yaml` with three-tier structure
- **Build Orchestration**: `turbo.json` for task dependencies and caching

### 2. Shared Configuration Pattern
Following Squiggle's approach:
- `@roast/configs` package for shared TypeScript, ESLint, and Prettier configs
- Base `tsconfig.json` that other packages extend
- Centralized dependency versions

### 3. Internal Packages
- `@roast/db`: Centralized Prisma client (prevents multiple generated clients)
- `@roast/ai`: Shared AI utilities (Claude wrapper, Helicone integration)
- `@roast/configs`: Build and lint configurations

### 4. Application Separation
- `apps/web`: Next.js app with all current frontend/API code
- `apps/worker`: Extracted job processing service
- `apps/evaluation-server`: New Python-based evaluation service

## Migration Steps

### Phase 1: Infrastructure Setup ✅
- [x] Create `pnpm-workspace.yaml`
- [x] Create `turbo.json` with task definitions
- [x] Create directory structure
- [x] Set up `@roast/configs` package

### Phase 2: Move Web Application
1. Create `apps/web/package.json` with Next.js dependencies
2. Move all Next.js code to `apps/web/`
3. Update import paths
4. Test build and dev processes

### Phase 3: Extract Shared Code
1. Create `@roast/db` package:
   - Move Prisma schema
   - Generate client in package
   - Export typed client
   
2. Create `@roast/ai` package:
   - Move Claude wrapper
   - Move Helicone utilities
   - Move LLM-related types

### Phase 4: Extract Worker Service
1. Create `apps/worker/` with separate package.json
2. Move job processing scripts
3. Create proper TypeScript build setup
4. Update deployment configs

### Phase 5: Add Evaluation Server
1. Create `apps/evaluation-server/`
2. Set up Python package structure
3. Define API interface
4. Integrate with main application

## Benefits

1. **Clear Boundaries**: Each service has its own package with explicit dependencies
2. **Shared Code**: No duplication of database schemas, AI utilities, or configs
3. **Independent Development**: Can work on services without affecting others
4. **Better Caching**: Turbo caches builds and tests per package
5. **Type Safety**: Shared TypeScript types across all packages
6. **Deployment Flexibility**: Can deploy services independently

## Scripts Migration

Root `package.json` scripts will use Turbo:
```json
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint"
  }
}
```

Package-specific scripts remain in their respective `package.json` files.

## Environment Variables

Following Squiggle's pattern:
- Define global env vars in `turbo.json`
- Each app can have its own `.env` file
- Shared env vars at root level

## CI/CD Updates

Update GitHub Actions to:
- Use pnpm for installation
- Leverage Turbo's remote caching
- Run only affected tests/builds