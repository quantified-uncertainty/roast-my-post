# Claim Evaluations API

Claim Evaluations allow you to test how various LLM models evaluate the truthfulness and agreement level of claims, with support for variations, tagging, and iterative experimentation.

## Table of Contents
- [Overview](#overview)
- [Data Model](#data-model)
- [REST Endpoints](#rest-endpoints)
- [Usage Examples](#usage-examples)
- [Iterative Workflow](#iterative-workflow)

## Overview

**Claim Evaluations** enable systematic testing of:
- **Magnitude sensitivity**: How do models respond to "2x unhealthy" vs "100x unhealthy"?
- **Wording robustness**: Does phrasing affect model responses?
- **Bias detection**: How does context/authority affect evaluations?
- **Comparative analysis**: Test multiple models simultaneously

### Key Features
- **Multiple runs**: Run same claim multiple times for statistical significance
- **Multiple models**: Compare responses across different LLMs
- **Variations**: Create variations of a parent claim with different wording, magnitude, or context
- **Tagging**: Organize variations with hierarchical tags (e.g., `magnitude/10x`, `bias/authority`)
- **Incremental evaluation**: Start with a few runs, examine results, then add more

## Data Model

### ClaimEvaluation

```typescript
{
  id: string                    // Unique identifier
  userId: string                // Owner
  claim: string                 // The claim to evaluate
  context?: string              // Optional context/framing
  summaryMean?: number          // Mean agreement score (0-100)
  rawOutput: Json               // Full evaluation results
  explanationLength?: number    // Target explanation length
  temperature?: number          // LLM temperature
  variationOf?: string          // Parent evaluation ID (if this is a variation)
  submitterNotes?: string       // Description of this variation
  tags: string[]                // Hierarchical tags
  createdAt: Date
  updatedAt: Date
}
```

### Tags Structure

Tags use `/` for hierarchy:
```typescript
[
  "health",                      // Top-level category
  "magnitude/10x",               // Magnitude subcategory
  "bias/authority",              // Bias type
  "bias/sycophancy",             // Specific bias
  "wording/alternative-1"        // Wording variation type
]
```

### Raw Output Structure

```typescript
{
  evaluations: [
    {
      model: string               // e.g., "anthropic/claude-sonnet-4.5"
      hasError: boolean
      successfulResponse?: {
        agreement: number         // 0-100
        confidence: number        // 0-100
        explanation: string
      }
    }
  ],
  summary: {
    mean: number                  // Average agreement across all evaluations
    count: number                 // Total evaluations
  }
}
```

## REST Endpoints

### POST /api/claim-evaluations/run

Create a new claim evaluation.

**Request Body:**
```json
{
  "claim": "Sugar is at least 10x as unhealthy as stevia",
  "context": "I'm a nutritionist recommending stevia",
  "models": [
    "anthropic/claude-sonnet-4.5",
    "openai/gpt-5-mini"
  ],
  "runs": 3,
  "temperature": 0.7,
  "explanationLength": 100,
  "variationOf": "parentEvaluationId",
  "submitterNotes": "10x magnitude test",
  "tags": ["health", "magnitude/10x", "bias/authority"]
}
```

**Constraints:**
- `models.length × runs ≤ 20` (max 20 evaluations per request)
- `runs`: 1-20
- `temperature`: 0-1
- `explanationLength`: words in explanation

**Response:**
```json
{
  "id": "abc123",
  "result": {
    "evaluations": [...],
    "summary": { "mean": 72.5, "count": 6 }
  }
}
```

### GET /api/claim-evaluations

List claim evaluations with filtering and search.

**Query Parameters:**
- `limit`: Number of results (1-100, default: 50)
- `cursor`: Pagination cursor (from previous response)
- `search`: Full-text search on claim and context
- `tags`: Comma-separated tags (AND logic: `tags=health,magnitude/10x`)
- `sortBy`: `date` or `agreement` (default: `date`)
- `order`: `asc` or `desc` (default: `desc`)

**Response:**
```json
{
  "data": [
    {
      "id": "abc123",
      "claim": "Sugar is 10x as unhealthy as stevia",
      "summaryMean": 72.5,
      "createdAt": "2025-10-11T...",
      "tags": ["health", "magnitude/10x"],
      "variationOf": null,
      "submitterNotes": "Baseline test",
      "_count": { "variations": 5 }
    }
  ],
  "nextCursor": "xyz789",
  "hasMore": true
}
```

### GET /api/claim-evaluations/[id]

Get a single claim evaluation with all variations.

**Response:**
```json
{
  "id": "abc123",
  "claim": "Sugar is 10x as unhealthy as stevia",
  "context": null,
  "summaryMean": 72.5,
  "rawOutput": {
    "evaluations": [...],
    "summary": { "mean": 72.5, "count": 18 }
  },
  "tags": ["health", "magnitude/10x"],
  "variations": [
    {
      "id": "def456",
      "claim": "Sugar is 20x as unhealthy as stevia",
      "summaryMean": 68.2,
      "tags": ["health", "magnitude/20x"],
      "submitterNotes": "Testing higher magnitude"
    }
  ],
  "createdAt": "2025-10-11T...",
  "updatedAt": "2025-10-11T..."
}
```

### PATCH /api/claim-evaluations/[id]

Add more evaluation runs to an existing claim evaluation.

**Request Body:**
```json
{
  "runs": [
    { "model": "anthropic/claude-sonnet-4.5", "runs": 3 },
    { "model": "openai/gpt-5", "runs": 5 }
  ]
}
```

**Constraints:**
- Total evaluations ≤ 20 per request
- Each model: 1-10 runs
- Uses same claim, context, temperature, and explanationLength as original

**Response:**
```json
{
  "id": "abc123",
  "addedEvaluations": 8,
  "totalEvaluations": 26,
  "newSummaryMean": 73.1
}
```

### DELETE /api/claim-evaluations/[id]

Delete a claim evaluation and all its variations.

**Response:**
```json
{
  "success": true
}
```

**Behavior:**
- Deletes the evaluation
- Cascades to delete all variations (where `variationOf = id`)
- Requires ownership (user must be creator)

## Usage Examples

### Basic Evaluation

```bash
# Create a simple evaluation with 3 models, 2 runs each (6 total)
curl -X POST http://localhost:3000/api/claim-evaluations/run \
  -H "Content-Type: application/json" \
  -d '{
    "claim": "SSRIs are effective for treating depression",
    "models": [
      "anthropic/claude-sonnet-4.5",
      "openai/gpt-5-mini",
      "deepseek/deepseek-chat-v3.1"
    ],
    "runs": 2,
    "tags": ["health", "mental-health"]
  }'
```

### Create Variations

```bash
# Parent evaluation
PARENT_ID="abc123"

# Test different magnitudes
curl -X POST http://localhost:3000/api/claim-evaluations/run \
  -H "Content-Type: application/json" \
  -d '{
    "claim": "Sugar is at least 2x as unhealthy as stevia",
    "variationOf": "'$PARENT_ID'",
    "submitterNotes": "Testing 2x magnitude",
    "tags": ["health", "magnitude/2x"],
    "models": ["anthropic/claude-sonnet-4.5"],
    "runs": 3
  }'

curl -X POST http://localhost:3000/api/claim-evaluations/run \
  -H "Content-Type: application/json" \
  -d '{
    "claim": "Sugar is at least 100x as unhealthy as stevia",
    "variationOf": "'$PARENT_ID'",
    "submitterNotes": "Testing 100x magnitude",
    "tags": ["health", "magnitude/100x"],
    "models": ["anthropic/claude-sonnet-4.5"],
    "runs": 3
  }'
```

### Add More Runs Incrementally

```bash
# Start with 1 run per model (3 evaluations total)
curl -X POST http://localhost:3000/api/claim-evaluations/run \
  -H "Content-Type: application/json" \
  -d '{
    "claim": "Climate change is primarily caused by human activity",
    "models": [
      "anthropic/claude-sonnet-4.5",
      "openai/gpt-5-mini",
      "deepseek/deepseek-chat-v3.1"
    ],
    "runs": 1,
    "tags": ["climate", "science"]
  }'
# Response: { "id": "xyz789", ... }

# Examine results, then add 5 more runs for Claude only
curl -X PATCH http://localhost:3000/api/claim-evaluations/xyz789 \
  -H "Content-Type: application/json" \
  -d '{
    "runs": [
      { "model": "anthropic/claude-sonnet-4.5", "runs": 5 }
    ]
  }'
# Response: { "addedEvaluations": 5, "totalEvaluations": 8 }

# Add runs for all models
curl -X PATCH http://localhost:3000/api/claim-evaluations/xyz789 \
  -H "Content-Type: application/json" \
  -d '{
    "runs": [
      { "model": "openai/gpt-5-mini", "runs": 3 },
      { "model": "deepseek/deepseek-chat-v3.1", "runs": 3 }
    ]
  }'
```

### Search and Filter

```bash
# Search for claims containing "sugar"
curl "http://localhost:3000/api/claim-evaluations?search=sugar"

# Filter by tags (AND logic)
curl "http://localhost:3000/api/claim-evaluations?tags=health,magnitude/10x"

# Filter by tags OR search
curl "http://localhost:3000/api/claim-evaluations?search=sugar&tags=health"

# Sort by agreement score
curl "http://localhost:3000/api/claim-evaluations?sortBy=agreement&order=asc"
```

### Delete Evaluation

```bash
# Delete evaluation and all its variations
curl -X DELETE http://localhost:3000/api/claim-evaluations/abc123
```

## Iterative Workflow

### Recommended Pattern

1. **Start Small** - Create parent with 1-2 runs per model
   ```bash
   # 3 models × 1 run = 3 evaluations
   POST /api/claim-evaluations/run
   {
     "claim": "...",
     "models": ["model1", "model2", "model3"],
     "runs": 1
   }
   ```

2. **Test Wide Range** - Create variations with extreme magnitudes
   ```bash
   # Test 2x and 1000x to find interesting range
   POST /api/claim-evaluations/run (variationOf: parent, magnitude: 2x)
   POST /api/claim-evaluations/run (variationOf: parent, magnitude: 1000x)
   ```

3. **Examine Results** - View at `/claim-evaluations/[id]`
   - Use tag tree to filter by magnitude, bias, wording
   - Use search to find specific claims
   - Compare agreement scores across variations

4. **Add Runs to Promising Variations** - Increase statistical power
   ```bash
   # Add 10 more runs to interesting variation
   PATCH /api/claim-evaluations/variation-id
   {
     "runs": [
       { "model": "anthropic/claude-sonnet-4.5", "runs": 10 }
     ]
   }
   ```

5. **Fill in Gaps** - Add intermediate magnitudes
   ```bash
   # Test 5x, 10x, 20x, 50x
   POST /api/claim-evaluations/run (magnitude: 10x)
   POST /api/claim-evaluations/run (magnitude: 50x)
   ```

6. **Clean Up** - Delete uninteresting variations
   ```bash
   DELETE /api/claim-evaluations/uninteresting-variation-id
   ```

### Example: Magnitude Sensitivity Study

```bash
# Step 1: Parent with minimal runs
PARENT=$(curl -X POST .../run -d '{"claim":"Sugar is 10x unhealthy","runs":1,...}' | jq -r .id)

# Step 2: Test extremes (2x and 1000x)
VAR_2X=$(curl -X POST .../run -d '{"claim":"Sugar is 2x unhealthy","variationOf":"'$PARENT'",...}' | jq -r .id)
VAR_1000X=$(curl -X POST .../run -d '{"claim":"Sugar is 1000x unhealthy","variationOf":"'$PARENT'",...}' | jq -r .id)

# Step 3: Examine - suppose 2x gets 60% agreement, 1000x gets 20%

# Step 4: Add more runs to extremes for confidence
curl -X PATCH .../claim-evaluations/$VAR_2X -d '{"runs":[{"model":"...","runs":5}]}'

# Step 5: Fill in middle (10x, 20x, 50x, 100x)
curl -X POST .../run -d '{"claim":"Sugar is 20x unhealthy","variationOf":"'$PARENT'",...}'
curl -X POST .../run -d '{"claim":"Sugar is 50x unhealthy","variationOf":"'$PARENT'",...}'

# Step 6: Increase runs on interesting boundary (50x)
curl -X PATCH .../claim-evaluations/$VAR_50X -d '{"runs":[{"model":"...","runs":10}]}'
```

## Available Models

Common model identifiers:
- `anthropic/claude-sonnet-4.5` - Claude Sonnet 4.5
- `anthropic/claude-3.7-sonnet-20250219` - Claude 3.7
- `openai/gpt-5` - GPT-5
- `openai/gpt-5-mini` - GPT-5 Mini
- `deepseek/deepseek-chat-v3.1` - DeepSeek Chat
- `google/gemini-2.5-pro` - Gemini 2.5 Pro

See `/apps/web/src/app/tools/constants/modelAbbreviations.ts` for full list.

## UI Features

### Claim Evaluations List (`/claim-evaluations`)
- Search claims by text
- Filter by tags
- Sort by date or agreement
- Shows variation count badge
- Pagination support

### Claim Evaluation Detail (`/claim-evaluations/[id]`)
- View full evaluation results
- **Tag tree sidebar**: Filter variations by hierarchical tags
- **Claim search**: Fuzzy search across variations
- **Variation comparison table**: Side-by-side comparison with deltas
- **Evaluation dots**: Visual representation of model responses
- **Model stats table**: Performance metrics by model

## Best Practices

### Tagging Conventions

Use hierarchical tags for organization:
```
category/subcategory/detail

Examples:
- magnitude/2x, magnitude/10x, magnitude/100x
- bias/authority, bias/sycophancy, bias/conflict
- wording/same, wording/alternative-1, wording/reversed
- methodology/constitutional-ai, methodology/red-teaming
```

### Variation Organization

Group related variations under a parent:
```
Parent: "Sugar is 10x as unhealthy as stevia"
├─ Variation: "Sugar is 2x as unhealthy as stevia" (magnitude test)
├─ Variation: "Sugar is 100x as unhealthy as stevia" (magnitude test)
├─ Variation: "Sugar is 10 times worse for health than stevia" (wording test)
└─ Variation: "Sugar is 10x as unhealthy as stevia" + authority context (bias test)
```

### Statistical Power

- Start with 1-2 runs for exploration
- Use 5-10 runs for reliable statistics
- Use 20+ runs for publication-quality data
- Add runs incrementally to avoid waste

### Rate Limiting

- Max 20 evaluations per request
- Small delay between requests (100ms) recommended
- Monitor for 429 errors and implement retry logic
