# Monorepo Migration Completion Plan

**Created**: 2025-07-30  
**Status**: Migration 70% Complete  
**Goal**: Complete monorepo migration to production-ready state

## Executive Summary

The monorepo migration has successfully established the core infrastructure but requires critical fixes and strategic package extractions to be production-ready. Current state: functional but with blocking CI/CD issues and missed optimization opportunities.

## Current Status: 70% Complete ✅

### ✅ Completed (Foundation)
- **Monorepo Infrastructure**: pnpm workspaces, Turbo configuration
- **Directory Structure**: Clean apps/ and internal-packages/ separation  
- **Database Package**: `@roast/db` extracted and working
- **Web App Migration**: Complete move to `apps/web/` with proper dependencies
- **MCP Server Migration**: Moved to `apps/mcp-server/` with workspace references
- **Directory Semantics**: Renamed `/tools/` → `/dev/`, `/tools/analysis/` → `/research/`
- **Docker Updates**: ✅ Updated for monorepo structure
- **CI/CD Updates**: ✅ Updated to use pnpm and proper workspace commands

### 🚧 Partially Complete (Needs Fixes)
- **Package Naming**: Inconsistent naming across packages
- **Test Infrastructure**: Missing test scripts in individual packages
- **Build System**: Some Turbo tasks don't exist in packages

### ❌ Not Started (High Value)
- **Shared Package Extraction**: AI utilities, analysis tools, UI components
- **Worker Service**: Background job processor extraction  
- **Configuration Package**: Shared configs not implemented

## Critical Issues (Blocking) 🚨

### Issue #1: Missing Test Scripts in Web Package
**Impact**: CI/CD pipeline references non-existent test tasks  
**Status**: ✅ **ALREADY FIXED**

**Problem**: ✅ **NO ISSUE FOUND**
```bash
# Root package.json references these tasks: ✅
"test:ci": "turbo run test:ci"
"test:without-llms": "turbo run test:without-llms"

# apps/web/package.json already has all required scripts: ✅
"test:ci": "npm run test:unit"
"test:without-llms": "jest --config ./config/jest/jest.config.cjs --testPathIgnorePatterns='\\.llm\\.test\\.'"
"test:without-external": "jest --config ./config/jest/jest.config.cjs --testPathIgnorePatterns='\\.(e2e|llm)\\.test\\.'"
```

**Solution**: ✅ No action needed - scripts already exist

### Issue #2: Package Naming Inconsistency  
**Impact**: Confusing workspace references, poor DX
**Status**: ✅ **FIXED**

**Problem**: ✅ **FIXED**
```json
// Now consistent naming:
"@roast/web" ✅
"@roast/db" ✅  
"@roast/mcp-server" ✅ // Fixed!
```

**Solution**: ✅ Renamed MCP server package to `@roast/mcp-server`

## High-Value Opportunities 🚀

### Opportunity #1: Extract `@roast/ai` Package
**Value**: Shared AI utilities across all services  
**Status**: ❌ Not started  
**Effort**: Medium (2-3 days)

**What to Extract**:
```
apps/web/src/lib/claude/ → internal-packages/ai/src/claude/
apps/web/src/lib/helicone/ → internal-packages/ai/src/helicone/  
apps/web/src/lib/tokenUtils.ts → internal-packages/ai/src/utils/
```

**Benefits**:
- MCP server can use Claude wrapper
- Future worker service can reuse AI utilities
- Centralized LLM error handling
- Cost tracking consolidation

### Opportunity #2: Extract Analysis Tools Package
**Value**: Reusable document analysis system  
**Status**: ❌ Not started  
**Effort**: Large (1-2 weeks)

**What to Extract**:
```
apps/web/src/lib/analysis-plugins/ → internal-packages/analyzers/src/plugins/
apps/web/src/tools/ → internal-packages/analyzers/src/tools/
```

