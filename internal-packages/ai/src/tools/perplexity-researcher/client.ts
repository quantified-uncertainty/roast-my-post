/** Web research through OpenRouter; the legacy class name remains API compatible. */
import { DEFAULT_RESEARCH_MODEL, supportsSamplingTemperature } from '../../modelDefaults';
import { callOpenRouter } from '../../utils/openrouter';
import type { OpenRouterCitation, OpenRouterMessage, OpenRouterUsage } from '../../utils/openrouter-types';

export interface PerplexityOptions {
  model?: string;
  maxTokens?: number;
  maxSources?: number;
  temperature?: number;
  systemPrompt?: string;
  jsonOutput?: boolean;
}

export interface ResearchResponse {
  content: string;
  usage?: OpenRouterUsage;
  citations?: OpenRouterCitation[];
}

export class PerplexityClient {
  constructor(private readonly apiKey?: string) {}

  async query(question: string, options: PerplexityOptions = {}): Promise<ResearchResponse> {
    const model = options.model ?? DEFAULT_RESEARCH_MODEL;
    const messages: OpenRouterMessage[] = [];
    if (options.systemPrompt) messages.push({ role: 'system', content: options.systemPrompt });
    messages.push({ role: 'user', content: question });
    const completion = await callOpenRouter({
      model,
      messages,
      max_tokens: options.maxTokens ?? 4000,
      ...(options.jsonOutput && { response_format: { type: "json_object" as const } }),
      ...(supportsSamplingTemperature(model) && { temperature: options.temperature ?? 0.3 }),
      // Sonar already performs search; other models use OpenRouter's managed search engine.
      ...(!model.startsWith('perplexity/') && {
        plugins: [{ id: 'web' as const, engine: 'perplexity' as const, max_results: options.maxSources ?? 5 }],
      }),
      ...(model === DEFAULT_RESEARCH_MODEL && { reasoning: { effort: 'low' as const } }),
    }, { apiKey: this.apiKey });
    const message = completion.choices?.[0]?.message;
    if (!message?.content) throw new Error(`No research response from ${model}`);
    return { content: message.content, usage: completion.usage, citations: message.annotations };
  }
}
