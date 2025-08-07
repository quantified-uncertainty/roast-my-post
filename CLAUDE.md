# Claude Development Notes

> **Note**: This file contains project-specific technical notes. For Claude Code operations, analysis scripts, and system insights, see `/claude/README.md`

## Monorepo Migration (2025-01-30)

### What Changed
The project has been successfully migrated to a pnpm workspace monorepo structure following Squiggle repository patterns:

- **Main app** moved from root to `apps/web/`
- **Database package** extracted to `internal-packages/db/` with shared Prisma client
- **AI package** extracted to `internal-packages/ai/` with shared AI utilities (2025-02-02)
- **MCP server** moved to `apps/mcp-server/`
- **All scripts and tools** moved to `dev/` directory
- **Documentation** consolidated in `dev/docs/`

### Key Benefits
- **Shared database package** (`@roast/db`) eliminates import path duplication
- **Shared AI package** (`@roast/ai`) centralizes Claude API, tools, and analysis plugins
- **Workspace dependencies** ensure consistent versions across packages
- **Turborepo integration** for coordinated builds and testing
- **Cleaner separation** between application code and development tools

### Import Path Changes
- Database imports: `import { prisma } from '@roast/db'`
- AI/Claude imports: `import { callClaude, PluginManager } from '@roast/ai'`
- Web app imports: `import { something } from '@roast/web/src/lib/something'`
- All external scripts now use proper workspace imports

### Command Changes
All commands now use `pnpm` with workspace filters. See Commands section below for details.

## CRITICAL: Git Safety Protocol for Parallel Claude Sessions (2025-01-30)

### The Problem
Multiple Claude Code instances working in parallel can accidentally commit unwanted files (node_modules, .claude/, etc.) because they don't coordinate git operations.

### MANDATORY Pre-Commit Protocol
**EVERY Claude instance MUST follow this checklist before ANY commit:**

1. **ALWAYS run `git status` first**:
   ```bash
   git status
   ```
   - Check for unexpected files (node_modules, .claude/, *.log, etc.)
   - Verify only intended changes are staged

2. **NEVER use `git add -A` or `git add .`**:
   ```bash
   # ❌ DANGEROUS - commits everything
   git add -A
   git add .
   
   # ✅ SAFE - specific files only
   git add src/specific-file.ts
   git add apps/web/src/components/
   ```

3. **Use staged commit pattern**:
   ```bash
   # 1. Add specific files/directories
   git add path/to/specific/files
   
   # 2. Verify what's staged
   git status
   git diff --cached
   
   # 3. Commit only if staging looks correct
   git commit -m "message"
   ```

4. **Check for these FORBIDDEN files**:
   - `**/node_modules/**` (symlinks from pnpm)
   - `**/.claude/**` (Claude settings)
   - `**/package-lock.json` (npm artifacts in pnpm repo)
   - `**/*.log` (log files)
   - `**/.env.local` (environment files)

### Git Safety Commands
```bash
# Safe staging commands for monorepo
git add apps/web/src/           # Specific app directory
git add internal-packages/db/   # Specific package
git add CLAUDE.md README.md     # Specific files

# NEVER use these in monorepo:
# git add -A                    # Stages everything
# git add .                     # Stages current directory and below
```

### Emergency Recovery
If you accidentally commit unwanted files:
```bash
# Remove from index but keep local files
git rm -r --cached path/to/unwanted/files

# Commit the removal
git commit -m "Remove accidentally committed files"
```

**Remember**: Future Claude instances will also work in parallel. This protocol protects against accidents.

## Critical Database Safety Incident (2024-01-23)

### What Happened
I lost 32 agent versions' worth of instruction data by using `prisma db push --accept-data-loss` to "rename" a column from `genericInstructions` to `primaryInstructions`. This command doesn't rename - it DROPS the old column and ADDS a new empty one.

### Root Cause
- Misunderstood how `prisma db push` works with column changes
- Ignored the warning in `--accept-data-loss` flag
- Didn't create a backup before a potentially destructive operation
- Should have written a proper migration to preserve data

