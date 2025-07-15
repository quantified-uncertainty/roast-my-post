# Claude Development Notes

> **Note**: This file contains project-specific technical notes. For Claude Code operations, analysis scripts, and system insights, see `/claude/README.md`

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

## Critical Test Debugging Pattern (2025-06-27)

### The False Success Anti-Pattern
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
   npm run test:ci 2>&1 | grep -E "(PASS|FAIL|Test Suites:|Tests:)" | tail -10
   
   # Or just the final summary
   npm run test:ci 2>&1 | tail -5
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

### Tech Stack
- **Framework**: Next.js 15.3.2 with App Router, React 19, TypeScript
- **Database**: PostgreSQL with Prisma ORM v6.8.2
- **Authentication**: NextAuth.js 5.0.0-beta.28
- **UI**: Tailwind CSS, Slate.js editor for document highlighting
- **AI**: Anthropic Claude API + OpenAI integration
- **MCP Server**: Fast database access via Model Context Protocol

### Core Architecture
- **Documents**: Content items for analysis (with versioning)
- **Agents**: AI evaluators with customizable instructions stored as database records
  - Note: Agent instructions are now consolidated into `primaryInstructions` and `selfCritiqueInstructions`
- **Evaluations**: AI-generated analysis with comments and highlights
- **Jobs**: Asynchronous processing queue for AI analysis with retry logic

### Key Components
- `DocumentWithEvaluations.tsx`: Main split-pane document viewer
- `SlateEditor.tsx`: Rich text editor with sophisticated highlighting system
- Highlight system converts between character offsets and line-based positions
- Agent-based architecture with version control and specialized instruction sets

### Notable Features
- **Intelligent Import**: Supports LessWrong, EA Forum, general web with content extraction
- **Advanced Highlighting**: Real-time interaction, validation, error recovery
- **Cost Tracking**: Detailed monitoring of AI API usage and token counting
- **Job Processing**: Background queue with exponential backoff retry logic
- **Type Safety**: Comprehensive Zod schemas throughout

### Development Patterns
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

