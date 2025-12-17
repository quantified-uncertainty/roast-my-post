# Meta-Evaluation Tools

CLI tools for evaluating agent output quality using LLM-as-judge.

## Two Evaluation Modes

**Scoring** - Rate a single output on multiple quality dimensions (1-10 each)
- Use for: monitoring quality over time, identifying weak spots

**Ranking** - Compare N versions, rank them relatively
- Use for: A/B testing, tracking improvement across agent versions
- More reliable than absolute scoring (LLMs better at relative comparison)

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

## CLI Commands

### Score a single evaluation version

```bash
pnpm --filter @roast/meta-evals run score --version <evaluationVersionId>
```

### Score a batch by tracking ID

```bash
pnpm --filter @roast/meta-evals run score --batch <trackingId> --limit 5
```

Add `--save` to persist results to the database.

### Compare two batches (A/B test)

```bash
pnpm --filter @roast/meta-evals run compare --baseline <trackingId> --candidate <trackingId>
```

### Compare specific versions (N-way)

```bash
pnpm --filter @roast/meta-evals run compare --versions <id1> <id2> <id3>
```

## Ranking Hierarchy

When comparing outputs, the judge uses this strict hierarchy:

1. **VALIDITY** - Real issue? Hallucinations lose automatically
2. **UTILITY** - More actionable? (if validity tied)
3. **TONE** - More constructive? (final tiebreaker)

## Example Workflow

```bash
# 1. Run baseline agent on test docs (uses existing batch API)
curl -X POST /api/evaluators/{agentId}/eval-batch \
  -d '{"documentIds": [...], "trackingId": "baseline-v1"}'

# 2. Make agent changes, run again
curl -X POST /api/evaluators/{agentId}/eval-batch \
  -d '{"documentIds": [...], "trackingId": "candidate-v2"}'

# 3. Run comparison
pnpm --filter @roast/meta-evals run compare --baseline baseline-v1 --candidate candidate-v2
```

## Package Structure

The core meta-eval logic lives in `@roast/ai` (reusable from app):

```
internal-packages/ai/src/meta-eval/
├── index.ts           # Public exports
├── types.ts           # Dimensions, types
├── scoreComments.ts   # Score single output
├── rankVersions.ts    # N-way comparison
└── prompts/           # LLM prompts
```

Results are stored in the `MetaEvaluation` table.
