# Bulk Claim Evaluations with YAML

This directory contains examples of YAML-based bulk claim evaluation requests.

## Overview

The YAML bulk operations system allows you to:
- Create multiple claim evaluations in a single request
- Use **variables** for reusable values (contexts, tags, model lists, etc.)
- Define **templates** for common claim configurations
- Track **variations** of claims using index or ID references
- Compress configuration by avoiding repetition
- **Re-run existing claims** to add more LLM evaluations (see [RERUN.md](./RERUN.md))

## YAML Structure

```yaml
# Optional: Define reusable variables
variables:
  my_context: "Some context string"
  my_tags: ["tag1", "tag2"]
  my_models: ["anthropic/claude-sonnet-4.5", "openai/gpt-5-mini"]

# Optional: Define claim templates
templates:
  my_template:
    context: "{{my_context}}"
    models: "{{my_models}}"
    tags: "{{my_tags}}"
    temperature: 0.7
    runs: 1

# Required: Array of claims to evaluate
claims:
  - claim: "My claim statement"
    template: my_template  # Optional: reference a template
    # Any field can override template values
    submitterNotes: "Additional notes"
    variationOf: 0  # Optional: index or ID of parent claim
```

## Variable Substitution

Use `{{VARIABLE_NAME}}` syntax to reference variables:

```yaml
variables:
  shared_context: "In 2025 healthcare"
  common_tags: ["healthcare", "2025"]

claims:
  - claim: "SSRIs work"
    context: "{{shared_context}}"  # Expands to "In 2025 healthcare"
    tags: "{{common_tags}}"        # Expands to ["healthcare", "2025"]
```

### Supported Variable Types
- **Strings**: `"{{my_string}}"`
- **Numbers**: `{{my_number}}`
- **Booleans**: `{{my_bool}}`
- **Arrays**: `{{my_array}}`
- **Objects**: `{{my_object}}`

**Note**: For inline string substitution (e.g., `"Context: {{VAR}}"`), the variable must be a string, number, or boolean. Arrays and objects can only be used as complete field values.

## Templates

Templates define reusable claim configurations:

```yaml
templates:
  healthcare_eval:
    context: "In 2025 healthcare research"
    models: ["anthropic/claude-sonnet-4.5"]
    runs: 2
    temperature: 0.7
    tags: ["healthcare"]

claims:
  - claim: "SSRIs are effective"
    template: healthcare_eval
    # Can override any template field
    runs: 1
```

## Variations

Track related claims using `variationOf`:

```yaml
claims:
  - claim: "Exercise improves mental health"
    tags: ["health", "exercise"]

  - claim: "Aerobic exercise improves mental health"
    variationOf: 0  # Index reference to first claim
    tags: ["health", "exercise", "aerobic"]

  - claim: "Strength training improves mental health"
    variationOf: 0  # Also references first claim
    tags: ["health", "exercise", "strength"]
```

**Index references**:
- Use integers (0, 1, 2, ...) to reference claims by position
- Parent claims must come before variations
- You can also use claim IDs as strings if you know them

## Available Fields

### Claim Fields
- `claim` (required): The claim statement to evaluate
- `context` (optional): Additional context about when/where the claim was made
- `models` (optional): Array of model IDs to use (defaults to top reasoning models)
- `runs` (optional): Number of independent runs per model (1-5, default 1)
- `temperature` (optional): Sampling temperature (0.0-1.0, default 0.7)
- `explanationLength` (optional): Max words for explanation (3-200, default 50)
- `promptTemplate` (optional): Custom prompt template with {{VARIABLE}} syntax
- `submitterNotes` (optional): Notes about this evaluation
- `tags` (optional): Array of tags for organization
- `variationOf` (optional): Index or ID of parent claim

## Examples

### 1. Simple Example
See `simple-example.yaml` - basic claims without variables or templates.

### 2. With Variables
See `with-variables.yaml` - using variables to avoid repetition.

### 3. With Templates
See `with-templates.yaml` - templates for maximum compression.

### 4. Variations
See `variations-example.yaml` - tracking claim variations.

## Usage

### API Endpoint
```bash
curl -X POST https://your-domain.com/api/claim-evaluations/bulk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "yaml": "variables:\n  context: \"2025\"\nclaims:\n  - claim: \"Test\"\n    context: \"{{context}}\""
  }'
```

Or with JSON directly:
```bash
curl -X POST https://your-domain.com/api/claim-evaluations/bulk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "json": {
      "claims": [
        {"claim": "Test claim", "runs": 1}
      ]
    }
  }'
```

### CLI Tool
```bash
# From the AI package
pnpm --filter @roast/ai run bulk-claims examples/claim-evaluations/simple-example.yaml

# Or directly with tsx
tsx internal-packages/ai/scripts/run-claim-bulk.ts examples/claim-evaluations/simple-example.yaml
```

## Response Format

The API returns:
```json
{
  "total": 5,
  "successful": 4,
  "failed": 1,
  "results": [
    {
      "index": 0,
      "success": true,
      "id": "abc123",
      "claim": "The claim text"
    },
    {
      "index": 1,
      "success": false,
      "error": "Error message",
      "claim": "The claim text"
    }
  ]
}
```

## Tips

1. **Start small**: Test with 1-2 claims before running large batches
2. **Use variables**: Define common values once, reference everywhere
3. **Use templates**: Create templates for different claim types
4. **Organize with tags**: Use consistent tagging for filtering later
5. **Track variations**: Use `variationOf` to maintain relationships
6. **Index carefully**: Remember that `variationOf` uses 0-based indexing

## Model IDs

Available models (from OpenRouter):
- `anthropic/claude-sonnet-4.5` - Claude Sonnet 4.5 (recommended)
- `openai/gpt-5-mini` - GPT-5 Mini
- `google/deepseek-chat-v3.1` - DeepSeek Chat V3.1
- `x-ai/grok-4` - Grok 4

See OpenRouter documentation for full list of available models.

## Re-running Existing Claims

Need more data for an existing claim? Use the rerun endpoint to add more LLM evaluations:

```bash
POST /api/claim-evaluations/{id}/rerun
{
  "additionalRuns": 5,
  "models": ["anthropic/claude-sonnet-4.5"],  // optional
  "temperature": 0.7                          // optional
}
```

This will:
- Add more LLM runs to the existing claim evaluation
- Merge new evaluations with existing ones
- Recalculate the summary statistics
- Update the same claim evaluation (no new entry created)

**See [RERUN.md](./RERUN.md) for complete documentation and examples.**
