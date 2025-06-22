# Claude Code Operations Guide

This directory contains scripts and documentation specifically for Claude Code to analyze and improve the Open Annotate system.

## Quick Status

For detailed analysis of current issues, see: `/claude/analysis/2025-06-22-01-evaluation-analysis.md`

**Key Issues:**
- 90% of failures are comment validation errors
- High grade variance across agents (σ=20-35)
- Missing critical instruction sections in most agents

## Helper Scripts

All scripts use TypeScript with Prisma for direct database access.

### 1. Analyze Recent Evaluations
```bash
npx tsx claude/scripts/scripts/analyze-recent-evals.ts
```
- Shows last 200 evaluations
- Performance metrics by agent
- Failure rate analysis
- Grade distribution statistics

### 2. Deep Dive Analysis
```bash
npx tsx claude/scripts/deep-dive-analysis.ts
```
- Checks instruction completeness for all agents
- Analyzes recent failure patterns
- Comment quality metrics
- Cost efficiency by agent

### 3. Agent Performance Analysis
```bash
npx tsx claude/scripts/analyze-agent.ts <agent-id>
```
- Detailed metrics for specific agent
- Recent evaluation history
- Common failure patterns

### 4. Improvement Workflow
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

For direct analysis when scripts aren't enough:

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