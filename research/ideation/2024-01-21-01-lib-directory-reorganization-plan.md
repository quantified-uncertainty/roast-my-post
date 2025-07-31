# Comprehensive /src/lib Directory Reorganization Plan

## Executive Summary

The `/src/lib` directory currently contains 40+ files in a flat structure, making it difficult to navigate and maintain. This plan outlines a systematic approach to reorganize these files into a logical, hierarchical structure that improves discoverability, reduces duplication, and enhances maintainability.

## Current State Analysis

### File Count by Category
- **Authentication**: 6 files (auth.ts, auth-api.ts, auth-helpers.ts, auth-agent-helpers.ts, auth-wrapper.ts, document-auth.ts)
- **API/Middleware**: 6 files (api-middleware.ts, api-response-helpers.ts, security-middleware.ts, rate-limiter.ts, request-validation.ts, api/RouteUtils.ts)
- **Database**: 5 files (prisma.ts, db-queries.ts, evaluation-queries.ts, prisma-fragments.ts, prisma/evaluation-includes.ts)
- **Utilities**: 10+ files (utils.ts, batch-utils.ts, crypto.ts, constants.ts, fonts.ts, logger.ts, tokenUtils.ts, type-guards.ts, user-permissions.ts, dev-validators.ts)
- **Well-organized**: documentAnalysis/, claude/, helicone/, job/, urlValidator/, services/

### Key Problems
1. **Authentication sprawl**: 6 files with overlapping concerns
2. **Generic utils.ts**: Catch-all file with mixed concerns
3. **Scattered database logic**: Queries and includes in multiple locations
4. **No clear hierarchy**: Flat structure makes navigation difficult
5. **Inconsistent naming**: Mix of kebab-case and camelCase

## Detailed Reorganization Plan

### Phase 1: Authentication Consolidation (Week 1)

#### Step 1.1: Create Directory Structure
```bash
mkdir -p src/lib/auth/{permissions,__tests__}
```

#### Step 1.2: File Migration Plan
1. **Create src/lib/auth/index.ts**
   - Export main auth configuration from current auth.ts
   - Re-export commonly used functions for backwards compatibility

2. **Create src/lib/auth/config.ts**
   - Move NextAuth configuration from auth.ts
   - Keep auth providers and session configuration

3. **Create src/lib/auth/helpers.ts**
   - Merge auth-helpers.ts and auth-agent-helpers.ts
   - Consolidate getUserEmailSafe(), getAuth(), isAdmin()
   - Remove duplicate logic

4. **Create src/lib/auth/api.ts**
   - Move content from auth-api.ts
   - Include API route authentication utilities

5. **Create src/lib/auth/middleware.ts**
   - Move auth-wrapper.ts content
   - Include withAuth HOC and similar patterns

6. **Create src/lib/auth/permissions/document.ts**
   - Move document-auth.ts content
   - Add proper types and interfaces

7. **Create src/lib/auth/permissions/agent.ts**
   - Extract agent-specific auth logic from auth-agent-helpers.ts

8. **Create src/lib/auth/permissions/user.ts**
   - Move user-permissions.ts content
   - Consolidate role-based access logic

#### Step 1.3: Update Import Statements
```bash
# Find all files importing from old auth files
grep -r "from '@/lib/auth" src/
grep -r "from '@/lib/auth-" src/
grep -r "from '@/lib/document-auth" src/
grep -r "from '@/lib/user-permissions" src/

# Update imports systematically
# Old: import { getAuth } from '@/lib/auth-helpers'
# New: import { getAuth } from '@/lib/auth/helpers'
```

#### Step 1.4: Create Temporary Compatibility Layer
```typescript
// src/lib/auth.ts (temporary)
export * from './auth/config';
export * from './auth/helpers';
// Keep for 1 sprint, then remove
```

### Phase 2: API Utilities Unification (Week 1-2)

#### Step 2.1: Create Directory Structure
```bash
mkdir -p src/lib/api/{middleware,response,validation,__tests__}
```

#### Step 2.2: File Migration Plan
1. **Create src/lib/api/middleware/index.ts**
   - Export commonly used middleware

2. **Create src/lib/api/middleware/logging.ts**
   - Move api-middleware.ts content
   - Enhance with structured logging

3. **Create src/lib/api/middleware/security.ts**
   - Move security-middleware.ts content
   - Include CORS, headers, etc.

