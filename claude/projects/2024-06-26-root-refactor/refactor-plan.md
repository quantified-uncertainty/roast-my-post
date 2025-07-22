# Root Directory Refactor Plan

## Overview
This plan addresses the messy root directory structure by organizing files into logical locations while maintaining project functionality.

## Current State Analysis

### Root Directory Issues
1. **Scattered Docker Documentation**
   - `DOCKER_CI_CD.md`
   - `DOCKER_COMPOSE_GUIDE.md`
   - `DOCKER_PRODUCTION_NOTES.md`
   - `FIX_STATIC_GENERATION.md` (Docker-specific fix)
   - `PRODUCTION_DEPLOYMENT_CHECKLIST.md`

2. **Mixed Configuration Files**
   - Build configs: `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`
   - Test configs: `jest.config.cjs`, `jest.config-old.js`, `playwright.config.ts`
   - Lint configs: `.eslintrc.json`, `.eslintrc.import-order.json`
   - Docker configs: `docker-compose.yml`, `docker-compose.override.yml`

3. **Documentation Organization**
   - `/docs/` - Well-organized project documentation
   - `/claude/` - Claude Code workspace (analysis, ideation, scripts)
   - Root - Scattered operational docs
   - `CLAUDE.md` - Critical incidents & learnings

## Proposed Structure

### Phase 1: Documentation Consolidation

Move Docker-related documentation to organized structure:
```
/docs/
├── deployment/
│   ├── docker/
│   │   ├── README.md (overview + quick start from DOCKER_COMPOSE_GUIDE.md)
│   │   ├── ci-cd.md (from DOCKER_CI_CD.md)
│   │   ├── production.md (from DOCKER_PRODUCTION_NOTES.md)
│   │   └── troubleshooting.md (from FIX_STATIC_GENERATION.md)
│   ├── checklist.md (from PRODUCTION_DEPLOYMENT_CHECKLIST.md)
│   ├── index-migration-summary.md (existing)
│   └── production-launch.md (existing)
```

### Phase 2: Configuration Organization

Create a `/config/` directory for non-critical configs:
```
/config/
├── jest/
│   └── jest.config.cjs
├── eslint/
│   ├── .eslintrc.json
│   └── .eslintrc.import-order.json
└── docker/
    └── docker-compose.override.yml
```

Keep in root (required by tools):
- `next.config.ts` (Next.js requirement)
- `tsconfig.json` (TypeScript requirement)
- `tailwind.config.ts` (Tailwind requirement)
- `postcss.config.mjs` (PostCSS requirement)
- `playwright.config.ts` (Playwright requirement)
- `docker-compose.yml` (Docker convention)
- `package.json`, `package-lock.json` (npm requirement)
- `.env.example` (convention)
- `Dockerfile` (Docker requirement)

### Phase 3: Claude Documentation System

Current `/claude/` structure is well-organized and should remain as-is:
- Serves as Claude Code's operational workspace
- Contains analysis, ideation, and project-specific documentation
- Uses dated naming convention for tracking progress
- Separates Claude's work from main project docs

Recommendation: Keep `CLAUDE.md` in root as it contains critical development notes that need high visibility.

## Implementation Steps

### Step 1: Create New Directories
```bash
mkdir -p docs/deployment/docker
mkdir -p config/jest config/eslint config/docker
```

### Step 2: Move Documentation Files
```bash
# Move Docker docs
mv DOCKER_CI_CD.md docs/deployment/docker/ci-cd.md
mv DOCKER_COMPOSE_GUIDE.md docs/deployment/docker/README.md
mv DOCKER_PRODUCTION_NOTES.md docs/deployment/docker/production.md
mv FIX_STATIC_GENERATION.md docs/deployment/docker/troubleshooting.md
mv PRODUCTION_DEPLOYMENT_CHECKLIST.md docs/deployment/checklist.md
```

### Step 3: Move Configuration Files
```bash
# Move non-critical configs
mv jest.config.cjs config/jest/
mv .eslintrc.json config/eslint/
mv .eslintrc.import-order.json config/eslint/
mv docker-compose.override.yml config/docker/
```

### Step 4: Update References
- Update `package.json` scripts to reference new config locations
- Update Docker documentation to reference new paths
- Update CI/CD workflows if they reference moved files
- Update any import statements in code

### Step 5: Update Documentation Index
- Update `/docs/README.md` with new structure
- Add navigation links to moved documents
- Update any cross-references in existing docs

## Benefits

1. **Cleaner Root Directory** - Only essential files remain in root
2. **Better Organization** - Related files grouped together
3. **Easier Navigation** - Clear structure for different concerns
4. **Maintains Conventions** - Respects tool requirements for config locations
5. **Preserves Claude Workspace** - `/claude/` remains dedicated operational space

## Rollback Plan

If issues arise:
1. Git revert the commit(s) that moved files
2. Manually move files back if needed
3. Update any changed references

## Notes

- The `/claude/` directory structure is well-designed and should not be changed
- `CLAUDE.md` should remain in root for visibility of critical incidents
- Some config files must stay in root due to tool requirements
- Test all build/lint/test commands after moving configs