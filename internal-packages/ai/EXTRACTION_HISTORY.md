# AI Package Extraction History

## Overview
This document tracks the extraction of core AI utilities from the web application into a dedicated `@roast/ai` package, implementing Phase 1 of the AI package extraction plan.

## What Was Done

### 1. Package Creation
- Created `internal-packages/ai/` directory structure
- Set up package.json with appropriate dependencies
- Configured TypeScript with proper references to other packages
- Added ESLint configuration compatible with the monorepo

### 2. Code Migration
Moved the following modules from `apps/web/src/lib/` to `internal-packages/ai/src/`:

#### Claude Integration (`/claude/`)
- `wrapper.ts` - Core Claude API wrapper with retry logic
- `testUtils.ts` - Testing utilities for mocking Claude responses
- `mockHelpers.ts` - Helper functions for test mocks
- `wrapper.test.ts` - Unit tests
- `wrapper.integration.test.ts` - Integration tests
- `__mocks__/wrapper.ts` - Jest mock implementation

#### Helicone Integration (`/helicone/`)
- `api-client.ts` - Helicone REST API client
- `costFetcher.ts` - Cost tracking and fetching utilities
- `sessionContext.ts` - Global session context management
- `sessions.ts` - Session configuration and management

#### Utilities (`/utils/`)
- `tokenUtils.ts` - Token counting and estimation
- `anthropic.ts` - Anthropic client factory (newly created)
- `logger.ts` - Simple logging wrapper (newly created)
- `retryUtils.ts` - Retry logic with exponential backoff (newly created)

### 3. Import Updates
Updated approximately 45 files across the codebase to use `@roast/ai` imports instead of local paths:
- All tool implementations in `/tools/`
- Document analysis modules
- Plugin system components
- Test files

### 4. Dependency Management
- Aligned Anthropic SDK version (0.54.0) across packages
- Set up proper peer dependencies for `@roast/db`
- Fixed ESLint version compatibility issues

## Current Status

### ✅ Completed
- Package structure and configuration
- Code migration and organization
- Import path updates across codebase
- TypeScript compilation passes
- Linting passes (with warnings)
- Most tests pass (529/576)

### ⚠️ Known Issues
1. **Test Failures**: 47 tests failing due to mock setup issues
   - Missing sessionContext in some mocks
   - API key requirements in test environment
   - These issues existed before refactoring

2. **Linting Warnings**: ~20 warnings about:
   - Unused variables
   - Any types
   - These are non-critical and can be addressed later

## Benefits Achieved

1. **Code Reusability**: MCP server and future workers can now use the same AI utilities
2. **Consistency**: Single source of truth for AI interactions
3. **Maintainability**: Centralized version management and updates
4. **Modularity**: Clear separation of concerns
5. **Foundation**: Ready for Phase 2 (analysis tools extraction)

## Technical Decisions

### Why These Components?
- **Claude Wrapper**: Core AI interaction layer used everywhere
- **Helicone**: Cost tracking needed across all AI operations
- **Token Utils**: Essential for all LLM interactions
- **Test Utils**: Needed for consistent testing across packages

### Package Structure
```
@roast/ai/
├── src/
│   ├── claude/          # Main AI interaction layer
│   ├── helicone/        # Cost and session tracking
│   ├── utils/           # Shared utilities
│   ├── types.ts         # Shared TypeScript types
│   └── index.ts         # Public API exports
├── package.json
├── tsconfig.json
├── .eslintrc.json
└── README.md
```

### Export Strategy
- Re-export all public APIs through index.ts
- Export both named exports and specific instances (e.g., sessionContext)
- Maintain backward compatibility with existing code

## Next Steps (Phase 2)

### 1. Fix Remaining Test Issues
- Add proper mocks for sessionContext in all test files
- Create test-specific configuration for API keys
- Consider creating a test utilities package

### 2. Extract Analysis Tools Package
Target components for `@roast/analyzers`:
- `/lib/analysis-plugins/` - Plugin architecture (~30 files)
- `/lib/documentAnalysis/` - Document analysis engine (~50 files)
- `/tools/` - Individual analysis tools (~170 files)

### 3. Improve Package Infrastructure
- Add build scripts for production builds
- Set up proper versioning strategy
- Add CI/CD for package publishing
- Create migration guide for external users

### 4. Documentation Improvements
- API documentation with examples
- Migration guide from old imports
- Best practices for using the package
- Troubleshooting guide

## Lessons Learned

1. **Mock Complexity**: Jest mocks need careful handling when extracting to packages
2. **Circular Dependencies**: Need to be careful about package dependencies
3. **Test Environment**: Test configuration needs to be portable across packages
4. **Version Alignment**: Critical to keep dependency versions synchronized

## Future Considerations

### Phase 3: Public NPM Package
Once internal usage is stable, consider:
- Creating a public `@roastmypost/sdk` package
- Removing internal dependencies
- Adding comprehensive documentation
- Setting up automated releases

### Performance Optimizations
- Consider lazy loading for large components
- Add caching for frequently used operations
- Optimize bundle size for external usage

### Enhanced Features
- Add streaming support for Claude responses
- Implement request queuing and rate limiting
- Add more sophisticated retry strategies
- Create higher-level abstractions for common patterns

## Commands for Development

```bash
# Run type checking
pnpm --filter @roast/ai run typecheck

# Run linting
pnpm --filter @roast/ai run lint

# Run tests (when test setup is fixed)
pnpm --filter @roast/ai run test

# Check entire monorepo
npm run check
```

## References

- [Original NPM Library Extraction Plan](/research/ideation/2024-01-03-npm-library-extraction/)
- [Monorepo Migration Notes](/dev/docs/deployment/monorepo-migration-checklist.md)
- [PR #123](https://github.com/quantified-uncertainty/roast-my-post/pull/123)