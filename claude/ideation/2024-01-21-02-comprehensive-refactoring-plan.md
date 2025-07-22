# Roast My Post - Comprehensive Refactoring Plan

## Executive Summary

This document outlines a staged approach to refactoring the Roast My Post codebase based on a deep analysis of code structure, dependencies, and technical debt. The plan is organized into 5 progressive stages, each building upon the previous one.

## Stage 1: Quick Wins & Cleanup (1-2 weeks)

### 1.1 Remove Dead Code
- [ ] Delete unused components:
  - `/src/components/AgentCheckboxList.tsx`
  - `/src/components/AgentRatings.tsx`
  - `/src/components/AuthHeader.tsx`
  - `/src/components/SignupForm.tsx`
- [ ] Remove unused API routes:
  - `/api/validate-key`
  - `/api/auth/signup-complete`
  - `/api/users`
- [ ] Clean up empty files:
  - `/src/components/DocumentWithEvaluations/hooks/index.ts` (0 lines)
  - `/src/components/AgentDetail.tsx` (1 line - just re-export)
  - `/src/jest-dom.d.ts` (1 line)
  - `/src/utils/ui/constants.ts` (1 line)

### 1.2 Fix Dependencies
- [ ] Remove unused npm packages:
  ```bash
  npm uninstall nodemailer puppeteer uuid metascraper metascraper-author metascraper-date metascraper-description metascraper-image metascraper-logo metascraper-publisher metascraper-title metascraper-url ignore-loader
  ```
- [ ] Move misplaced dependencies to devDependencies:
  ```bash
  npm uninstall ts-node tsconfig-paths @types/chroma-js @types/iarna__toml @types/lodash
  npm install --save-dev ts-node tsconfig-paths @types/chroma-js @types/iarna__toml @types/lodash
  ```

### 1.3 Remove Console.logs
- [ ] Replace 30+ console.log statements with proper logging
- [ ] Set up ESLint rule to prevent future console.logs

## Stage 2: Code Consolidation (2-3 weeks)

### 2.1 Unify Formatting Utilities
Create `/src/lib/formatters/` with:
- [ ] `dateFormatters.ts` - Consolidate 3 different formatDate implementations:
  - `/src/lib/evaluation/evaluationFormatters.ts` (line 14)
  - `/src/lib/job/formatters.ts` (line 22)
  - `/src/components/AgentDetail/utils.ts` (line 9)
- [ ] `costFormatters.ts` - Standardize cost formatting (decide on decimal places):
  - `/src/lib/evaluation/evaluationFormatters.ts` - 3 decimal places
  - `/src/lib/job/formatters.ts` - 4 decimal places
  - `/src/utils/costCalculator.ts` - 2 decimal places
  - `/src/components/AgentDetail/utils.ts` - 3 decimal places
- [ ] `durationFormatters.ts` - Merge duration formatting functions
- [ ] `statusFormatters.ts` - Unify status badge/icon logic

### 2.2 Break Up Large Files
Priority targets:
- [ ] `Document.ts` (1003 lines) → Split into:
  - `Document.model.ts` - Core model
  - `Document.queries.ts` - Database queries
  - `Document.helpers.ts` - Helper functions
- [ ] `articleImport.ts` (913 lines) → Split by platform:
  - `importers/lesswrong.ts`
  - `importers/eaforum.ts`
  - `importers/generic.ts`
- [ ] `SlateEditor.tsx` (815 lines) → Extract:
  - Custom hooks
  - Utility functions
  - Sub-components
- [ ] `Job.ts` (664 lines) → Split model and processing logic
- [ ] `help/api/page.tsx` (640 lines) → Split into sections
- [ ] `agents/new/page.tsx` (632 lines) → Extract form components
- [ ] `process-jobs-adaptive.ts` (621 lines) → Modularize job processing

### 2.3 Consolidate Test Utilities
- [ ] Create `/src/test-utils/` directory
- [ ] Merge duplicate test helper functions
- [ ] Standardize mock data creation

## Stage 3: Type Safety Improvements (3-4 weeks)