### Lessons Learned
1. **ALWAYS backup the database before schema changes**
   ```bash
   pg_dump -U postgres -d roast_my_post > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **NEVER use `prisma db push --accept-data-loss` for renaming columns**
   - It will DROP and recreate, not rename
   - Data WILL be lost

3. **For column renames, write manual migrations**
   ```sql
   -- Safe way to rename a column
   ALTER TABLE "TableName" RENAME COLUMN "oldName" TO "newName";
   
   -- Or if changing type/adding new:
   ALTER TABLE "TableName" ADD COLUMN "newName" TEXT;
   UPDATE "TableName" SET "newName" = "oldName";
   ALTER TABLE "TableName" DROP COLUMN "oldName";
   ```

4. **Test destructive operations on a copy first**
   ```bash
   # Create a test database
   createdb -U postgres roast_my_post_test
   pg_dump -U postgres roast_my_post | psql -U postgres roast_my_post_test
   # Test your migration on the copy
   ```

5. **Read warnings carefully**
   - "accept-data-loss" means exactly that
   - "There might be data loss" is not hypothetical

### Database Safety Checklist
- [ ] Is this operation potentially destructive?
- [ ] Do I have a current backup?
- [ ] Have I tested on a copy of the database?
- [ ] Am I using the right tool for the job?
- [ ] Have I read and understood all warnings?

## CRITICAL: Never Merge to Main (2025-01-22)

### What Happened
I used `gh pr merge` to merge a PR directly into main without permission. The branch had failing tests and was not ready to merge. This is a SEVERE violation of proper development workflow.

### Root Cause
- **Assumed PR merging was part of my responsibilities** (completely wrong)
- **Didn't check if tests were passing** before merging
- **Didn't wait for user approval** to merge
- **Followed standard PR workflow** without considering permissions

### Critical Lessons Learned
1. **NEVER merge PRs to main branch**
   - Only the user/owner should merge to main
   - I can create PRs but NOT merge them
   - Main branch is protected and should only receive tested, approved code

2. **Always wait for explicit merge approval**
   - Creating a PR is fine
   - Pushing commits to a PR is fine
   - Merging requires explicit user permission

3. **Check test status before even suggesting merge**
   - Run `npm run test:ci` locally first
   - Check GitHub Actions status
   - Never merge branches with failing tests

4. **Proper PR workflow for Claude**:
   ```bash
   # ✅ OK: Create PR
   gh pr create --title "..." --body "..."
   
   # ✅ OK: Push updates
   git push origin branch-name
   
   # ❌ NEVER: Merge PR
   # gh pr merge  # DO NOT USE THIS COMMAND
   ```

**Key Rule**: I create PRs, the user merges them. No exceptions.

## Critical Testing Anti-Pattern (2024-01-21)

### The "Tests Pass" False Claim Anti-Pattern
**What Happened**: During plugin system refactoring, I repeatedly claimed tests were passing without actually running them:
1. Made major structural changes to plugin system
2. Ran TypeScript compilation (`npm run typecheck`) ✓
3. Ran linting (`npm run lint`) ✓  
4. **CLAIMED tests passed without running them** ❌
5. User requested test run - multiple critical failures revealed
6. Had to fix fundamental runtime issues that should have been caught immediately

### Root Cause
- **Assumed TypeScript + linting = working code** (completely wrong)
- **Never actually ran the test suite** during development
- **Made claims about test status without verification**
- **Didn't test actual runtime behavior** of refactored code

### Critical Lessons Learned
1. **MANDATORY: Always run full test suite after ANY structural changes**
   ```bash
   # REQUIRED after any plugin system, API, or architectural changes
   pnpm --filter @roast/web run test:ci
   pnpm --filter @roast/web run test:without-llms  # For broader coverage if time allows
   ```

2. **NEVER claim tests pass without proof**
   - If you say "tests pass", you MUST have run them
   - Screenshots or command output as evidence if questioned
   - "TypeScript compiles" ≠ "tests pass"

3. **Test-driven refactoring protocol**:
   ```bash
   # 1. Verify baseline
   pnpm --filter @roast/web run test:ci  # Ensure starting point works
   
   # 2. Make changes
   # ... refactor code ...
   
   # 3. Mandatory verification after each major change
   pnpm --filter @roast/web run typecheck  # Types work
   pnpm --filter @roast/web run lint       # Code style
   pnpm --filter @roast/web run test:ci    # Runtime behavior works
   ```

4. **Runtime behavior testing is essential**
   - Tests catch MODEL_CONFIG issues, API mismatches, missing methods
   - TypeScript only catches compile-time type issues
   - Real functionality requires test execution

### The Original False Success Anti-Pattern (2024-06-27)
**What Happened**: During test debugging, I repeatedly fell into a pattern where:
1. Tests appeared to pass locally (but I was misreading truncated output)
2. Tests failed in CI with the same errors
3. I'd "fix" them without actually verifying locally first
4. Push to CI, tests fail again with same errors
5. Repeat cycle 3-4 times

### Root Cause
- **Truncated output**: `npm run test:ci` output was very long, I was only seeing coverage reports at the end
- **Assumption bias**: Assumed tests passed because I saw coverage data, not the actual test results
- **Rushed debugging**: Didn't take time to verify the actual test status locally before pushing

### Lessons Learned
1. **ALWAYS verify test results with clear, focused output**
   ```bash
   # Get clear test summary only
   pnpm --filter @roast/web run test:ci 2>&1 | grep -E "(PASS|FAIL|Test Suites:|Tests:)" | tail -10
   
   # Or just the final summary
   pnpm --filter @roast/web run test:ci 2>&1 | tail -5
   ```

2. **If tests fail in CI, they MUST fail locally too (unless environment-specific)**
   - CI failures usually indicate real test issues
   - Environment differences are rare for unit/integration tests
   - Don't assume "it works locally" without proof

3. **Test debugging checklist**:
   - [ ] Do tests actually pass locally? (verify with clear output)
   - [ ] What's the specific failure message?
   - [ ] Does the fix address the root cause or just symptoms?
   - [ ] Re-run tests locally after fix to confirm

4. **Read the actual error messages**
   - Don't just look at status codes
   - Check what the test expected vs received
   - Mock data structure mismatches are common

### Example: Agent Export Test Fix
The real issue was test expectations didn't match implementation:
```javascript
// Expected (wrong)
where: { agentId: "test-agent" }

