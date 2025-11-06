import { Anthropic } from '@anthropic-ai/sdk';
import { createAnthropicClient } from '../utils/anthropic';
import { ANALYSIS_MODEL, RichLLMInteraction } from '../types';
import { withRetry } from '../utils/retryUtils';
import { getCurrentHeliconeHeaders } from '../helicone/simpleSessionManager';
import { logger } from '../shared/logger';
import { assertSystemNotPaused } from '@roast/db';

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
  timeout?: number; // Custom timeout in milliseconds
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

import { isApiError, type ApiError } from '../types/errors';

function isRetryableError(error: unknown): boolean {
  // Check if this is an API error with status code
  if (isApiError(error)) {
    const status = error.status;
    // Retry on rate limits (429) and server errors (5xx)
    if (status) {
      return status === 429 || (status >= 500 && status < 600);
    }
    
    // Check for network/timeout errors
    const code = error.code;
    if (code) {
      return code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ENOTFOUND';
    }
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
  // Check if system is paused before making API call
  await assertSystemNotPaused();

  const startTime = Date.now();

  // Merge provided headers with global session headers
  // Priority: provided headers > global session headers
  const globalHeaders = getCurrentHeliconeHeaders();
  const baseHeaders = {
    ...globalHeaders,
    ...options.heliconeHeaders
  };
  
  // If a cache seed is provided, add it to the headers
  const heliconeHeaders = options.cacheSeed ? {
    ...baseHeaders,
    'Helicone-Cache-Seed': options.cacheSeed
  } : baseHeaders;
  
  const anthropic = createAnthropicClient(heliconeHeaders);
  
  // Use centralized model config if not specified
  const model = options.model || MODEL_CONFIG.analysis;
  
  // Make API call with manual retry logic for retryable errors only
  let response: Anthropic.Messages.Message;
  let lastError: Error | null = null;
  const maxRetries = 3;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Add delay between retries (exponential backoff)
      if (attempt > 1) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const requestOptions: Anthropic.Messages.MessageCreateParams = {
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
      
      // Add timeout to prevent hanging indefinitely
      const DEFAULT_CLAUDE_TIMEOUT_MS = 180000; // 3 minutes default (should handle most cases)
      const timeoutMs = options.timeout || DEFAULT_CLAUDE_TIMEOUT_MS;
      let timeoutId: NodeJS.Timeout;
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Claude API call timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });
      
      const result = await Promise.race([
        anthropic.messages.create(requestOptions),
        timeoutPromise
      ]).finally(() => {
        // Clear timeout when either promise resolves/rejects
        clearTimeout(timeoutId);
      });
      
      // Validate response structure
      if (!result || !result.content || !result.usage) {
        throw new Error('Malformed response from Claude API');
      }
      
      response = result;
      
      // Check for max_tokens issue - log as critical but don't throw
      if (response.stop_reason === 'max_tokens') {
        const errorMessage = 
          `⚠️ CRITICAL: Claude hit max_tokens limit (${options.max_tokens || 4000} tokens) and response may be incomplete!\n` +
          `This often means the response was truncated and tool calls may have failed.\n` +
          `Consider increasing max_tokens for this operation.\n` +
          `Model: ${model}`;
        
        logger.error('[Claude] Max tokens limit hit - response likely truncated', {
          max_tokens: options.max_tokens || 4000,
          model,
          stop_reason: response.stop_reason,
          error: errorMessage
        });
        
        // Log the warning - we can't modify the response object directly
        // Callers should check stop_reason === 'max_tokens' to detect truncation
      }
      
      break; // Success, exit retry loop
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
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
  
  // Check for max_tokens issue in tool calls specifically
  if (result.response.stop_reason === 'max_tokens') {
    logger.error('[Claude] Tool call truncated due to max_tokens limit', {
      tool: options.toolName,
      max_tokens: options.max_tokens || 4000,
      stop_reason: result.response.stop_reason
    });
    
    // For tool calls, we need to throw as the tool response is unusable
    throw new Error(
      `⚠️ TOOL FAILURE: Tool "${options.toolName}" response was truncated at ${options.max_tokens || 4000} tokens.\n` +
      `The tool cannot function with incomplete data.\n` +
      `Action required: Increase max_tokens for this tool or reduce input size.\n` +
      `This is a known issue that needs configuration adjustment.`
    );
  }
  
  // Extract tool result
  const toolUse = result.response.content.find((c): c is Anthropic.Messages.ToolUseBlock => 
    c.type === "tool_use"
  );
  if (!toolUse) {
    // Enhanced error message to check for max_tokens issue
    const stopReason = result.response.stop_reason as string;
    if (stopReason === 'max_tokens') {
      throw new Error(
        `No tool use found - response was truncated due to max_tokens limit (${options.max_tokens || 4000} tokens)`
      );
    }
    throw new Error('No tool use found in response');
  }
  if (toolUse.name !== options.toolName) {
    throw new Error(`Expected tool use for ${options.toolName}, got ${toolUse.name}`);
  }

  // Check if tool input is empty or malformed (often happens with max_tokens)
  if (!toolUse.input || Object.keys(toolUse.input).length === 0) {
    const stopReason = result.response.stop_reason as string;
    if (stopReason === 'max_tokens') {
      logger.error('[Claude] Tool returned empty due to max_tokens truncation', {
        tool: options.toolName,
        max_tokens: options.max_tokens || 4000,
        stop_reason: stopReason
      });
      
      throw new Error(
        `⚠️ TOOL FAILURE: Tool "${options.toolName}" returned empty result due to truncation.\n` +
        `Response was cut off at ${options.max_tokens || 4000} tokens.\n` +
        `This is why the tool appears to return nothing.\n` +
        `SOLUTION: Increase max_tokens in the tool implementation or reduce input size.`
      );
    }
    throw new Error(`Tool "${options.toolName}" returned empty or invalid input`);
  }

  return {
    ...result,
    toolResult: toolUse.input as T
  };
}