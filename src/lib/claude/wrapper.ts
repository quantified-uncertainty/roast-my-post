import { Anthropic } from '@anthropic-ai/sdk';
import { createAnthropicClient, ANALYSIS_MODEL } from '@/types/openai';
import { PluginLLMInteraction } from '@/types/llm';

// Centralized model configuration
export const MODEL_CONFIG = {
  analysis: ANALYSIS_MODEL,
  routing: 'claude-3-haiku-20240307', // Faster model for routing decisions
  forecasting: ANALYSIS_MODEL,
} as const;

export interface ClaudeCallOptions {
  model?: string;
  system?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  tools?: any[];
  tool_choice?: any;
  max_tokens?: number;
  temperature?: number;
}

export interface ClaudeCallResult {
  response: Anthropic.Message;
  interaction: PluginLLMInteraction;
}

function buildPromptString(
  system: string | undefined,
  messages: Array<{ role: string; content: string }>
): string {
  let prompt = '';
  if (system) {
    prompt += `SYSTEM: ${system}\n\n`;
  }
  
  messages.forEach(msg => {
    prompt += `${msg.role.toUpperCase()}: ${msg.content}\n`;
  });
  
  return prompt.trim();
}

/**
 * Centralized Claude API wrapper that automatically handles:
 * - Helicone integration via createAnthropicClient()
 * - LLM interaction tracking with PluginLLMInteraction format
 * - Consistent error handling and token counting
 * - Model configuration centralization
 */
export async function callClaude(
  options: ClaudeCallOptions,
  previousInteractions?: PluginLLMInteraction[]
): Promise<ClaudeCallResult> {
  const startTime = Date.now();
  const anthropic = createAnthropicClient();
  
  // Use centralized model config if not specified
  const model = options.model || MODEL_CONFIG.analysis;
  
  const response = await anthropic.messages.create({
    model,
    max_tokens: options.max_tokens || 4000,
    temperature: options.temperature ?? 0,
    system: options.system,
    messages: options.messages,
    tools: options.tools,
    tool_choice: options.tool_choice
  });

  // Automatically create interaction with proper format
  const interaction: PluginLLMInteraction = {
    model,
    prompt: buildPromptString(options.system, options.messages),
    response: JSON.stringify(response.content),
    tokensUsed: {
      prompt: response.usage.input_tokens,
      completion: response.usage.output_tokens,
      total: response.usage.input_tokens + response.usage.output_tokens
    },
    timestamp: new Date(),
    duration: Date.now() - startTime
  };

  // Auto-accumulate if previous interactions array provided
  if (previousInteractions) {
    previousInteractions.push(interaction);
  }

  return { response, interaction };
}

/**
 * Convenience wrapper for tool use patterns
 */
export async function callClaudeWithTool<T>(
  options: Omit<ClaudeCallOptions, 'tool_choice'> & {
    toolName: string;
    toolDescription: string;
    toolSchema: any;
  },
  previousInteractions?: PluginLLMInteraction[]
): Promise<ClaudeCallResult & { toolResult: T }> {
  const toolOptions: ClaudeCallOptions = {
    ...options,
    tools: [{
      name: options.toolName,
      description: options.toolDescription,
      input_schema: options.toolSchema
    }],
    tool_choice: { type: "tool", name: options.toolName }
  };

  const result = await callClaude(toolOptions, previousInteractions);
  
  // Extract tool result
  const toolUse = result.response.content.find((c: any) => c.type === "tool_use") as any;
  if (!toolUse || toolUse.name !== options.toolName) {
    throw new Error(`Expected tool use for ${options.toolName}`);
  }

  return {
    ...result,
    toolResult: toolUse.input as T
  };
}