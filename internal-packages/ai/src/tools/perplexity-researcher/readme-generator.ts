/**
 * Programmatic README generator for Perplexity Research Tool
 */

import {
  generateToolHeader,
  generateToolsUsedSection,
  getToolDependencies,
} from "../utils/readme-helpers";
import { perplexityResearchTool } from "./index";

export function generateReadme(): string {
  const dependencies = getToolDependencies(perplexityResearchTool);
  const header = generateToolHeader(perplexityResearchTool);
  const toolsSection = generateToolsUsedSection(dependencies);

  return `${header}

${toolsSection}## How It Works

Uses GPT-6 Luna by default, or another selected OpenRouter model with web search, to perform web-enhanced research. Searches current information beyond AI training data and returns structured results with summaries, key findings, and source citations (1-10 sources with titles, URLs, snippets). Includes fallback mechanisms for reliability.

## Limitations

Depends on OpenRouter and search engine availability. Quality varies by query complexity and available sources. Cannot access paywalled or restricted content.

## Technical Details

- Defaults to openai/gpt-6-luna with the OpenRouter web plugin (Perplexity search engine)
- Choose any compatible OpenRouter model using the model input or Agentic profile research selector
- Uses the existing OPENROUTER_API_KEY; no separate Perplexity key
- Sonar models keep their built-in web search
- Configurable focus areas: general, academic, news, technical, market
- Returns 1-10 sources per query (configurable)
- Fallback: structured research → basic query with parsing
- Primary use: Supporting fact-checking and forecasting tools
`;
}
