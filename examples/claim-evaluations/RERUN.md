# Re-running Claim Evaluations

Sometimes you want to add more LLM runs to an existing claim evaluation to get more data points. The rerun endpoint allows you to do this without creating a new claim evaluation.

## API Endpoint

```
POST /api/claim-evaluations/{id}/rerun
```

## Request Body

```json
{
  "additionalRuns": 5,           // Optional: Number of additional runs per model (1-10, default 1)
  "models": ["model-id-1"],      // Optional: Models to use (defaults to original models)
  "temperature": 0.8             // Optional: Temperature (defaults to original temperature)
}
```

## Response

```json
{
  "id": "claim-evaluation-id",
  "totalEvaluations": 15,        // Total evaluations after rerun
  "addedEvaluations": 5,         // Number of new evaluations added
  "summary": {
    "mean": 72.5                 // Recalculated mean across all evaluations
  }
}
```

## Behavior

1. **Fetches existing claim**: Retrieves the claim evaluation by ID
2. **Runs additional evaluations**: Executes new LLM calls with specified parameters
3. **Merges results**: Appends new evaluations to existing `rawOutput.evaluations[]` array
4. **Recalculates summary**: Updates `summary.mean` based on all evaluations (old + new)
5. **Updates database**: Saves merged results back to the same claim evaluation

## Examples

### Example 1: Add 5 more runs with original settings

```bash
curl -X POST https://your-domain.com/api/claim-evaluations/abc123/rerun \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "additionalRuns": 5
  }'
```

This will:
- Use the original models from the claim evaluation
- Use the original temperature
- Add 5 runs per model
- Merge new results with existing results

### Example 2: Add runs with specific models

```bash
curl -X POST https://your-domain.com/api/claim-evaluations/abc123/rerun \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "additionalRuns": 3,
    "models": ["anthropic/claude-sonnet-4.5", "openai/gpt-5-mini"]
  }'
```

This will:
- Use only the specified models (ignoring original models)
- Add 3 runs per specified model
- Merge results

### Example 3: Add runs with different temperature

```bash
curl -X POST https://your-domain.com/api/claim-evaluations/abc123/rerun \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "additionalRuns": 10,
    "temperature": 0.3
  }'
```

This will use a lower temperature (more deterministic) for the additional runs.

## Use Cases

### 1. Getting More Data Points
Initial claim evaluation had 2 runs, but you want 10 total for better statistics:

```bash
# Initial: 2 runs per model = 4 evaluations
# Rerun with 8 additional runs
POST /api/claim-evaluations/{id}/rerun
{
  "additionalRuns": 8
}
# Result: 10 runs per model = 20 total evaluations
```

### 2. Testing Temperature Sensitivity
Run same claim with different temperatures to see how responses vary:

```bash
# Original: temperature 0.7
# Add runs with temperature 0.3
POST /api/claim-evaluations/{id}/rerun
{
  "additionalRuns": 5,
  "temperature": 0.3
}
```

### 3. Adding New Models
You want to test how a new model performs on existing claims:

```bash
POST /api/claim-evaluations/{id}/rerun
{
  "additionalRuns": 5,
  "models": ["x-ai/grok-4"]  // New model not in original evaluation
}
```

## Important Notes

1. **Ownership required**: You can only rerun claim evaluations you created
2. **Original data preserved**: Original evaluations are never modified
3. **Summary recalculated**: The `summary.mean` is recalculated across ALL evaluations (old + new)
4. **Timestamp updated**: The `updatedAt` field is updated when you rerun
5. **No versioning**: Results are merged into the same claim evaluation (no history/versions)
6. **Cost accumulates**: Each rerun costs money for LLM API calls

## Limits

- `additionalRuns`: 1-10 per request
- Maximum total evaluations: No hard limit, but be mindful of costs
- Rate limiting: Subject to standard API rate limits

## Alternative: Create Variations Instead

If you want to keep separate history or compare different configurations, consider creating a **variation** instead:

```yaml
claims:
  - claim: "SSRIs are effective for depression"
    variationOf: "original-claim-id"
    runs: 10
    temperature: 0.8
    submitterNotes: "Additional runs with higher temperature"
```

This creates a new claim evaluation linked to the original, keeping all data separate.

## Comparison: Rerun vs Variation

| Feature | Rerun | Variation |
|---------|-------|-----------|
| Merges with original | ✅ Yes | ❌ No |
| Keeps history | ❌ No | ✅ Yes |
| Separate entry | ❌ No | ✅ Yes |
| Can compare settings | ❌ No | ✅ Yes |
| Simple to analyze | ✅ Yes | ❌ No |
| Use case | "Get more data" | "Compare approaches" |
