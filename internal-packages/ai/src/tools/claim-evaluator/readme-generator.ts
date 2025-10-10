/**
 * Programmatic README generator for Claim Evaluator Tool
 */

import {
  generateToolHeader,
  generateToolsUsedSection,
  getToolDependencies,
} from "../utils/readme-helpers";
import { claimEvaluatorTool } from "./index";
import { OPENROUTER_MODELS } from "../../utils/openrouter";

export function generateReadme(): string {
  const dependencies = getToolDependencies(claimEvaluatorTool);
  const header = generateToolHeader(claimEvaluatorTool);
  const toolsSection = generateToolsUsedSection(dependencies);

  return `${header}

${toolsSection}## How It Works

Evaluates claims by polling multiple LLM models in parallel via OpenRouter. Each model independently rates its agreement with the claim (0-100) and provides brief reasoning.

## Default Models

- **${OPENROUTER_MODELS.CLAUDE_SONNET_4_5}** - Claude Sonnet 4.5 (Latest)
- **${OPENROUTER_MODELS.GPT_5_MINI}** - GPT-5 Mini
- **${OPENROUTER_MODELS.DEEPSEEK_CHAT_V3_1}** - DeepSeek Chat V3.1
- **${OPENROUTER_MODELS.GROK_4}** - Grok 4

## Output

> **Note**: Each evaluation has a \`hasError\` boolean that determines its structure. When \`hasError\` is false, \`successfulResponse\` is present. When \`hasError\` is true, \`failedResponse\` is present.

- **evaluations**: Array of all model evaluations (both successful and failed). Each evaluation has these common fields:
  - \`hasError\`: Boolean indicating if evaluation failed (true) or succeeded (false)
  - \`model\`: Model identifier (e.g., "anthropic/claude-3-haiku")
  - \`provider\`: Provider name (e.g., "anthropic", "openai")
  - \`responseTimeMs\`: Time taken for LLM to respond (optional)
  - \`rawResponse\`: Full raw response from model (optional)
  - \`thinkingText\`: Extended thinking/reasoning for o1/o3 models (optional)
  - \`tokenUsage\`: Token usage statistics (optional)

**For successful evaluations (hasError: false):**
  - \`successfulResponse\`: Object containing:
    - \`agreement\`: Score from 0-100 (0=disagree, 100=agree)
    - \`confidence\`: Score from 0-100 (0=very uncertain, 100=very confident)
    - \`reasoning\`: Brief explanation (max words configurable, default 50)

**For failed evaluations (hasError: true):**
  - \`failedResponse\`: Object containing:
    - \`error\`: Error message
    - \`refusalReason\`: Categorized reason ('Safety', 'Policy', 'MissingData', 'Unclear', 'Error')
    - \`errorDetails\`: Additional error context (optional)

## Technical Details

- All requests go through **OpenRouter** (not direct provider APIs)
- Helicone integration for request tracking and caching
- Parallel execution using \`Promise.allSettled()\`
- Both successful and failed evaluations are included in results
- Structured JSON responses with \`hasError\` boolean and optional response fields
- Custom models can be specified via the \`models\` parameter
- Response times tracked for performance monitoring

## Use Cases

- **Fact-checking**: Get multi-model consensus on factual claims
- **Prediction evaluation**: Assess plausibility of forecasts
- **Claim validation**: Identify controversial or uncertain statements
- **Research**: Compare model perspectives on complex topics

## Example

**Input:**
\`\`\`json
{
  "claim": "The US economy will grow by 40% in the next 5 years"
}
\`\`\`

**Output:**
\`\`\`json
{
  "evaluations": [
    {
      "hasError": false,
      "model": "anthropic/claude-3-haiku",
      "provider": "anthropic",
      "responseTimeMs": 1234,
      "successfulResponse": {
        "agreement": 15,
        "confidence": 85,
        "reasoning": "Unlikely growth rate given historical economic data"
      }
    },
    {
      "hasError": false,
      "model": "anthropic/claude-3-5-sonnet",
      "provider": "anthropic",
      "responseTimeMs": 2156,
      "successfulResponse": {
        "agreement": 20,
        "confidence": 90,
        "reasoning": "Historically implausible; requires 7% annual growth"
      }
    },
    {
      "hasError": true,
      "model": "some-unavailable-model",
      "provider": "openai",
      "failedResponse": {
        "error": "Model evaluation timed out after 120s",
        "refusalReason": "Error"
      }
    }
    // ... other models
  ]
}
\`\`\`
`;
}
