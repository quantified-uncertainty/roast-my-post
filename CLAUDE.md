# Claude Development Notes

> **Note**: For Claude Code operations and analysis scripts, see `/claude/README.md`. For historical updates and migrations, see CHANGELOG.md.

## Project Overview
**RoastMyPost** - AI-powered document annotation and evaluation platform

### Monorepo Structure
```
/
├── apps/
│   ├── web/                  # Next.js application
│   └── mcp-server/           # MCP server for database access
├── internal-packages/
│   ├── db/                   # Shared Prisma database package
│   └── ai/                   # Shared AI utilities (Claude, tools, plugins)
└── dev/                       # Development tools and documentation
```

### Tech Stack
- **Framework**: Next.js 15.3.2, React 19, TypeScript, Tailwind CSS
- **Database**: PostgreSQL + Prisma ORM 6.8.2 (`@roast/db`)
- **AI**: Anthropic Claude API + OpenAI (`@roast/ai`)
- **Auth**: NextAuth.js 5.0.0-beta
- **Package Manager**: pnpm workspaces + Turborepo

### Import Paths
```typescript
import { prisma } from '@roast/db'
import { callClaude, PluginManager } from '@roast/ai'
import { config } from '@roast/domain'  // Type-safe config
```

## Critical Safety Rules

### Git Safety (Parallel Claude Sessions)
```bash
# MANDATORY before ANY commit:
git status                           # Check for unwanted files
git add path/to/specific/files       # NEVER use git add -A or git add .
git diff --cached                    # Verify staged changes
git commit -m "message"               # Only if staging correct

# FORBIDDEN files: node_modules/, .claude/, *.log, .env.local, package-lock.json
```

### Database Safety
```bash
# ALWAYS before schema changes:
pg_dump -U postgres -d roast_my_post > backup_$(date +%Y%m%d_%H%M%S).sql

# NEVER use for column renames:
prisma db push --accept-data-loss  # This DROPS data, doesn't rename!

# Safe column rename:
ALTER TABLE "TableName" RENAME COLUMN "oldName" TO "newName";
```

### PR/Merge Rules
- **NEVER merge to main** - Only create PRs, user merges
- **NEVER use `gh pr merge`**
- Always run tests before suggesting merge ready

### Testing Requirements
```bash
# MANDATORY after structural changes:
pnpm --filter @roast/web run typecheck
pnpm --filter @roast/web run lint
pnpm --filter @roast/web run test:ci  # MUST actually run, not assume

# NEVER claim "tests pass" without running them
# TypeScript compiles ≠ tests pass
```

## Commands Quick Reference

### Development
```bash
pnpm --filter @roast/web dev          # Start dev server (check port 3000 first!)
pnpm --filter @roast/db run gen       # Generate Prisma client
pnpm --filter @roast/db run db:push   # Push schema changes
```

### Testing
```bash
# Test categories by cost/dependencies:
pnpm --filter @roast/web run test:ci           # CI-safe (no external deps)
pnpm --filter @roast/web run test:unit         # Fast unit tests
pnpm --filter @roast/web run test:integration  # Database tests
pnpm --filter @roast/web run test:without-llms # All except LLM tests
pnpm --filter @roast/web run test:llm          # Expensive LLM tests
```

### Code Quality
```bash
pnpm --filter @roast/web run lint       # ESLint
pnpm --filter @roast/web run typecheck  # TypeScript
# MUST run both - linter doesn't catch type errors!
```

## MCP Server Quick Fix

**Problem**: Claude Code caches MCP servers, changes don't take effect

**Solution**:
```bash
# 1. Kill all MCP processes
pkill -f "mcp-server"

# 2. Regenerate Prisma if needed
pnpm --filter @roast/db run gen

# 3. RESTART Claude Code completely (required!)

# Test MCP health:
echo '{"jsonrpc": "2.0", "method": "verify_setup", "id": 1}' | npx tsx apps/mcp-server/src/index.ts
```

## Docker Build Strategy

**Simple approach (what we use)**:
```dockerfile
# Build everything in Docker
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @roast/db run build
RUN pnpm --filter @roast/domain run build
# @roast/ai doesn't need building (tsx runtime)
```

**Package build requirements**:
| Package | Needs Build | Why |
|---------|-------------|-----|
| @roast/db | ✅ | Prisma generated client |
| @roast/domain | ✅ | Other packages expect dist/ |
| @roast/ai | ❌ | Worker uses tsx, web uses transpilePackages |

## Common Prisma Issues

**"Unknown argument" error**:
```bash
npx prisma generate  # Usually fixes it
```

**Check database state**:
```bash
npx prisma db pull   # What's in database
npx prisma generate  # Sync client with schema
```

## Shell Workarounds (SCM Breeze)

**Issue**: User has SCM Breeze causing heredoc errors

**Solution**: Use direct commands, no heredocs:
```bash
# Git commits:
/usr/bin/git commit -m "Title

Details here"

# File operations:
/bin/rm, /bin/cat, /bin/echo  # Use full paths
```

## Documentation Structure
- `/dev/docs/README.md` - Documentation index
- `/dev/docs/development/` - Development guides
- `/dev/docs/operations/health-checks.md` - Codebase health checks
- `/dev/docs/security/` - Security and auth docs

## Test Reporting Format
```
Test Results:
✅ Fixed: [specific tests fixed]
❌ Still failing: [remaining failures]
⚠️  Notes: [context about failures]

# NEVER say "all tests pass" if ANY are failing
```

## Key Lessons Summary

1. **Database**: Always backup before schema changes, never use --accept-data-loss for renames
2. **Git**: Never use `git add -A`, always check staged files before commit
3. **Testing**: Actually run tests, don't assume from TypeScript/lint success
4. **PRs**: Create but never merge, that's user's job
5. **MCP**: Restart Claude Code after changes, cache is persistent
6. **Prisma**: `npx prisma generate` fixes most "Unknown argument" errors
7. **Docker**: Simple build-in-Docker approach works best for our monorepo

## Important Reminders
- Do only what's asked, nothing more
- NEVER create documentation files unless explicitly requested
- Always prefer editing existing files over creating new ones
- Check if dev server already running before starting new instance