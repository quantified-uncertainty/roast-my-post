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
   pg_dump -U postgres -d open_annotate > backup_$(date +%Y%m%d_%H%M%S).sql
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
   createdb -U postgres open_annotate_test
   pg_dump -U postgres open_annotate | psql -U postgres open_annotate_test
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

## Shell Issues
- If basic commands fail with `_safe_eval` errors, use full paths: `/bin/rm`, `/bin/ls`, `/bin/mv`

## Project Overview
"RoastMyPost" (open-annotate) - AI-powered document annotation and evaluation platform

### Tech Stack
- **Framework**: Next.js 15.3.2 with App Router, React 19, TypeScript
- **Database**: PostgreSQL with Prisma ORM v6.8.2
- **Authentication**: NextAuth.js 5.0.0-beta.28
- **UI**: Tailwind CSS, Slate.js editor for document highlighting
- **AI**: Anthropic Claude API + OpenAI integration
- **MCP Server**: Fast database access via Model Context Protocol

### Core Architecture
- **Documents**: Content items for analysis (with versioning)
- **Agents**: AI evaluators (ASSESSOR, ADVISOR, ENRICHER, EXPLAINER) stored as TOML configs
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
- `npm run typecheck` - Type checking
- `npm run db:push` - Push schema changes (now uses safe wrapper)
- `npm run process-jobs` - Manual job processing

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

## Database Access

### MCP Server (Recommended for Claude Code)
We have an MCP server that provides instant database access without writing scripts. This is 10-20x faster than creating TypeScript files. See `/mcp-server/README.md` for setup.

**IMPORTANT: After making any changes to MCP server code, you MUST rebuild it:**
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