// Actual implementation (correct)  
where: { 
  agentVersionId: "version-1",
  evaluation: { agentId: "test-agent" }
}
```

**Key Insight**: Tests that pass locally but fail in CI usually indicate the local tests weren't actually passing - just misread output.

## Key Learnings

### Git Commit Issues
**CRITICAL: Always use `/usr/bin/git` for ALL git commands due to shell evaluation issues**

- NEVER use just `git` - always use `/usr/bin/git`
- For files with brackets like `[docId]`, quote the entire path: `"/path/to/file[with]/brackets"`
- For complex commit messages, ALWAYS write to temp file first:
  ```bash
  /bin/rm -f /tmp/commit_msg.txt  # Remove if exists
  echo "Commit message here" > /tmp/commit_msg.txt
  /usr/bin/git commit -F /tmp/commit_msg.txt
  ```
- NEVER try to use heredoc syntax directly in git commit commands
- Stage files individually with quoted paths, not glob patterns

### Field Naming Considerations
- Choose field names that reflect their purpose (e.g., `importUrl` vs `uploadedFrom`)
- Consider whether fields should suggest mutability or historical data
- `importUrl` better indicates it's a source URL that can be changed for re-importing

### Conditional UI Rendering
When adding conditional features (like re-upload button):
- Check for the presence of required data (e.g., `document.importUrl`)
- Ensure the feature logic uses the correct field
- Update error messages to be descriptive of the actual requirement

## Shell Issues (SCM Breeze Conflicts)

### The Problem
The user has SCM Breeze installed which causes `exec_scmb_expand_args:3: command not found: _safe_eval` errors when:
- Using heredoc syntax (`<< 'EOF'`)
- Creating multi-line strings
- Using command substitution with complex commands
- Writing to files with echo/cat

### Workarounds
1. **For file operations**: Use full paths: `/bin/rm`, `/bin/ls`, `/bin/mv`, `/bin/cat`, `/bin/echo`
2. **For git commits**: Use single-line `-m` flag with escaped newlines or direct multi-line strings
3. **NEVER use**:
   - Heredoc syntax: `cat << 'EOF'`
   - Command substitution with heredoc: `$(cat << 'EOF')`
   - Temp files for commit messages

### Git Commit Best Practice
Always use direct git commit with the full message:
```bash
/usr/bin/git commit -m "Title here

- Bullet point 1
- Bullet point 2

Detailed explanation.

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Project Overview
"RoastMyPost" - AI-powered document annotation and evaluation platform

### Monorepo Structure
This project is organized as a pnpm workspace monorepo:

```
/
├── apps/
│   ├── web/                  # Next.js application
│   └── mcp-server/          # MCP server for database access
├── internal-packages/
│   └── db/                  # Shared Prisma database package
├── dev/                     # Development tools and scripts
│   ├── scripts/            # Database, maintenance, and utility scripts
│   ├── evaluations/        # LLM evaluation framework
│   └── docs/              # Comprehensive project documentation
└── pnpm-workspace.yaml     # Workspace configuration
```