4. **Create src/lib/api/middleware/rate-limit.ts**
   - Move rate-limiter.ts content
   - Add configuration options

5. **Create src/lib/api/middleware/auth.ts**
   - Reference auth middleware from Phase 1
   - Create thin wrapper for API-specific needs

6. **Create src/lib/api/response/helpers.ts**
   - Move api-response-helpers.ts content
   - Standardize response formats

7. **Create src/lib/api/response/errors.ts**
   - Extract error response logic
   - Create consistent error format

8. **Create src/lib/api/validation/request.ts**
   - Move request-validation.ts content

9. **Create src/lib/api/validation/schemas.ts**
   - Common Zod schemas for API validation

10. **Create src/lib/api/utils.ts**
    - Move api/RouteUtils.ts content
    - General API utilities

### Phase 3: Database Layer Organization (Week 2)

#### Step 3.1: Create Directory Structure
```bash
mkdir -p src/lib/database/{queries,includes,types,__tests__}
```

#### Step 3.2: File Migration Plan
1. **Create src/lib/database/client.ts**
   - Move prisma.ts content
   - Keep singleton pattern

2. **Create src/lib/database/queries/index.ts**
   - Export all query modules

3. **Create src/lib/database/queries/common.ts**
   - Move db-queries.ts content
   - Generic query patterns

4. **Create src/lib/database/queries/evaluation.ts**
   - Move evaluation-queries.ts content
   - Evaluation-specific queries

5. **Create src/lib/database/queries/document.ts**
   - Extract document queries from various files

6. **Create src/lib/database/queries/agent.ts**
   - Extract agent queries from various files

7. **Create src/lib/database/includes/index.ts**
   - Move prisma-fragments.ts content
   - Merge with prisma/evaluation-includes.ts

8. **Create src/lib/database/types.ts**
   - Database-specific type definitions
   - Prisma type extensions

### Phase 4: Core Utilities Structure (Week 2-3)

#### Step 4.1: Create Directory Structure
```bash
mkdir -p src/lib/core/{config,crypto,logging,utils,validation,__tests__}
```

#### Step 4.2: File Migration Plan
1. **Create src/lib/core/config/constants.ts**
   - Move constants.ts content
   - Organize by feature area

2. **Create src/lib/core/config/fonts.ts**
   - Move fonts.ts content

3. **Create src/lib/core/crypto/index.ts**
   - Move crypto.ts content
   - Add tests for crypto functions

4. **Create src/lib/core/logging/index.ts**
   - Move logger.ts content
   - Keep winston configuration

5. **Create src/lib/core/utils/batch.ts**
   - Move batch-utils.ts content

6. **Create src/lib/core/utils/tokens.ts**
   - Move tokenUtils.ts content

7. **Create src/lib/core/utils/types.ts**
   - Move type-guards.ts content

8. **Create src/lib/core/utils/common.ts**
   - Move generic utilities from utils.ts
   - Break up by concern

9. **Create src/lib/core/validation/dev.ts**
   - Move dev-validators.ts content

### Phase 5: Test Consolidation (Week 3)

#### Step 5.1: Identify Test Files
```bash
# Find all test files in lib root
find src/lib -maxdepth 1 -name "*.test.ts" -o -name "*.test.tsx"
```

#### Step 5.2: Migration Plan
1. Move `articleImport.*.test.ts` → `src/lib/services/article/__tests__/`
2. Move auth test files → `src/lib/auth/__tests__/`
3. Move API test files → `src/lib/api/__tests__/`
4. Create `src/lib/__tests__/integration/` for cross-module tests

### Phase 6: Service Layer Enhancement (Week 3-4)

#### Step 6.1: Create Directory Structure
```bash
mkdir -p src/lib/services/{document,evaluation,article}/__tests__
```

