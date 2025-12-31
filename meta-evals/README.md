# Meta-Evaluation Tools

Interactive CLI for evaluating agent output quality using LLM-as-judge.

## Quick Start

```bash
pnpm --filter @roast/meta-evals run start
```

To verify setup without running interactively:
```bash
pnpm --filter @roast/meta-evals run start --check
```

## Workflow

### Main Menu

When you launch the CLI:
- **No series exist** → Prompted to create a baseline or exit
- **Series exist** → Select a series to view/manage, create new baseline, or exit

### 1. Create a Baseline

Creates the first run in a new evaluation series:

1. Select a document from recent documents
2. Select one or more agents (space to toggle, enter to confirm)
3. Review and confirm
4. Jobs are queued via the web API

### 2. Series Detail View

Selecting a series shows a table of all runs:

```
┌───┬──────────────────────┬──────────┬───────┬──────────┐
│ # │ Agent                │ Status   │ Score │ Created  │
├───┼──────────────────────┼──────────┼───────┼──────────┤
│ 1 │ Claude Opus          │ Done     │ 8/10  │ 12/21    │
│ 2 │ GPT-4                │ Done     │ 7/10  │ 12/21    │
│ 3 │ Claude Sonnet        │ Running  │ -     │ 12/21    │
└───┴──────────────────────┴──────────┴───────┴──────────┘
```

Actions available:
- **Run Again** - Re-evaluate with the same agents
- **Rank Runs** - Compare 2+ completed runs with LLM ranking
- **Score Run** - Score a single run on quality dimensions
- **Clear Failed** - Remove failed runs from the series (only shown if failures exist)

### 3. Score Run

Score a single completed run using an LLM judge:

1. Select a run from the list (shows `[scored]` for already-scored runs)
2. If already scored: view the saved result
3. If not scored: AI judge evaluates on dimensions:
   - **Accuracy** - Are the issues real and correctly identified?
   - **Importance** - Are the flagged issues significant?
   - **Clarity** - Is the feedback clear and actionable?
   - And more...
4. View overall score (1-10) and per-dimension scores
5. View full reasoning or save to database

### 4. Rank Runs

Compare multiple runs using an LLM judge:

**Tabbed Interface:**
- **Saved Rankings** - View previously saved ranking sessions
- **New Ranking** - Create a new comparison

**Creating a New Ranking:**
1. Toggle runs to include (need 2+ runs)
2. Select "Run Ranking"
3. AI judge compares and ranks based on:
   - **VALIDITY** - Are the issues real? Hallucinations lose
   - **UTILITY** - More actionable feedback wins ties
   - **TONE** - More constructive wins final ties
4. View rankings with relative scores and reasoning
5. Save to database or discard

## Project Structure

```
src/
├── index.tsx             # Entry point with Ink app
├── components/
│   ├── MainMenu.tsx      # Series list and navigation
│   ├── CreateBaseline.tsx # Document/agent selection
│   ├── SeriesDetail.tsx  # Run table with actions
│   ├── ScoreRun.tsx      # Single run scoring flow
│   ├── RankRuns.tsx      # Multi-run ranking flow
│   ├── shared.tsx        # Reusable UI components
│   ├── helpers.ts        # Formatting utilities
│   └── types.ts          # Screen state types
└── actions/
    └── baseline.ts       # API calls for creating runs
```

## Requirements

1. Database connection via `DATABASE_URL` (uses `apps/web/.env.local`)
2. Web app running on `localhost:3000` for creating runs
3. Worker running to process jobs: `NODE_ENV=development pnpm run process-pgboss`

## Data Model

```
Series (groups runs on one document)
   │
   └─► SeriesRun (join table)
          │
          └─► Job (status: PENDING/RUNNING/COMPLETED/FAILED)
                 │
                 └─► EvaluationVersion (agent output, when complete)
                        │
                        └─► MetaEvaluation (scores/rankings)
                               │
                               └─► MetaEvaluationDimension[]
```

**Flow:**
1. Create `Series` for a document
2. Trigger eval via API → creates `Job`
3. Link job to series via `SeriesRun`
4. Worker processes job → creates `EvaluationVersion`
5. Score/rank outputs → creates `MetaEvaluation` with dimensions

**Tables (in @roast/db):**
- `Series` - groups runs, links to document
- `SeriesRun` - join table linking Series ↔ Job
- `MetaEvaluation` - scores/rankings for an EvaluationVersion (type: "scoring" | "ranking")
- `MetaEvaluationDimension` - individual dimension scores

Core system tables (NOT modified by meta-evals):
- `Job`, `EvaluationVersion`, `Evaluation`, `Document`, `Agent`
