# Meta-Evaluation Tools

CLI for evaluating agent output quality using LLM-as-judge.

## Quick Start

```bash
pnpm --filter @roast/meta-evals run start
```

## Workflow

### 1. Create a Baseline

When you first run the CLI with no existing series, you'll be prompted to create a baseline:

1. Select a document to evaluate
2. Select one or more agents to run
3. The baseline is created with a unique series ID

### 2. View Series & Add Runs

Select a series from the main menu to see:
- All runs in chronological order
- Status of each run (pending, running, completed, failed)

From the detail screen you can:
- **Run Again** - Re-evaluate the document with the same agents (creates a new run for comparison)
- **Compare Runs** - Select 2-5 completed runs and get an LLM ranking

### 3. Compare Runs

The comparison uses an LLM judge to rank runs based on:
1. **VALIDITY** - Are the issues real? Hallucinations lose automatically
2. **UTILITY** - More actionable? (if validity tied)
3. **TONE** - More constructive? (final tiebreaker)

## Project Structure

```
src/
├── index.ts              # Entry point - main menu with series listing
├── actions/
│   ├── baseline.ts       # Create new baseline series
│   ├── seriesDetail.ts   # View series, add runs, compare
│   ├── compare.ts        # (legacy) Batch comparison
│   └── score.ts          # (legacy) Individual scoring
└── utils/
    ├── apiClient.ts      # HTTP client for web API
    └── formatters.ts     # Console output formatting
```

## Requirements

1. Set `DATABASE_URL` in a `.env` file or copy from `apps/web/.env.local`
2. The web app must be running on `localhost:3000` for creating runs
3. Run the worker to process jobs: `NODE_ENV=development pnpm run process-pgboss`

## Series Naming Convention

Series use trackingIds with the pattern: `series-{shortId}-{timestamp}-{agentId}`

- `series-{shortId}` groups all runs in a series
- `{timestamp}` is `YYYYMMDD-HHmm` for ordering
- `{agentId}` identifies which agent created the batch