## Commands
- `npm run dev` - Development server
  - **IMPORTANT**: Always check if dev server is already running on port 3000 first (use `lsof -i :3000` or try http://localhost:3000)
  - The user often has the dev server already running, so check before starting a new instance
- `npm run lint` - ESLint for code style and quality
- `npm run typecheck` - TypeScript type checking
- `npm run db:push` - Push schema changes (now uses safe wrapper)
- `npm run process-jobs` - Manual job processing

### Code Quality Checks
**IMPORTANT**: When making code changes, always run BOTH:
1. `npm run lint` - Checks code style and quality (ESLint)
2. `npm run typecheck` - Checks TypeScript types

The linter (ESLint) does NOT catch TypeScript type errors. "Lint passing" does not mean "no TypeScript errors". You must run both commands to ensure code quality.

### Worktree Management (for parallel development)
- `./scripts/worktree-manager.sh create <branch>` - Create new worktree with automatic setup
- `./scripts/worktree-manager.sh start <branch>` - Start all processes in tmux
- `./scripts/worktree-manager.sh attach <branch>` - Attach to tmux session
- `./scripts/worktree-manager.sh list` - List all worktrees and their status
- `./scripts/worktree-manager.sh ports` - Show port allocations
- See `/docs/development/worktrees.md` for detailed documentation

## Recent Updates (2025-01-24)

### Admin User System
- Added `UserRole` enum to User model with USER and ADMIN roles
- Created `isAdmin()` helper function in auth.ts
- Protected `/monitor/*` routes with server-side admin check via layout
- Protected monitor API endpoints with admin checks
- Added `npm run set-admin <email>` command to grant admin access
- Note: Used layout-based protection instead of middleware due to Edge Runtime limitations with Prisma

## Recent Updates (2025-06-24)
- Fixed MCP server Prisma version mismatch that caused data loss
- Added safe-prisma.sh wrapper for dangerous database operations
- Added import_article MCP tool that accepts URL and optional agentIds
- Created automated backup scripts in /scripts/
- **MCP Server Improvements**:
  - Simplified database configuration - now uses standard DATABASE_URL
  - Removed schema copying complexity
  - Configure script now supports both ROAST_MY_POST_MCP_DATABASE_URL and DATABASE_URL
  - No longer requires separate prisma:generate step

## Critical Prisma/Database Debugging Guide (2025-06-25)

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
We have an MCP server that provides instant database access without writing scripts. This is 10-20x faster than creating TypeScript files. See `/mcp-server/README.md` for setup.

**Development Mode**: If you're running the MCP server with `npm run start`, it will automatically pick up code changes without needing to rebuild.

**Production Mode**: If you're running the built version, after making any changes to MCP server code, you must rebuild it:
```bash
cd mcp-server
npm run build
# Then restart Claude Code to use the updated server
```

Example usage in Claude:
- "Show me all agents with high failure rates"
- "Get evaluation stats for the last 30 days"
- "Find documents without any evaluations"
- "Import article from URL with agent evaluations"

### Direct Script Access
For complex queries, you can still write TypeScript scripts using Prisma. See `/claude/README.md` for examples.

## Documentation Structure

### Organized Documentation
Project documentation has been reorganized into `/docs/` with clear categories:

- **[/docs/README.md](/docs/README.md)** - Documentation navigation and overview
- **[/docs/development/agents.md](/docs/development/agents.md)** - Current agent system documentation (database/TOML approach)
- **[/docs/operations/health-checks.md](/docs/operations/health-checks.md)** - Comprehensive codebase health check guide
- **[/docs/security/authentication.md](/docs/security/authentication.md)** - Authentication systems and security best practices
- **[/docs/security/pre-commit.md](/docs/security/pre-commit.md)** - Pre-commit security checklist

### Migration Notes
- Old scattered documentation files have been consolidated and updated
- `AGENTS.md` → `/docs/development/agents.md` (updated with current database approach)
- `COMPREHENSIVE_HEALTH_CHECKS.md` + `HEALTH_CHECKS.md` → `/docs/operations/health-checks.md`
- `PRE_COMMIT_INVESTIGATION.md` → `/docs/security/pre-commit.md`
- `TODO-CRITICAL-ISSUES.md` → removed (all items completed)

### Claude Ideation Files
When creating ideation/analysis files in `/claude/ideation/`, use this naming pattern:
- Format: `YYYY-MM-DD-##-lowercase-hyphenated-name.md`
- Example: `2025-01-25-03-flexible-scoring-system.md`
- The `##` is a sequential number for that day (01, 02, 03, etc.)

## Testing Strategy (2025-06-27)

### Test Categories and Cost Management

**CRITICAL**: We have organized tests by cost and external dependencies to avoid expensive LLM usage in CI.

#### Test Category Naming Convention:
- `*.test.ts` = Unit tests (fast, no external deps)
- `*.integration.test.ts` = Integration tests (database, internal APIs)
- `*.e2e.test.ts` = End-to-end tests (external APIs like Firecrawl, LessWrong)
- `*.llm.test.ts` = LLM tests (Anthropic, OpenAI - EXPENSIVE!)

#### Available Test Scripts:
```bash
npm run test:unit          # Fast unit tests only
npm run test:integration   # Database/internal API tests
npm run test:e2e          # External API tests (requires API keys)
npm run test:llm          # LLM tests (expensive, requires API keys)
npm run test:fast         # Unit + integration (good for development)
npm run test:without-llms # Everything except expensive LLM calls
npm run test:ci           # CI-safe tests (no external deps)
```

#### For New Tests:
- **Writing new tests**: Use appropriate suffix based on dependencies
- **External APIs**: Add environment guards like `if (!process.env.FIRECRAWL_KEY) return`
- **LLM tests**: Always use `.llm.test.ts` suffix and API key guards
- **CI failures**: Use `npm run test:ci` to test what runs in GitHub Actions

#### GitHub Actions:
- Runs `npm run test:ci` (no external dependencies)
- E2E and LLM tests are excluded from CI to avoid costs and flakiness
- Developers can run full test suite locally when needed

## Puppeteer Debugging Tips (2025-06-29)

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

## Security Updates (2025-01-24)

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