**Files**: 170+ files including:
- Math checking tools
- Spelling/grammar analysis  
- Fact checking
- Forecasting analysis
- Plugin architecture

**Benefits**:
- Reusable across multiple apps
- Independent versioning
- Cleaner app structure
- Enable analysis-as-a-service

### Opportunity #3: UI Components Package
**Value**: Shared UI across future apps  
**Status**: ❌ Not started  
**Effort**: Medium (3-5 days)

**What to Extract**:
```
apps/web/src/components/ → packages/ui/src/
// Shared components like:
// - Button, FormField  
// - DocumentSearch
// - JobStatusIndicator
// - MarkdownRenderer
```

## Completion Roadmap

### Phase 1: Fix Critical Issues (Week 1) 🚨
**Goal**: Unblock development

- [ ] **Day 1**: Add missing test scripts to `apps/web/package.json`
- [ ] **Day 2**: Fix MCP server package naming  
- [ ] **Day 3**: Test full CI/CD pipeline end-to-end
- [ ] **Day 4**: Verify all Turbo tasks work properly
- [ ] **Day 5**: Update documentation with new structure

**Success Criteria**: CI/CD pipeline runs successfully, all tests pass

### Phase 2: Extract High-Value Packages (Week 2-3) 🚀  
**Goal**: Maximize code reuse

- [ ] **Week 2**: Extract `@roast/ai` package
  - [ ] Create package structure
  - [ ] Move Claude wrapper and Helicone utilities
  - [ ] Update imports across codebase
  - [ ] Test MCP server integration
  
- [ ] **Week 3**: Extract analysis tools (if prioritized)
  - [ ] Create `@roast/analyzers` package
  - [ ] Move plugins and tools
  - [ ] Update web app imports
  - [ ] Test all analysis functionality

### Phase 3: Complete Infrastructure (Week 4) 📋
**Goal**: Production-ready monorepo

- [ ] **Shared Configs**: Implement `internal-packages/configs/`
- [ ] **Worker Service Planning**: Plan extraction of job processing
- [ ] **Performance Testing**: Verify build times and caching
- [ ] **Documentation**: Complete migration documentation

## Package Architecture (Target State)

```
apps/
├── web/                    # Next.js application
├── mcp-server/            # Model Context Protocol server  
└── worker/                # Background job processor (future)

internal-packages/
├── db/                    # ✅ Database package (complete)
├── ai/                    # 🚀 AI utilities (high value)
├── analyzers/             # 🚀 Analysis tools (high value)  
├── configs/               # 📋 Shared configurations
└── ui/                    # 💎 UI components (future)

packages/ (public packages)
└── sdk/                   # 🔮 Public SDK (future)
```

## Success Metrics

### Technical Metrics
- **Build Performance**: <5min full build time
- **Test Performance**: <2min test suite  
- **Package Isolation**: No circular dependencies
- **Type Safety**: 100% TypeScript coverage

### Developer Experience  
- **Clear Package Boundaries**: Each package has single responsibility
- **Easy Local Development**: Simple setup and hot reload
- **Good Documentation**: Clear README for each package
- **Consistent Tooling**: Unified linting, formatting, testing

## Risk Assessment

### High Risk 🔴
- **Analysis Tools Extraction**: Large codebase, many dependencies
- **Type System Complexity**: Shared types across packages

### Medium Risk 🟡  
- **AI Package Extraction**: Some circular imports possible
- **Build System Changes**: Turbo task dependencies

### Low Risk 🟢
- **Test Script Addition**: Straightforward configuration
- **Package Renaming**: Simple find/replace operation

## Next Actions

**Immediate (This Week)**:
1. Fix missing test scripts → Unblock CI/CD
2. Rename MCP server package → Improve consistency
3. Test full pipeline → Verify everything works

**High Impact (Next 2 Weeks)**:
1. Extract AI package → Enable code reuse
2. Plan worker service → Complete apps structure

**Which issue would you like me to tackle first?**