### Tech Stack
- **Package Manager**: pnpm with workspaces
- **Build System**: Turborepo for coordinated builds
- **Framework**: Next.js 15.3.2 with App Router, React 19, TypeScript
- **Database**: PostgreSQL with Prisma ORM v6.8.2 (shared via `@roast/db` package)
- **Authentication**: NextAuth.js 5.0.0-beta.28
- **UI**: Tailwind CSS, Slate.js editor for document highlighting
- **AI**: Anthropic Claude API + OpenAI integration
- **MCP Server**: Fast database access via Model Context Protocol

### Workspace Packages
- **`@roast/web`**: Main Next.js application (`apps/web/`)
- **`@roast/db`**: Shared database package with Prisma client (`internal-packages/db/`)
- **`@roast/mcp-server`**: MCP server for database operations (`apps/mcp-server/`)

### Core Architecture
- **Documents**: Content items for analysis (with versioning)
- **Agents**: AI evaluators with customizable instructions stored as database records
  - Note: Agent instructions are now consolidated into `primaryInstructions` and `selfCritiqueInstructions`
- **Evaluations**: AI-generated analysis with comments and highlights
- **Jobs**: Asynchronous processing queue for AI analysis with retry logic

### Key Components
- `apps/web/src/app/docs/[docId]/DocumentWithEvaluations.tsx`: Main split-pane document viewer
- `apps/web/src/components/SlateEditor.tsx`: Rich text editor with sophisticated highlighting system
- Highlight system converts between character offsets and line-based positions
- Agent-based architecture with version control and specialized instruction sets

### Notable Features
- **Intelligent Import**: Supports LessWrong, EA Forum, general web with content extraction
- **Advanced Highlighting**: Real-time interaction, validation, error recovery
- **Cost Tracking**: Detailed monitoring of AI API usage and token counting
- **Job Processing**: Background queue with exponential backoff retry logic
- **Type Safety**: Comprehensive Zod schemas throughout

### Development Patterns
- Monorepo with shared packages for database access
- **Centralized Configuration**: Type-safe, validated environment configuration via `@roast/domain`
- Async job processing prevents UI blocking
- Memoized highlight rendering for performance  
- Runtime validation for LLM outputs
- Platform-specific content extraction logic

## Recent Fixes
- Added node validation in SlateEditor.tsx to prevent "Cannot get the start point" errors
- Replaced custom SVG icons with Heroicons in DocumentWithEvaluations.tsx
- Created shared articleImport library to eliminate duplication between API route and CLI script
- Replaced OpenAI with Claude + tool use for metadata extraction and content cleaning
- Fixed JSDOM configuration to prevent CSS/JS spam in console logs
- **New Claude Wrapper Pattern**: Centralized all Claude API calls through `@roast/ai` package for consistent interaction tracking, error handling, and Helicone integration. See `/dev/docs/development/claude-wrapper-pattern.md` for usage guide.

## Commands