#### Step 6.2: Migration Plan
1. **Organize src/lib/services/document/**
   - Move documentImport logic
   - Add document-related services

2. **Create src/lib/services/evaluation/**
   - Extract evaluation creation logic
   - Move export functionality
   - Add formatting utilities

3. **Create src/lib/services/article/**
   - Consolidate article import logic
   - Add platform-specific importers

## Implementation Strategy

### Week-by-Week Breakdown

#### Week 1: High-Impact Changes
- **Monday-Tuesday**: Phase 1 (Authentication)
  - Create auth directory structure
  - Migrate files with tests
  - Update 20-30 import statements
- **Wednesday-Thursday**: Phase 2 Part 1 (API Middleware)
  - Create api directory structure
  - Migrate middleware files
- **Friday**: Testing and compatibility fixes

#### Week 2: Core Infrastructure
- **Monday-Tuesday**: Phase 2 Part 2 (API Response/Validation)
  - Complete API reorganization
- **Wednesday-Thursday**: Phase 3 (Database)
  - Organize database queries and includes
- **Friday**: Phase 4 Part 1 (Core Utils Setup)

#### Week 3: Utilities and Tests
- **Monday-Tuesday**: Phase 4 Part 2 (Complete Core Utils)
  - Break up utils.ts
  - Organize utility functions
- **Wednesday-Thursday**: Phase 5 (Test Consolidation)
  - Move all scattered tests
- **Friday**: Integration testing

#### Week 4: Service Layer and Cleanup
- **Monday-Tuesday**: Phase 6 (Service Enhancement)
- **Wednesday-Thursday**: Remove compatibility layers
- **Friday**: Documentation and final cleanup

### Git Strategy

#### Commit Message Format
```
refactor(lib): [Phase X] <description>

- Moved X files to Y directory
- Updated Z import statements
- No functional changes
```

#### Branch Strategy
```bash
# Create feature branch
git checkout -b refactor/lib-reorganization

# Create phase-specific branches
git checkout -b refactor/lib-phase-1-auth
git checkout -b refactor/lib-phase-2-api
# ... etc

# Merge to main branch after each phase
```

### Testing Strategy

#### After Each File Move
1. Run TypeScript compilation: `npm run typecheck`
2. Run linting: `npm run lint`
3. Run affected tests: `npm run test:fast`
4. Check for circular dependencies

#### End of Each Phase
1. Full test suite: `npm run test:without-llms`
2. Build verification: `npm run build`
3. Manual smoke test of key features

### Rollback Plan

#### Phase-Level Rollback
- Each phase is atomic and can be reverted
- Keep compatibility layers for 1 sprint
- Document all import changes

#### File-Level Rollback
```bash
# If a specific move causes issues
git checkout HEAD~1 -- src/lib/problem-file.ts
# Fix imports and try different approach
```

## Success Metrics

### Quantitative
1. **Reduced file count at root**: From 40+ to <10
2. **Import statement clarity**: No more than 2 levels deep
3. **Test organization**: 100% of tests co-located with code
4. **No circular dependencies**: Verified by madge or similar tool

### Qualitative
1. **Developer feedback**: Easier to find functionality
2. **Onboarding time**: Reduced time to understand structure
3. **Code review efficiency**: Clearer ownership and boundaries
4. **Feature development**: Obvious locations for new code

## Risk Mitigation

### High-Risk Areas
1. **Authentication changes**: Could break login
   - Mitigation: Extensive testing, gradual rollout
2. **Database client**: Could affect all queries
   - Mitigation: Keep prisma.ts as re-export initially
3. **API middleware**: Could break all API routes
   - Mitigation: Test each route after changes

### Contingency Plans
1. **Import errors**: Keep old files as re-exports
2. **Runtime errors**: Feature flags for gradual migration
3. **Performance issues**: Profile before/after each phase

## Post-Reorganization Tasks

### Documentation Updates
1. Update README with new structure
2. Create architecture diagram
3. Update CLAUDE.md with new patterns
4. Add module-level README files

### Developer Communication
1. Team announcement before starting
2. Daily updates during migration
3. Migration guide for pending PRs
4. Brown bag session on new structure

### Tooling Updates
1. Update path aliases in tsconfig.json
2. Update ESLint import rules
3. Configure module boundaries
4. Update IDE snippets/templates

## Long-Term Maintenance

### Governance Rules
1. **No files at lib root**: Everything must be in a subdirectory
2. **No generic utils**: Utilities must have specific purposes
3. **Co-locate tests**: Tests live with the code they test
4. **Index exports**: Each directory has index.ts with public API
5. **Documentation requirement**: New modules need README

### Review Checklist
- [ ] File in correct directory?
- [ ] Imports follow new structure?
- [ ] Tests co-located?
- [ ] No circular dependencies?
- [ ] Documentation updated?

This plan transforms the chaotic `/src/lib` into a well-organized, maintainable structure that will serve the project well as it grows.