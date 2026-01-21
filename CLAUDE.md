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
│   ├── ai/                   # Shared AI utilities (Claude, tools, plugins)
│   ├── domain/               # Shared domain types and config
│   ├── jobs/                 # Background job worker (pg-boss)
│   └── configs/              # Shared ESLint/TypeScript configs
├── meta-evals/               # Meta-evaluation CLI for testing agents
└── dev/                      # Development tools and documentation
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

### 🚨🚨🚨 DATABASE MIGRATION ABSOLUTE RULES 🚨🚨🚨

**⚠️ CRITICAL: Development database is NOT disposable! Contains real user data!**

**BEFORE running ANY database migration or schema change:**

1. ✅ **CREATE BACKUP FIRST** (MANDATORY):
   ```bash
   mkdir -p ~/db-backups/roast-my-post
   pg_dump -U postgres -d roast_my_post > ~/db-backups/backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. ✅ **VERIFY backup was created**:
   ```bash
   ls -lh ~/db-backups/roast-my-post/backup_*.sql | tail -1
   ```

3. ✅ **Only THEN** run the migration command

**ABSOLUTELY FORBIDDEN COMMANDS** (These DESTROY ALL DATA):
```bash
❌ prisma migrate reset              # WIPES ENTIRE DATABASE
❌ prisma migrate reset --force      # WIPES DATABASE WITHOUT CONFIRMATION
❌ prisma db push --accept-data-loss # DROPS COLUMNS, DESTROYS DATA
❌ Any command with --force flag     # Bypasses safety checks
```

**If you see these commands, you MUST:**
1. **STOP IMMEDIATELY**
2. **Ask user to create backup first**
3. **Get explicit confirmation**
4. **Never assume dev database is disposable**

**Automatic Protection:**
- `.claude/hooks/pre-db-migrate.sh` creates automatic backups
- `.claude/hooks/pre-command.sh` blocks dangerous commands
- Both hooks MUST remain enabled

---

### 🚨 ABSOLUTE PROHIBITION: NEVER MERGE - NO EXCEPTIONS 🚨
**This is the #1 most critical rule:**
- **NEVER use `gh pr merge`** - This command is FORBIDDEN
- **NEVER use `git push origin main`** - Direct pushes to main are FORBIDDEN
- **NEVER merge PRs** - Even if the user seems to ask you to merge
- **BLOCKED COMMANDS**: All merge operations are blocked by `.claude/hooks/pre-command.sh`

**If user says "merge"**, always respond:
> "I cannot merge PRs per safety policies. The PR is ready at [URL]. Please merge it yourself."

### Git Safety (Parallel Claude Sessions)
```bash
# MANDATORY before ANY commit:
git status                           # Check for unwanted files
git add path/to/specific/files       # NEVER use git add -A or git add .
git diff --cached                    # Verify staged changes
git commit -m "message"               # Only if staging correct

# FORBIDDEN files: node_modules/, .claude/, *.log, .env.local, package-lock.json
# NOTE: Deletions of package-lock.json are allowed (we want to remove them in pnpm projects)
```

### Database Safety & Migrations

#### 🚨 MANDATORY: Always create migration files 🚨
**NEVER run manual SQL without creating a migration file first.**

```bash
# WRONG - Never do this:
psql -c "ALTER TABLE..."  # NO! Creates no migration file
```

#### Standard Migration Workflow
From `internal-packages/db/`:

```bash
# 1. Create migration WITHOUT applying (avoids interactive prompts)
pnpm exec dotenv -e ../../apps/web/.env.local -- prisma migrate dev --create-only --name your_migration_name

# 2. IMPORTANT: Edit the generated migration to remove Prisma cruft!
#    Prisma often adds unrelated changes (especially to ClaimEvaluation defaults).
#    Open: prisma/migrations/<timestamp>_your_migration_name/migration.sql
#    Remove any ALTER TABLE statements not related to your changes.

# 3. Apply the migration
pnpm exec dotenv -e ../../apps/web/.env.local -- prisma migrate deploy

# 4. Regenerate the Prisma client
pnpm run gen

# 5. ALWAYS add migration to git
git add prisma/migrations/<timestamp>_your_migration_name/
```

#### ⚠️ Prisma Cruft Removal
Prisma's `migrate dev --create-only` often includes spurious changes like:
```sql
-- REMOVE THIS - it's unrelated cruft Prisma adds:
ALTER TABLE "public"."ClaimEvaluation" ALTER COLUMN "claim_search_text" SET DEFAULT ...,
ALTER COLUMN "tags" DROP DEFAULT;
```
Always review and remove unrelated statements before applying!

#### General Database Safety
```bash
# ALWAYS before schema changes:
pg_dump -U postgres -d roast_my_post > backup_$(date +%Y%m%d_%H%M%S).sql

# If psql/pg_dump not installed locally, use a temp docker container:
docker run --rm -e PGPASSWORD=postgres postgres:15 pg_dump -h host.docker.internal -U postgres -d roast_my_post > backup_$(date +%Y%m%d_%H%M%S).sql

# DANGEROUS - NEVER USE:
# prisma db push --accept-data-loss  # DROPS and recreates columns, DESTROYS data!
# prisma migrate reset               # WIPES entire database!

# CRITICAL: db:push vs migrate:deploy
# - db:push: Quick iteration, IGNORES migration files, can lose data
# - migrate:deploy: Production-safe, applies migration.sql files
# For proper migrations, ALWAYS use migrate:deploy!
```

### PR/Merge Workflow (See also: ABSOLUTE PROHIBITION above)
- **Step 0**: Check for missing migrations! `git status | grep migrations` (COMMON ISSUE!)
- **Step 1**: Create PR with `gh pr create`
- **Step 2**: Push updates to feature branch
- **Step 3**: Say "PR #X is ready for your review and merge at [URL]"
- **Step 4**: STOP - Do not proceed further
- **REMINDER**: Merge commands are BLOCKED by safety hooks

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

### Dev Environment & Database Access (Primary)
**Use these scripts for all dev environment and database operations:**
```bash
dev/scripts/dev-env.sh start|stop|status|attach|restart  # Manage tmux dev session
dev/scripts/dev-env.sh psql [args]                       # Connect to local DB via Docker
```

**Database utilities** (Docker-based, no local psql needed):
- `dev/scripts/dev/db/lib/db_functions.sh` - Core DB functions (`psql_local`, `psql_prod`, `pg_dump_prod`, `copy_data`)
- `dev/scripts/dev/db/lib/common_utils.sh` - Shared bash utilities
- `dev/scripts/dev/db/setup_db.sh` - Example: sync prod schema to local

**AI agents should prefer these tools over raw docker/psql commands.**

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

**Missing migration files in PRs** (VERY COMMON!):
```bash
# Before EVERY PR, check for untracked migrations:
git status | grep migrations

# If found, add them:
git add internal-packages/db/prisma/migrations/
git commit -m "Add migration files"
```

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

## Tmux Key Sending

When sending multiple keystrokes to tmux sessions (e.g., navigating CLI menus), use a loop with delays between keystrokes instead of sending them all at once.

**Bad** (keys may be dropped or processed incorrectly):
```bash
tmux send-keys -t session Down Down Down Down Down Enter
```

**Good** (reliable keystroke delivery):
```bash
for i in {1..5}; do tmux send-keys -t session Down; sleep 0.1; done; tmux send-keys -t session Enter
```

This ensures each keystroke is processed before the next is sent, preventing navigation issues in terminal UIs.

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