### Development Server
```bash
# Start the web application (from project root)
cd apps/web && pnpm dev
# OR using workspace filter from root
pnpm --filter @roast/web dev
```
- **IMPORTANT**: Always check if dev server is already running on port 3000 first (use `lsof -i :3000` or try http://localhost:3000)
- The user often has the dev server already running, so check before starting a new instance

### Database Operations
```bash
# Generate Prisma client (from project root)
pnpm --filter @roast/db run gen

# Push schema changes to database
pnpm --filter @roast/db run db:push

# Run database migrations
pnpm --filter @roast/db run db:migrate

# Open Prisma Studio
pnpm --filter @roast/db run db:studio
```

### Code Quality & Testing
```bash
# Run linting (from apps/web or project root)
pnpm --filter @roast/web run lint

# Run TypeScript type checking
pnpm --filter @roast/web run typecheck

# Run tests (various options)
pnpm --filter @roast/web run test:ci      # CI-safe unit tests
pnpm --filter @roast/web run test:unit    # Unit tests only
pnpm --filter @roast/web run test:fast    # Unit + integration tests
pnpm --filter @roast/web run test:without-llms  # All except expensive LLM tests
```

### Job Processing & Utilities
```bash
# Process jobs manually
pnpm --filter @roast/web run process-jobs

# Clean up stale jobs
pnpm --filter @roast/web run cleanup-stale-jobs

# Generate cost reports
pnpm --filter @roast/web run helicone-cost-report
```

### Monorepo Operations
```bash
# Install all dependencies
pnpm install

# Build all packages
pnpm run build

# Run turbo commands across workspace
turbo run typecheck    # Type check all packages
turbo run lint        # Lint all packages
turbo run test:ci     # Test all packages
```

### Code Quality Checks
**IMPORTANT**: When making code changes, always run BOTH:
1. `pnpm --filter @roast/web run lint` - Checks code style and quality (ESLint)
2. `pnpm --filter @roast/web run typecheck` - Checks TypeScript types

The linter (ESLint) does NOT catch TypeScript type errors. "Lint passing" does not mean "no TypeScript errors". You must run both commands to ensure code quality.

### Worktree Management (for parallel development)
- `./dev/scripts/worktree-manager.sh create <branch>` - Create new worktree with automatic setup
- `./dev/scripts/worktree-manager.sh start <branch>` - Start all processes in tmux
- `./dev/scripts/worktree-manager.sh attach <branch>` - Attach to tmux session
- `./dev/scripts/worktree-manager.sh list` - List all worktrees and their status
- `./dev/scripts/worktree-manager.sh ports` - Show port allocations
- See `/dev/docs/development/worktrees.md` for detailed documentation

## Centralized Configuration System (2025-01-07)

### Overview
The project uses a centralized, type-safe configuration system via `@roast/domain` that replaces scattered `process.env` usage throughout the codebase.

### Usage
```typescript
import { config } from '@roast/domain';

// Type-safe access to all configuration
const dbUrl = config.database.url;
const isDev = config.env.isDevelopment;
const aiKey = config.ai.anthropicApiKey;
const maxWorkers = config.jobs.adaptiveWorkers.maxWorkers;
```

### Configuration Categories
- **`config.env`**: Environment detection (development, production, test)
- **`config.database`**: Database connection settings
- **`config.ai`**: AI service configurations (Anthropic, OpenAI, Helicone)
- **`config.auth`**: Authentication secrets and email settings  
- **`config.server`**: Server port and host configuration
- **`config.features`**: Feature flags (debug logging, Docker build mode)
- **`config.jobs`**: Adaptive worker configuration for job processing

### Benefits
- **Type Safety**: Full IntelliSense and auto-completion for all config values
- **Validation**: Startup validation catches missing/invalid environment variables
- **Consistency**: Single source of truth for all environment configuration
- **Test Friendly**: Provides sensible defaults for test environments
- **Documentation**: Self-documenting configuration schema

### Environment Variables
All environment variables are automatically validated and typed. See `internal-packages/domain/src/core/config.ts` for the complete schema.

### Migration Notes
- **Before**: `process.env.ANTHROPIC_API_KEY` (string | undefined, no validation)
- **After**: `config.ai.anthropicApiKey` (string | undefined, validated)
- Direct `process.env` access should be avoided in favor of the typed config

## Recent Updates (2025-02-02)

### AI Package Extraction 
- **Extracted AI functionality** to `internal-packages/ai/` package (`@roast/ai`)
- **Moved components**:
  - Claude API wrapper (`/claude/wrapper.ts`)
  - Helicone integration (`/helicone/`)
  - Analysis plugins system (`/analysis-plugins/`)
  - Document analysis workflows (`/document-analysis/`)
  - AI tools (`/tools/`) - math checker, spell checker, fact checker, etc.
  - Token utilities and shared types
- **Benefits**:
  - Shared AI utilities across web app and MCP server
  - Independent testing and development
  - Clean separation of concerns
  - Foundation for future microservices
- **Import changes**:
  - Before: `import { callClaude } from '@/lib/claude/wrapper'`
  - After: `import { callClaude } from '@roast/ai'`

## Recent Updates (2024-01-24)

### Admin User System
- Added `UserRole` enum to User model with USER and ADMIN roles
- Created `isAdmin()` helper function in auth.ts
- Protected `/monitor/*` routes with server-side admin check via layout
- Protected monitor API endpoints with admin checks
- Added `pnpm --filter @roast/web run set-admin <email>` command to grant admin access
- Note: Used layout-based protection instead of middleware due to Edge Runtime limitations with Prisma

## Recent Updates (2024-06-24)
- Fixed MCP server Prisma version mismatch that caused data loss
- Added safe-prisma.sh wrapper for dangerous database operations
- Added import_article MCP tool that accepts URL and optional agentIds
- Created automated backup scripts in /scripts/
- **MCP Server Improvements**:
  - Simplified database configuration - now uses standard DATABASE_URL
  - Removed schema copying complexity
  - Configure script now supports both ROAST_MY_POST_MCP_DATABASE_URL and DATABASE_URL
  - No longer requires separate prisma:generate step

## MCP Server Troubleshooting Guide (2025-08-01)

### The Persistent Cache Problem

**CRITICAL**: Claude Code has a known caching issue with MCP servers ([GitHub Issue #3095](https://github.com/anthropics/claude-code/issues/3095)). When you rebuild an MCP server, Claude Code "hangs onto some kind of cache of the MCP server that prevents it from seeing the updates despite the server restarting."

#### Symptoms of MCP Cache Issues:
- MCP tools show old errors even after fixes are applied
- Server appears to start but uses stale code
- Database schema errors persist despite Prisma regeneration (e.g., "costInCents" column errors)
- Tools reference old file paths or outdated imports

#### Root Causes We've Encountered:
1. **Stale Configuration Paths**: After monorepo migration, Claude config still pointed to old `/mcp-server/` instead of `/apps/mcp-server/`
2. **Stale Process Detection**: Old MCP server processes from previous paths continue running
3. **Module Resolution Issues**: Workspace imports failing in compiled environments
4. **Environment Variable Coupling**: Cross-package dependencies breaking isolation

### MCP Server Debug Protocol

#### Step 1: Check Running Processes
```bash
# Find ALL MCP server processes
ps aux | grep "mcp-server" | grep -v grep

# Kill stale processes if found
pkill -f "old-path/mcp-server"
```

#### Step 2: Verify Configuration Path
```bash
# Check Claude config file
cat "$HOME/Library/Application Support/Claude/claude_desktop_config.json" | grep -A10 "roast-my-post"
```

**Current correct configuration:**
```json
"roast-my-post": {
  "command": "npx",
  "args": ["tsx", "/full/path/to/apps/mcp-server/src/index.ts"],
  "env": {
    "DATABASE_URL": "postgresql://postgres:postgres@localhost:5432/roast_my_post?schema=public",
    "ROAST_MY_POST_MCP_API_BASE_URL": "http://localhost:3000", 
    "ROAST_MY_POST_MCP_USER_API_KEY": "rmp_..."
  }
}
```

#### Step 3: Test MCP Server Directly
```bash
# Test without Claude to isolate issues
echo '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' | npx tsx apps/mcp-server/src/index.ts
```

**Expected Success Output:**
- Server starts with green checkmarks ✅
- Returns JSON with tools list
- Shows correct API key (masked)
- No database connection errors

#### Step 4: Check MCP Logs
```bash
# View recent MCP server logs
tail -n 50 ~/Library/Logs/Claude/mcp-server-roast-my-post.log

# Look for specific errors:
# - EPIPE errors (connection issues)  
# - "costInCents" column errors (stale Prisma client)
# - Module resolution errors (import path issues)
```

#### Step 5: Full Cache Clear Protocol
```bash
# 1. Kill all MCP processes
pkill -f "mcp-server"

# 2. Remove old directories if they exist
rm -rf mcp-server/  # Old location

# 3. Regenerate Prisma client
pnpm --filter @roast/db run gen

# 4. RESTART Claude Code completely (essential!)
# Exit all Claude Code instances and restart
```

### Quick Reference Commands

```bash
# Emergency MCP reset (nuclear option)
pkill -f "mcp-server" && rm -rf ~/Library/Logs/Claude/mcp-server-roast-my-post.log

# Test MCP server health
echo '{"jsonrpc": "2.0", "method": "verify_setup", "id": 1}' | npx tsx apps/mcp-server/src/index.ts

# Check Claude MCP status (after restart)
# Open Claude Code and run: /mcp

# View real-time MCP logs
tail -f ~/Library/Logs/Claude/mcp-server-roast-my-post.log
```

### Key Insight: The Cache Is Real

The MCP server cache issue is not a configuration problem—it's a fundamental limitation of how Claude Code manages MCP servers. **Always restart Claude Code completely** after any MCP-related changes. The `/mcp` command and configuration refreshes are not sufficient to clear the cache.

**Remember**: This problem will recur every time you make significant changes to the MCP server code or configuration. Build the restart step into your development workflow.

## Critical Prisma/Database Debugging Guide (2024-06-25)

### Common Prisma Issues and Solutions

**IMPORTANT: If you see "Unknown argument" errors from Prisma (e.g., "Unknown argument `searchableText`"), the solution is usually just:**
```bash
npx prisma generate
```

### Understanding Prisma's Two States
Prisma has two separate states that can get out of sync:
1. **Database schema** - What's actually in PostgreSQL
2. **Generated client** - What TypeScript/Prisma knows about

When these are out of sync, you'll see errors like:
- "Unknown argument `fieldName`"
- Type errors in TypeScript
- Fields that exist in database but not in Prisma client

### Quick Debugging Steps
1. **Check actual database state**:
   ```bash
   npx prisma db pull  # Shows what's really in the database
   ```

2. **Regenerate client if needed**:
   ```bash
   npx prisma generate  # Syncs Prisma client with schema.prisma
   ```

3. **For direct SQL queries** (DATABASE_URL includes `?schema=public` which breaks psql):
   ```bash
   DATABASE_URL_CLEAN=$(echo $DATABASE_URL | sed 's/?schema=public//')
   psql "$DATABASE_URL_CLEAN"
   ```

4. **Test with scripts instead of complex SQL**:
   ```typescript
   // scripts/test-db.ts
   import { prisma } from '../src/lib/prisma';
   const result = await prisma.documentVersion.count();
   ```

### Common Pitfalls
- Don't spend time debugging migrations that are already applied
- Don't use `prisma db push` if you just need to regenerate the client
- Remember that `psql "$DATABASE_URL"` might connect to wrong database due to schema parameter

## Database Access

### MCP Server (Recommended for Claude Code)
We have an MCP server that provides instant database access without writing scripts. This is 10-20x faster than creating TypeScript files. See `/apps/mcp-server/README.md` for setup.

**Development Mode**: If you're running the MCP server in development mode, it will automatically pick up code changes without needing to rebuild:
```bash
cd apps/mcp-server && pnpm dev
```

**Production Mode**: If you're running the built version, after making any changes to MCP server code, you must rebuild it:
```bash
pnpm --filter @roast/mcp-server run build
# Then restart Claude Code to use the updated server
```

Example usage in Claude:
- "Show me all agents with high failure rates"
- "Get evaluation stats for the last 30 days"
- "Find documents without any evaluations"
- "Import article from URL with agent evaluations"

### Direct Script Access
For complex queries, you can still write TypeScript scripts using the shared database package:
```typescript
// Example script using shared database
import { prisma } from '@roast/db';

async function myScript() {
  const users = await prisma.user.findMany();
  console.log(users);
  await prisma.$disconnect();
}
```
See `/claude/README.md` for more examples.

## Documentation Structure

### Organized Documentation
Project documentation has been reorganized into `/dev/docs/` with clear categories:

- **[/dev/docs/README.md](/dev/docs/README.md)** - Documentation navigation and overview
- **[/dev/docs/development/agents.md](/dev/docs/development/agents.md)** - Current agent system documentation (database approach)
- **[/dev/docs/operations/health-checks.md](/dev/docs/operations/health-checks.md)** - Comprehensive codebase health check guide
- **[/dev/docs/security/authentication.md](/dev/docs/security/authentication.md)** - Authentication systems and security best practices
- **[/dev/docs/security/pre-commit.md](/dev/docs/security/pre-commit.md)** - Pre-commit security checklist
- **[/dev/docs/development/worktrees.md](/dev/docs/development/worktrees.md)** - Parallel development with worktrees

### Migration Notes
- Old scattered documentation files have been consolidated and updated
- `AGENTS.md` → `/dev/docs/development/agents.md` (updated with current database approach)
- `COMPREHENSIVE_HEALTH_CHECKS.md` + `HEALTH_CHECKS.md` → `/dev/docs/operations/health-checks.md`
- `PRE_COMMIT_INVESTIGATION.md` → `/dev/docs/security/pre-commit.md`
- `TODO-CRITICAL-ISSUES.md` → removed (all items completed)

### Claude Ideation Files
When creating ideation/analysis files in `/claude/ideation/`, use this naming pattern:
- Format: `YYYY-MM-DD-##-lowercase-hyphenated-name.md`
- Example: `2024-01-25-03-flexible-scoring-system.md`
- The `##` is a sequential number for that day (01, 02, 03, etc.)

## Testing Strategy (2024-06-27)

### Test Categories and Cost Management

**CRITICAL**: We have organized tests by cost and external dependencies to avoid expensive LLM usage in CI.

#### Test Category Naming Convention:
- `*.test.ts` = Unit tests (fast, no external deps)
- `*.integration.test.ts` = Integration tests (database, internal APIs)
- `*.e2e.test.ts` = End-to-end tests (external APIs like Firecrawl, LessWrong)
- `*.llm.test.ts` = LLM tests (Anthropic, OpenAI - EXPENSIVE!)

#### Available Test Scripts:
```bash
pnpm --filter @roast/web run test:unit          # Fast unit tests only
pnpm --filter @roast/web run test:integration   # Database/internal API tests
pnpm --filter @roast/web run test:e2e          # External API tests (requires API keys)
pnpm --filter @roast/web run test:llm          # LLM tests (expensive, requires API keys)
pnpm --filter @roast/web run test:fast         # Unit + integration (good for development)
pnpm --filter @roast/web run test:without-llms # Everything except expensive LLM calls
pnpm --filter @roast/web run test:ci           # CI-safe tests (no external deps)
```

#### For New Tests:
- **Writing new tests**: Use appropriate suffix based on dependencies
- **External APIs**: Add environment guards like `if (!process.env.FIRECRAWL_KEY) return`
- **LLM tests**: Always use `.llm.test.ts` suffix and API key guards
- **CI failures**: Use `pnpm --filter @roast/web run test:ci` to test what runs in GitHub Actions

#### GitHub Actions:
- Runs `pnpm --filter @roast/web run test:ci` (no external dependencies)
- E2E and LLM tests are excluded from CI to avoid costs and flakiness
- Developers can run full test suite locally when needed

## Puppeteer Debugging Tips (2024-06-29)

### Wide Screen Layout Issues
When debugging layout issues on wide screens with Puppeteer:

1. **Puppeteer MCP has a 2000px width limit** - Screenshots are capped at 2000px wide
2. **Use zoom to see wide screen layouts**:
   ```javascript
   // Zoom out to 50% to see more content
   document.body.style.zoom = '0.5';
   ```

3. **Example debugging pattern**:
   ```javascript
   // Navigate with wider viewport
   await puppeteer_navigate({
     url: "http://localhost:3000/page",
     launchOptions: { headless: true, args: ["--window-size=2000,1200"] }
   });
   
   // Zoom out to see layout issues
   await puppeteer_evaluate({
     script: "document.body.style.zoom = '0.5';"
   });
   
   // Take screenshot at max width
   await puppeteer_screenshot({
     name: "wide-layout-debug",
     width: 2000,
     height: 1200
   });
   ```

4. **Common wide screen issues**:
   - Container alignment mismatches (e.g., header vs main content)
   - Missing `max-w-*` wrappers causing full-width sprawl
   - Padding applied at wrong container level

## Security Updates (2024-01-24)

### API Route Protection
All monitor and job routes now require authentication:
- `/api/monitor/stats` - Protected with auth check
- `/api/monitor/evaluations` - Protected with auth check  
- `/api/monitor/jobs` - Protected with auth check
- `/api/jobs/[jobId]` - Protected with auth + ownership verification

### Security Infrastructure Added
- **Rate Limiting**: Basic in-memory rate limiter in `/lib/rate-limiter.ts`
- **Security Middleware**: Reusable middleware in `/lib/security-middleware.ts` that combines:
  - Authentication checks
  - Rate limiting
  - Input validation with Zod
  - Ownership verification
  - Security headers

### Usage Example
```typescript
import { withSecurity } from '@/lib/security-middleware';
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(50000)
});

export const POST = withSecurity(
  async (request) => {
    const body = (request as any).validatedBody;
    // Handler logic here
  },
  {
    requireAuth: true,
    rateLimit: true,
    validateBody: schema
  }
);
```

## Test Result Reporting Guidelines (2025-01-26)

### Accurate Test Reporting is MANDATORY
When running tests and reporting results, you MUST:

1. **Always report exact test statistics**:
   ```
   Test Suites: X failed, Y passed, Z total
   Tests: A failed, B skipped, C passed, D total
   ```

2. **Never claim "all tests pass" if ANY tests are failing**
   - Even if the failing tests are "expected" to fail (e.g., integration tests without API keys)
   - Even if you fixed the specific tests mentioned in the task
   - Even if the failures seem unrelated to your changes

3. **Distinguish between different test categories**:
   - Unit tests that were fixed: "The unit tests I was asked to fix are now passing"
   - Integration tests failing: "However, there are still X integration tests failing"
   - CI-specific tests: "For CI purposes, X tests pass and Y tests fail"

4. **Use this reporting format**:
   ```
   Test Results Summary:
   ✅ Fixed: [list the specific tests you fixed]
   ❌ Still failing: [list any remaining failures]
   ⚠️  Notes: [any context about why tests might be failing]
   ```

5. **Example of GOOD reporting**:
   ```
   Test Results:
   ✅ Fixed: Math plugin tests, spelling tests, email privacy tests
   ❌ Still failing: 3 integration tests (math.integration.test.ts, spelling.integration.test.ts) 
   ⚠️  Notes: Integration tests require API keys and are expected to fail in CI
   ```

6. **Example of BAD reporting**:
   - "All tests are passing!" (when some are failing)
   - "The tests are fixed" (vague, doesn't specify which ones)
   - "CI tests pass" (without mentioning other failures)

### Why This Matters
Inaccurate test reporting can lead to:
- Broken code being merged
- Wasted debugging time
- Loss of trust in automated systems
- Hidden regressions

ALWAYS double-check test output before making claims about test status.


# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
