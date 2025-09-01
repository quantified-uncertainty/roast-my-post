# Claude Code Operations Guide

This directory contains scripts and documentation specifically for Claude Code to analyze and improve the Roast My Post system.

**Essential Reading**: Always refer to `/src/app/agents/readme/agent-schema-documentation.md` for the authoritative guide on agent configuration and requirements.

## Quick Status

For detailed analysis of current issues, see: `/claude/analysis/2025-06-22-01-evaluation-analysis.md`

**Key Issues:**
- 90% of failures are comment validation errors
- High grade variance across agents (σ=20-35)
- Missing critical instruction sections in most agents

**Important Note about Instructions:**
- Instructions have been consolidated into `genericInstructions` and `selfCritiqueInstructions`
- All analysis, summary, comment, and grading instructions should be sections within `genericInstructions`
- `selfCritiqueInstructions` are optional and provide quality scoring criteria
- A `providesGrades` flag is coming soon to explicitly indicate grade-providing agents

## Claude Code Efficiency Lessons

### Lesson 1: Don't Search for Known Information (2025-06-23)
**Issue**: Wasted ~5 minutes using Task tool to search for agent schema definitions when I already knew the Prisma schema location.
**Root Cause**: Defaulting to search behavior instead of direct navigation when uncertain.
**Solution**: When you know a file location or have worked with it before, go directly to it. Use search tools only for truly unknown information.
**Impact**: This pattern likely wastes significant time across sessions.

### Lesson 2: Verify Data Source Before Making Changes (2025-06-23)
**Issue**: Spent significant time updating TOML files in /data/agents that were outdated/unused. The real agent data lives in the database.
**Root Cause**: Assumed file-based data was the source of truth without verifying.
**Solution**: Always confirm where the authoritative data lives before making changes. Check imports, database models, and how data is actually loaded.
**Impact**: Wasted effort on dead code that had no effect on the system.

### Lesson 3: CRITICAL - Always Backup Before Database Schema Changes (2025-06-23)
**Issue**: Lost all data in genericInstructions column (32 agent versions) by using `prisma db push --accept-data-loss` to "rename" a column.
**Root Cause**: Misunderstood that `db push` with column name changes = DROP + ADD, not RENAME. Ignored the explicit data loss warning.
**Solution**: 
1. ALWAYS create a backup before ANY schema change: `pg_dump -U postgres -d roast_my_post > backup_$(date +%Y%m%d_%H%M%S).sql`
2. Use proper migrations for column renames: `ALTER TABLE "TableName" RENAME COLUMN "old" TO "new";`
3. Test destructive operations on a database copy first
4. NEVER use `--accept-data-loss` - it literally drops and recreates columns, destroying all data
**Impact**: Complete data loss for all agent instructions in development database.

## Database Access Options

### Recommended: MCP Server (Fastest)

We now have an MCP (Model Context Protocol) server that provides direct database access without needing to write scripts. This is **10-20x faster** than writing and executing TypeScript scripts.

**To use the MCP server in Claude:**
```
"Show me all active agents"
"Get recent failed evaluations for research-scholar"
"What's the performance of ASSESSOR agents over the last 30 days?"
"Find documents with no evaluations"
```

The MCP server provides these tools:
- `get_agents` - List agents with their latest versions
- `get_recent_evaluations` - View recent evaluations with filtering
- `get_agent_stats` - Get performance statistics for specific agents
- `get_failed_jobs` - Get recent failed jobs with error details
- `get_documents` - Search and list documents with evaluation status

See `/mcp-server/README.md` for setup instructions if not already configured.

### Alternative: Helper Scripts

If you need to run specific analysis scripts or the MCP server isn't available, all scripts use TypeScript with Prisma for direct database access.

#### 1. Analyze Recent Evaluations
```bash
npx tsx claude/scripts/scripts/analyze-recent-evals.ts
```
- Shows last 200 evaluations
- Performance metrics by agent
- Failure rate analysis
- Grade distribution statistics

#### 2. Deep Dive Analysis
```bash
npx tsx claude/scripts/deep-dive-analysis.ts
```
- Checks instruction completeness for all agents
- Analyzes recent failure patterns
- Comment quality metrics
- Cost efficiency by agent

#### 3. Agent Performance Analysis
```bash
npx tsx claude/scripts/analyze-agent.ts <agent-id>
```
- Detailed metrics for specific agent
- Recent evaluation history
- Common failure patterns

#### 4. Improvement Workflow
```bash
npx tsx claude/scripts/improve-agent-workflow.ts <agent-id>
```
- Exports agent data to `/tmp/agent-analysis-<id>.json`
- Includes current instructions, metrics, sample evaluations
- Ready to feed to LLM for improvement suggestions

## Common Commands

```bash
# Get all agent IDs and names
curl -s http://localhost:3000/api/agents | jq '.agents[] | {id, name}'

# Check which agents are failing most
npx tsx claude/scripts/analyze-recent-evals.ts | grep -B2 "Failure Rate"

# Find agents with missing instructions
npx tsx claude/scripts/deep-dive-analysis.ts | grep -A5 "Missing:"

# Quick agent improvement cycle
AGENT_ID="research-scholar"
npx tsx claude/scripts/improve-agent-workflow.ts $AGENT_ID
cat /tmp/agent-analysis-$AGENT_ID.json
```

## Database Queries

### Using MCP Server (Recommended)

The MCP server is the fastest way to query the database. Just ask naturally:
- "Find all jobs that failed in the last 7 days"
- "Show grade statistics grouped by agent"
- "Which documents have the most evaluations?"

### Writing Custom Queries

For direct analysis when you need custom queries not covered by the MCP tools:

```typescript
// Find all recent failures
const failures = await prisma.job.findMany({
  where: { 
    status: 'FAILED',
    createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
  },
  include: {
    evaluation: { include: { agent: true } }
  }
});

// Get grade statistics by agent
const gradeStats = await prisma.$queryRaw`
  SELECT 
    av.agent_id,
    av.name,
    COUNT(ev.id) as eval_count,
    AVG(ev.grade) as avg_grade,
    STDDEV(ev.grade) as grade_stddev
  FROM evaluation_versions ev
  JOIN agent_versions av ON ev.agent_version_id = av.id
  WHERE ev.grade IS NOT NULL
  GROUP BY av.agent_id, av.name
`;
```

## Quick Reference

For detailed fixes and templates, see: `/claude/analysis/2025-06-22-01-evaluation-analysis.md#required-instruction-templates`

## Analysis & Ideas

### Analysis Reports
See `/claude/analysis/` for system analysis:
- `2025-06-22-01-evaluation-analysis.md` - Analysis of 200 evaluations with architectural fixes

### Improvement Ideas
See `/claude/ideation/` for proposals:
- `2025-06-22-01-image_access.md` - Adding image support to evaluations
- `2025-06-22-02-agent_improvement_automation.md` - Automating the improvement loop
- `2025-06-22-03-background_agent_automation.md` - MCP server for agent operations
- `2025-06-22-04-background_agent_access_comparison.md` - API vs direct DB access
- `2025-06-22-05-large_context_handling.md` - Dealing with 100k-400k token evaluations

## Notes

- Dev server must be running for API calls: `npm run dev`
- Database connection uses same env as main app
- All timestamps are UTC
- Scripts output to console - pipe to files or jq for processing