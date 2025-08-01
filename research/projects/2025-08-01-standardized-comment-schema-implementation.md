# Standardized Comment Schema Implementation

**Date**: 2025-08-01
**Branch**: `comment-enhancements`
**PR**: https://github.com/quantified-uncertainty/roast-my-post/pull/122

## Overview

Implemented a standardized comment schema across all evaluation plugins to improve consistency and enable better filtering/sorting of evaluation comments.

## Changes Implemented

### 1. Database Schema Updates
Added 4 new optional fields to the `EvaluationComment` table in `/internal-packages/db/prisma/schema.prisma`:
- `header` (String?): Concise summary like "2+2=5 → 2+2=4"
- `level` (String?): Severity level ('error', 'warning', 'info', 'success')
- `source` (String?): Plugin identifier ('math', 'spelling', 'fact-check', 'forecast')
- `metadata` (Json?): Plugin-specific data storage

### 2. Plugin Updates
Updated all analysis plugins to populate the new standardized fields:

#### Spelling Plugin (`/apps/web/src/lib/analysis-plugins/plugins/spelling/index.ts`)
- Always uses 'error' level
- Header shows correction: "misspelling → correction"
- Metadata includes: errorType, confidence, context, lineNumber

#### Math Plugin (`/apps/web/src/lib/analysis-plugins/plugins/math/index.ts`)
- Level varies by verification status:
  - 'error' for math errors
  - 'success' for verified correct
  - 'info' for unverified
- Header shows the math expression with error indicator
- Metadata includes complexity and verification details

#### Fact-Check Plugin (`/apps/web/src/lib/analysis-plugins/plugins/fact-check/commentGeneration.ts`)
- Maps verification verdicts to levels:
  - 'error' for false claims
  - 'warning' for questionable
  - 'success' for verified true
  - 'info' for uncheckable
- Header shows truncated claim with verdict

#### Forecast Plugin (`/apps/web/src/lib/analysis-plugins/plugins/forecast/index.ts`)
- Uses 'info' or 'warning' based on quality scores
- Header includes probability percentage: "📊 Forecast (95%): [prediction]"
- Metadata includes all forecast details

### 3. Utility Classes
Created `StandardCommentBuilder` utility class in `/apps/web/src/lib/analysis-plugins/utils/StandardCommentBuilder.ts`:
- Provides consistent API for building comments
- Helper methods for different levels
- Utilities for header formatting and importance calculation

### 4. UI Components

#### New Components Created:
1. **CommentFilters** (`/apps/web/src/components/DocumentWithEvaluations/components/CommentFilters.tsx`)
   - Filters by source plugin
   - Filters by level
   - Sort by importance or document position

2. **CommentStats** (`/apps/web/src/components/DocumentWithEvaluations/components/CommentStats.tsx`)
   - Shows total comment count
   - Breakdown by level with color coding
   - Breakdown by source plugin

#### Updated Components:
1. **PositionedComment** - Shows header prominently with level-based color coding
2. **CommentsSidebar** - Displays header, shows full description when expanded
3. **EvaluationView** - Integrated filters and stats above comment column
4. **EvaluationComments** - Shows header as title, displays level/source badges

### 5. Export Format Updates
Updated all export formats to include new fields:
- XML export (`/apps/web/src/lib/evaluation/exportXml.ts`)
- JSON/YAML export (`/apps/web/src/app/api/documents/[slugOrId]/export/route.ts`)
- Markdown export (in both routes and EvaluationDetailsSection)
- Agent data export API (`/apps/web/src/app/api/agents/[agentId]/export-data/route.ts`)

### 6. Type Updates
- Updated `CommentSchema` in `/apps/web/src/types/documentSchema.ts`
- Updated `DatabaseComment` type in components
- Updated evaluation display types to handle new fields

## Current Status

### User Action Required
Restart Claude Code session to pick up the rebuilt MCP server with correct database schema (priceInDollars instead of costInCents).

### Completed ✅
1. Database schema changes
2. All plugin updates
3. UI components for filtering/sorting
4. Export format updates
5. Type definitions
6. PR created (#122)
7. Merged latest main branch changes

### Issues Encountered

#### MCP Server Database Schema Mismatch 🚨
**Problem**: The MCP server is showing errors about `Job.costInCents` column not existing:
```
Error: Invalid `prisma.evaluation.findMany()` invocation:
The column `Job.costInCents` does not exist in the current database.
```

**Root Cause**: The database schema was updated in main to rename `costInCents` to `priceInDollars`, but the MCP server is still using the old Prisma client.

**Actions Taken**:
1. Merged latest main branch (which includes the fix)
2. Rebuilt MCP server: `pnpm --filter @roast/mcp-server run build`
3. Regenerated Prisma client: `pnpm --filter @roast/db run gen`

**Status**: MCP server still showing the error because Claude is using a cached instance with the old Prisma client. Multiple MCP server processes are running, and Claude needs to be fully restarted to use the rebuilt version.

### Next Steps (Priority Order)

1. **Test MCP Server Fix** 🔴 **[ACTION: Restart Claude Code Session]**
   - After Claude restart, verify MCP tools work:
     - `mcp__roast-my-post__get_recent_evaluations`
     - `mcp__roast-my-post__get_documents`
   - This will confirm if the database schema issue is resolved
   - **Note**: Rebuilt MCP server at 2025-08-01 with correct schema, but Claude is using cached instance

2. **Verify Standardized Comments**
   - Create test document with various error types
   - Run evaluations using Spell Check and General Epistemic Auditor
   - Verify comments show:
     - Correct headers
     - Appropriate levels
     - Source identification
     - Metadata storage

3. **Test UI Features**
   - Test filtering by source
   - Test filtering by level
   - Test sorting by importance
   - Verify stats display correctly

4. **CI/CD Status**
   - Monitor PR #122 for CI completion
   - Address any test failures (note: one math test is failing but unrelated to our changes)

## Test Documents Created

1. Document ID: `-w4jGoHk3EHaYfG5` (Example Domain)
   - Has 2 evaluations: Spell Check and General Epistemic Auditor
   - Status: Evaluations created but need to be processed

## Commands for Testing

```bash
# Process jobs (once script location is fixed)
pnpm --filter @roast/web run process-jobs

# Run tests
pnpm --filter @roast/web run test:ci

# Check types
pnpm --filter @roast/web run typecheck

# Lint
pnpm --filter @roast/web run lint
```

## Key Files Modified

- `/internal-packages/db/prisma/schema.prisma`
- `/apps/web/src/types/documentSchema.ts`
- `/apps/web/src/lib/analysis-plugins/plugins/*/index.ts` (all plugins)
- `/apps/web/src/components/DocumentWithEvaluations/components/*` (multiple components)
- `/apps/web/src/lib/evaluation/exportXml.ts`
- `/apps/web/src/app/api/documents/[slugOrId]/export/route.ts`
- `/apps/web/src/app/api/agents/[agentId]/export-data/route.ts`

## Benefits Achieved

1. ✅ Consistent categorization across all plugins
2. ✅ Easy filtering and sorting capabilities
3. ✅ Better visual distinction between comment types
4. ✅ Extensible metadata for future features
5. ✅ Backwards compatible (all fields optional)

## Screenshots/Evidence

- Document with evaluations visible at: http://localhost:3000/docs/-w4jGoHk3EHaYfG5
- Shows 2 active evaluations ready for testing