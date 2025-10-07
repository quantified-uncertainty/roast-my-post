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
- **${OPENROUTER_MODELS.DEEPSEEK_CHAT_V3_1_FREE}** - DeepSeek Chat V3.1
- **${OPENROUTER_MODELS.GROK_4}** - Grok 4

## Output

- **results**: Array of model evaluations, each containing:
  - \`model\`: Model identifier (e.g., "anthropic/claude-3-haiku")
  - \`provider\`: Provider name (e.g., "anthropic", "openai")
  - \`agreement\`: Score from 0-100 (0=disagree, 100=agree)
  - \`confidence\`: Score from 0-100 (0=very uncertain, 100=very confident)
  - \`reasoning\`: Brief explanation (max words configurable, default 5)

## Technical Details

- All requests go through **OpenRouter** (not direct provider APIs)
- Helicone integration for request tracking and caching
- Parallel execution using \`Promise.allSettled()\`
- Failed model requests are filtered out silently
- Structured JSON responses ensure consistent format
- Custom models can be specified via the \`models\` parameter

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
  "results": [
    {
      "model": "anthropic/claude-3-haiku",
      "provider": "anthropic",
      "agreement": 15,
      "confidence": 85,
      "reasoning": "Unlikely growth rate"
    },
    {
      "model": "anthropic/claude-3-5-sonnet",
      "provider": "anthropic",
      "agreement": 20,
      "confidence": 90,
      "reasoning": "Historically implausible"
    }
    // ... other models
  ]
}
\`\`\`
`;
}
