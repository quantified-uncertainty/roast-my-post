# MCP Article Import Feature Implementation

**Date**: 2025-06-24  
**Context**: Database was wiped, implemented safety measures and new import feature

## Problem Discovered

- Database completely reset (0 records in all tables)
- Root cause: Running `npx prisma generate` in MCP server directory
- Version mismatch: MCP server had Prisma 6.1.0, main project has 6.10.1

## Safety Measures Implemented

### 1. Safe Prisma Wrapper (`/scripts/safe-prisma.sh`)

- Intercepts dangerous commands like `db push` and `migrate reset`
- Forces backup creation before operations
- Checks database health before proceeding
- Prevents running from subdirectories with different Prisma versions

### 2. Automated Backup System

- `/scripts/automated-backup.sh` - Daily backup script with 7-day retention
- `/scripts/setup-cron-backup.sh` - Easy cron setup
- Backups stored in `~/roast-my-post-backups/`

### 3. MCP Server Prisma Fix

- Removed local Prisma dependencies from `/mcp-server/package.json`
- Updated imports to use parent project's Prisma client
- Added `PRISMA_WARNING.md` in MCP server directory
- Updated `.gitignore` to prevent accidental Prisma installations

## New Feature: Article Import with Agent Selection

### API Changes (`/src/app/api/import/route.ts`)

```typescript
// Now accepts optional agentIds
const { url, importUrl, agentIds } = await request.json();

// Creates evaluations and jobs when agentIds provided
if (agentIds && agentIds.length > 0) {
  // Transaction-based creation of evaluations and jobs
}
```

### MCP Tool Added (`import_article`)

```typescript
// Schema
{
  url: string (required)
  agentIds: string[] (optional)
}

// Example usage
mcp__roast-my-post__import_article({
  url: "https://example.com/article",
  agentIds: ["8ZG6RyEzfxzIPa9h"]
})
```

## Current Database State

- 1 Agent: "EA Epistemic Auditor" (ID: 8ZG6RyEzfxzIPa9h)
- 0 Documents
- 0 Evaluations
- 0 Jobs

## Testing After Claude Restart

1. Import article without agents:

   ```
   Use import_article to import https://www.lesswrong.com/posts/[post-id]/[post-slug]
   ```

2. Import with specific agent:

   ```
   Import this article and have agent 8ZG6RyEzfxzIPa9h evaluate it: [URL]
   ```

3. Test the safety wrapper:
   ```
   Run npm run db:push (should trigger backup prompt)
   ```

## Next Session TODOs

- [ ] Test the import_article MCP tool
- [ ] Run `./scripts/setup-cron-backup.sh` to enable daily backups
- [ ] Consider creating more agents for testing
- [ ] Test importing multiple articles with different agents

## Key Files to Review

- `/scripts/safe-prisma.sh` - Database safety implementation
- `/src/app/api/import/route.ts` - Import endpoint with agent support
- `/mcp-server/src/index.ts` - MCP tool implementation
- `/claude/long-tasks/2025-06-24-mcp-article-import.md` - This file!
