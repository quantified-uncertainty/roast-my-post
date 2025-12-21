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

Selecting a series shows a table of all runs grouped by timestamp:

```
┌────┬──────────────────┬──────────────────────────────┬────────────┐
│ #  │ Time             │ Agent                        │ Status     │
├────┼──────────────────┼──────────────────────────────┼────────────┤
│ 1  │ 12-21 14:30      │ Claude Opus                  │ ✓ Done     │
│ 2  │                  │ GPT-4                        │ ✓ Done     │
│ 3  │ 12-21 15:00      │ Claude Opus                  │ ⏳ Running │
└────┴──────────────────┴──────────────────────────────┴────────────┘
```

Actions available:
- **Run Again** - Re-evaluate with the same agents (for comparison)
- **Compare Runs** - Select 2-5 completed runs for LLM ranking
- **Back** - Return to main menu

### 3. Compare Runs

The comparison uses an LLM judge to rank runs based on:
1. **VALIDITY** - Are the issues real? Hallucinations lose automatically
2. **UTILITY** - More actionable? (if validity tied)
3. **TONE** - More constructive? (final tiebreaker)

Results show rankings with relative scores and reasoning.

## Project Structure

```
src/
├── index.ts              # Entry point - main menu loop
├── actions/
│   ├── baseline.ts       # Create new baseline, add runs to series
│   └── seriesDetail.ts   # View series runs, compare outputs
└── utils/
    ├── apiClient.ts      # HTTP client for web API
    └── formatters.ts     # Console output formatting
```

## Requirements

1. Set `DATABASE_URL` in a `.env` file or copy from `apps/web/.env.local`
2. The web app must be running on `localhost:3000` for creating runs
3. Run the worker to process jobs: `NODE_ENV=development pnpm run process-pgboss`

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
                        └─► MetaEvaluation (scores)
                               │
                               └─► MetaEvaluationDimension[]
```

**Flow:**
1. Create `Series` for a document
2. Trigger eval via API → creates `Job`
3. Link job to series via `SeriesRun`
4. Worker processes job → creates `EvaluationVersion`
5. Score output → creates `MetaEvaluation` with dimensions

**Tables (in @roast/db):**
- `Series` - groups runs, links to document
- `SeriesRun` - join table linking Series ↔ Job
- `MetaEvaluation` - scores for an EvaluationVersion
- `MetaEvaluationDimension` - individual dimension scores

Core system tables (NOT modified by meta-evals):
- `Job`, `EvaluationVersion`, `Evaluation`, `Document`, `Agent`
