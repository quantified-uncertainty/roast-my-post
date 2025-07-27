import { Anthropic } from '@anthropic-ai/sdk';
import { createAnthropicClient, ANALYSIS_MODEL } from '@/types/openai';
import { RichLLMInteraction } from '@/types/llm';
import { withRetry } from '@/lib/documentAnalysis/shared/retryUtils';

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
  tools?: Anthropic.Messages.Tool[];
  tool_choice?: Anthropic.Messages.ToolChoice;
  max_tokens?: number;
  temperature?: number;
  heliconeHeaders?: Record<string, string>;
  enablePromptCaching?: boolean; // Enable Anthropic prompt caching
  cacheSeed?: string; // Custom cache seed for Helicone response caching
}

export interface ClaudeCallResult {
  response: Anthropic.Message;
  interaction: RichLLMInteraction;
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

function isRetryableError(error: any): boolean {
  // Check if this is an Anthropic API error
  if (error?.status) {
    const status = error.status;
    // Retry on rate limits (429) and server errors (5xx)
    return status === 429 || (status >= 500 && status < 600);
  }
  
  // Check for network/timeout errors
  if (error?.code) {
    const code = error.code;
    return code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ENOTFOUND';
  }
  
  return false;
}

/**
 * Centralized Claude API wrapper that automatically handles:
 * - Helicone integration via createAnthropicClient()
 * - LLM interaction tracking with RichLLMInteraction format
 * - Consistent error handling and token counting
 * - Model configuration centralization
 * - Automatic retry with exponential backoff for retryable errors
 */
export async function callClaude(
  options: ClaudeCallOptions,
  previousInteractions?: RichLLMInteraction[]
): Promise<ClaudeCallResult> {
  const startTime = Date.now();
  
  // If a cache seed is provided, add it to the headers
  const heliconeHeaders = options.cacheSeed ? {
    ...options.heliconeHeaders,
    'Helicone-Cache-Seed': options.cacheSeed
  } : options.heliconeHeaders;
  
  const anthropic = createAnthropicClient(heliconeHeaders);
  
  // Use centralized model config if not specified
  const model = options.model || MODEL_CONFIG.analysis;
  
  // Make API call with manual retry logic for retryable errors only
  let response: Anthropic.Messages.Message;
  let lastError: any = null;
  const maxRetries = 3;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Add delay between retries (exponential backoff)
      if (attempt > 1) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const requestOptions: any = {
        model,
        max_tokens: options.max_tokens || 4000,
        temperature: options.temperature ?? 0,
        messages: options.messages
      };
      
      if (options.system) {
        if (options.enablePromptCaching) {
          // Add cache control for system prompt when caching is enabled
          requestOptions.system = [
            {
              type: "text",
              text: options.system,
              cache_control: { type: "ephemeral" }
            }
          ];
        } else {
          requestOptions.system = options.system;
        }
      }
      
      if (options.tools) {
        if (options.enablePromptCaching) {
          // Add cache control for tools when caching is enabled
          requestOptions.tools = options.tools.map(tool => ({
            ...tool,
            cache_control: { type: "ephemeral" }
          }));
        } else {
          requestOptions.tools = options.tools;
        }
      }
      
      if (options.tool_choice) requestOptions.tool_choice = options.tool_choice;
      
      const result = await anthropic.messages.create(requestOptions);
      
      // Validate response structure
      if (!result || !result.content || !result.usage) {
        throw new Error('Malformed response from Claude API');
      }
      
      response = result;
      break; // Success, exit retry loop
      
    } catch (error) {
      lastError = error;
      
      // If error is not retryable, throw immediately
      if (!isRetryableError(error)) {
        throw error;
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Otherwise, continue to next retry attempt
    }
  }
  
  if (!response!) {
    throw lastError || new Error('Max retries exhausted');
  }

  // Automatically create interaction with proper format
  const interaction: RichLLMInteraction = {
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
    toolSchema: Anthropic.Messages.Tool.InputSchema;
  },
  previousInteractions?: RichLLMInteraction[]
): Promise<ClaudeCallResult & { toolResult: T }> {
  const toolOptions: ClaudeCallOptions = {
    ...options,
    tools: [{
      name: options.toolName,
      description: options.toolDescription,
      input_schema: options.toolSchema
    }],
    tool_choice: { type: "tool", name: options.toolName },
    cacheSeed: options.cacheSeed // Pass through cache seed
  };

  const result = await callClaude(toolOptions, previousInteractions);
  
  // Extract tool result
  const toolUse = result.response.content.find((c): c is Anthropic.Messages.ToolUseBlock => 
    c.type === "tool_use"
  );
  if (!toolUse) {
    throw new Error('No tool use found in response');
  }
  if (toolUse.name !== options.toolName) {
    throw new Error(`Expected tool use for ${options.toolName}, got ${toolUse.name}`);
  }

  return {
    ...result,
    toolResult: toolUse.input as T
  };
}