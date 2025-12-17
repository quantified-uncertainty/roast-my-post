# Meta-Evaluation Tools

CLI for evaluating agent output quality using LLM-as-judge.

## Quick Start

```bash
pnpm --filter @roast/meta-evals run start
```

This launches an interactive menu where you can:
- **Baseline** - Create evaluation runs for comparison (select docs + agents)
- **Score** - Rate outputs on quality dimensions (1-10 each)
- **Compare** - Rank multiple versions (A/B testing or N-way)

## Quality Dimensions

| Dimension | Description |
|-----------|-------------|
| Accuracy | Are the identified issues real? Not hallucinated? |
| Importance | Worth the reader's attention? Not trivial? |
| Clarity | Punchy, easy to understand, unambiguous? |
| Surprise | Non-obvious? Adds value beyond what reader would notice? |
| Verifiability | Can the reader check if it's correct? |
| Tone | Constructive? Unlikely to upset people? |
| Coverage | Did it catch the important issues? (collection-level) |
| Redundancy | Minimal overlap between comments? (collection-level) |

## Ranking Hierarchy

When comparing outputs, the judge uses this strict hierarchy:

1. **VALIDITY** - Real issue? Hallucinations lose automatically
2. **UTILITY** - More actionable? (if validity tied)
3. **TONE** - More constructive? (final tiebreaker)

## Project Structure

```
src/
├── index.ts           # Entry point with interactive menu
├── actions/           # User actions (UI + orchestration)
│   ├── baseline.ts    # Create baseline runs
│   ├── score.ts       # Scoring flow
│   └── compare.ts     # Comparison flow
└── utils/
    ├── apiClient.ts   # HTTP client for web API
    └── formatters.ts  # Console output formatting
```

**Dependencies:**
- `@roast/db` - Data access (MetaEvaluationRepository)
- `@roast/ai` - LLM judging logic (scoreComments, rankVersions)

## Requirements

1. Set `DATABASE_URL` in a `.env` file or copy from `apps/web/.env.local`
2. For the **Baseline** action, the web app must be running on `localhost:3000`