### 3.1 Replace `any` Types
Priority files with most `any` usage:
- [ ] `/src/lib/auth-wrapper.ts` - Add proper types for auth context
- [ ] `/src/lib/api/RouteUtils.ts` - Type-safe route handlers
- [ ] `/src/components/SlateEditor.tsx` - Proper event handler types
- [ ] `/src/components/CodeBlock.tsx` - Type component props

### 3.2 Fix TypeScript Suppressions
- [ ] Address @ts-ignore comments in:
  - `/src/lib/auth.ts` - Role property on session
  - `/src/app/docs/[docId]/page.tsx` - markdown-truncate types
  - `/src/utils/ui/commentPositioning.ts` - markdown-truncate types
  - `/src/components/SlateEditor.tsx` - remarkToSlate compatibility
- [ ] Add type definitions for `markdown-truncate` package

### 3.3 Review Non-null Assertions
- [ ] Audit 30+ uses of `!` operator
- [ ] Add proper null checks or error handling
- [ ] Use optional chaining where appropriate

### 3.4 Address TODOs
- [ ] `/src/lib/auth-wrapper.ts` - TODO: admin check implementation
- [ ] `/src/lib/user-permissions.ts` - TODO: proper permission system
- [ ] `/src/lib/logger.ts` - TODO: monitoring service integration
- [ ] `/src/lib/documentAnalysis/plugin-system/PluginManager.ts` - TODO: configurable plugin selection

## Stage 4: Architecture Improvements (4-6 weeks)

### 4.1 Reorganize `/src/lib` Directory
Current structure has mixed concerns. Proposed new structure:
```
src/lib/
├── auth/          # All auth-related files
├── api/           # API utilities and middleware
├── database/      # Prisma, queries, fragments
├── document/      # Document processing and analysis
├── evaluation/    # Evaluation-specific logic
├── security/      # Rate limiting, validation, middleware
├── integrations/  # Claude, Helicone, external services
└── shared/        # True shared utilities
```

### 4.2 Flatten Document Analysis Structure
- [ ] Reduce 6+ levels of nesting in documentAnalysis
- [ ] Consolidate plugin system architecture
- [ ] Add README files for complex modules

### 4.3 Component Testing Strategy
- [ ] Add tests for critical components (SlateEditor, DocumentWithEvaluations)
- [ ] Set up component testing infrastructure
- [ ] Target 50% coverage for components directory (currently 1%)

### 4.4 Potentially Remove Experiments Feature
- [ ] Investigate `/src/components/experiments/` folder usage:
  - `AgentConfigForm.tsx`
  - `DocumentSelection.tsx`
  - `ExperimentSettings.tsx`
- [ ] These components are not imported anywhere but routes exist

## Stage 5: Performance & Monitoring (2-3 weeks)

### 5.1 Add Proper Logging
- [ ] Implement structured logging with levels
- [ ] Integrate with monitoring service (as noted in TODO)
- [ ] Remove remaining console.logs

### 5.2 Error Handling Improvements
- [ ] Standardize error handling patterns
- [ ] Add error boundaries for critical UI sections
- [ ] Implement proper error recovery in API routes

### 5.3 Performance Optimizations
- [ ] Analyze bundle size after dependency cleanup
- [ ] Implement code splitting for large components
- [ ] Optimize database queries in large model files

## Metrics for Success

### Code Quality Metrics
- Reduce files >500 lines from 7 to 0
- Eliminate all `any` types (currently 50+)
- Remove all `@ts-ignore` comments (currently 5)
- Achieve 50% test coverage for components (currently 1%)

### Maintenance Metrics
- Reduce duplicate code instances by 80%
- Consolidate formatting functions from 12 to 4
- Reduce npm dependencies by 15+ packages

### Developer Experience
- Clearer module boundaries
- Consistent code patterns
- Better type safety
- Easier onboarding for new developers

## Implementation Notes

1. **Parallel Work**: Many tasks can be done in parallel by different team members
2. **Incremental Approach**: Each stage can be deployed independently
3. **Testing**: Ensure comprehensive testing after each major change
4. **Documentation**: Update documentation as architecture changes

## Risk Mitigation

- Create feature flags for major architectural changes
- Maintain backwards compatibility during transitions
- Set up automated regression tests
- Keep detailed migration guides for other developers

This plan provides a roadmap for systematically improving code quality while maintaining product stability. Each stage delivers tangible improvements that can be measured and validated.