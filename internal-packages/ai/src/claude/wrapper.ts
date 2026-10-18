import { Anthropic } from '@anthropic-ai/sdk';
import type { ReasoningEffort, LegacyThinkingConfig, AdaptiveThinkingConfig, ClaudeOutputConfig } from '../types/common';
import { DEFAULT_SEARCH_MODEL } from '../constants';
import { isAdaptiveClaude, requiresAutoToolChoice } from '../modelDefaults';
import { createAnthropicClient } from '../utils/anthropic';
import { ANALYSIS_MODEL, RichLLMInteraction } from '../types';
// Note: withRetry was deprecated in favor of inline retry logic
import { logger } from '../shared/logger';
import { throwIfProviderAccessError } from '../shared/providerErrors';
import { getRemainingTimeMs } from '../shared/jobContext';
import {
  UnifiedUsageMetrics,
  fromAnthropicUsage,
  AnthropicRawUsage
} from '../utils/usageMetrics';

// Centralized model configuration
export const MODEL_CONFIG = {
  analysis: ANALYSIS_MODEL,
  routing: DEFAULT_SEARCH_MODEL, // Faster model for routing decisions
  forecasting: ANALYSIS_MODEL,
} as const;

/** Extended thinking configuration */
export type ThinkingConfig = LegacyThinkingConfig;

export interface ClaudeCallOptions {
  model?: string;
  system?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  tools?: Anthropic.Messages.Tool[];
  tool_choice?: Anthropic.Messages.ToolChoice;
  max_tokens?: number;
  temperature?: number;
  enablePromptCaching?: boolean; // Enable Anthropic prompt caching
  timeout?: number; // Custom timeout in milliseconds
  /**
   * Use streaming internally to avoid the Anthropic SDK's non-streaming timeout
   * for long-running requests (e.g. high max_tokens with thinking enabled).
   * The caller still gets a normal ClaudeCallResult — streaming is transparent.
   */
  stream?: boolean;
  /**
   * Extended thinking mode configuration.
   * - true: Enable with default budget of 10000 tokens
   * - false/undefined: Disable extended thinking
   * - ThinkingConfig: Enable with custom budget_tokens
   * Note: Extended thinking requires temperature=1, so temperature is ignored when enabled.
   */
  thinking?: boolean | ThinkingConfig;
  reasoningEffort?: ReasoningEffort;
}

/** Actual API params as sent to Anthropic */
export interface ClaudeActualParams {
  model: string;
  temperature?: number;
  maxTokens: number;
  thinking?: ThinkingConfig | AdaptiveThinkingConfig;
  outputConfig?: ClaudeOutputConfig;
}

/** Forward-compatible body for Claude 5.5, absent from the pinned SDK's types. */
interface AdaptiveMessageParams extends Omit<Anthropic.Messages.MessageCreateParamsNonStreaming, 'thinking'> {
  thinking?: ClaudeActualParams['thinking'];
  output_config?: ClaudeActualParams['outputConfig'];
}

/** Response metrics from Claude API */
export interface ClaudeResponseMetrics {
  success: boolean;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  stopReason?: string;
  errorType?: string;
  errorMessage?: string;
  /** Full raw usage from Anthropic API */
  rawUsage?: AnthropicRawUsage;
}

export interface ClaudeCallResult {
  response: Anthropic.Message;
  interaction: RichLLMInteraction;
  /** Actual params sent to API - captured right before the call */
  actualParams: ClaudeActualParams;
  /** Response metrics */
  responseMetrics: ClaudeResponseMetrics;
  /** Unified usage metrics (includes calculated cost) */
  unifiedUsage?: UnifiedUsageMetrics;
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

import { isApiError } from '../types/errors';

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

  const anthropic = createAnthropicClient();
  
  // Use centralized model config if not specified
  const model = options.model || MODEL_CONFIG.analysis;
  
  // Make API call with manual retry logic for retryable errors only
  let response: Anthropic.Messages.Message;
  let _lastError: Error | null = null;
  const maxRetries = 3;
  let actualParams: ClaudeActualParams | undefined;
  let apiCallStartTime: number = 0;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Add delay between retries (exponential backoff)
      if (attempt > 1) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Determine if extended thinking is enabled (default: false for tool calls to save cost)
      // When thinking is enabled, temperature must be 1 and max_tokens must be > budget_tokens
      const thinkingEnabled = options.thinking === true || typeof options.thinking === 'object';
      const thinkingBudget = typeof options.thinking === 'object' && options.thinking.budget_tokens
        ? options.thinking.budget_tokens
        : 10000; // Default budget
      // Claude's temperature range is 0-1 (unlike some other providers that allow 0-2)
      // Cap any out-of-range values to prevent API errors
      const requestedTemp = options.temperature ?? 0;
      const effectiveTemperature = thinkingEnabled ? 1 : Math.min(Math.max(requestedTemp, 0), 1);
      // When thinking is enabled, max_tokens must be greater than budget_tokens
      const requestedMaxTokens = options.max_tokens || 4000;
      const adaptive = isAdaptiveClaude(model);
      const effectiveMaxTokens = thinkingEnabled && !adaptive
        ? Math.max(requestedMaxTokens, thinkingBudget + 1000)
        : requestedMaxTokens;
      const thinking: ClaudeActualParams['thinking'] = adaptive
        ? (thinkingEnabled ? { type: 'adaptive' } : { type: requiresAutoToolChoice(model) ? 'between_tools' : 'disabled' })
        : (thinkingEnabled ? { type: 'enabled', budget_tokens: thinkingBudget } : undefined);
      // Translate legacy token budgets into effort for models that removed manual budgets.
      const outputConfig: ClaudeActualParams['outputConfig'] = adaptive && thinkingEnabled
        ? { effort: options.reasoningEffort
          ? (options.reasoningEffort === 'minimal' || options.reasoningEffort === 'low' ? 'low' : options.reasoningEffort === 'medium' ? 'medium' : 'high')
          : (thinkingBudget <= 4096 ? 'low' : thinkingBudget <= 16000 ? 'medium' : 'high') }
        : undefined;
      const modernRequest: AdaptiveMessageParams = {
        model,
        max_tokens: effectiveMaxTokens,
        ...(!adaptive && { temperature: effectiveTemperature }),
        messages: options.messages,
        ...(thinking && { thinking }),
        ...(outputConfig && { output_config: outputConfig }),
      };
      // The SDK transports unknown fields unchanged; only its older TypeScript surface needs adapting.
      const requestOptions = modernRequest as Anthropic.Messages.MessageCreateParamsNonStreaming;
      actualParams = {
        model,
        ...(!adaptive && { temperature: effectiveTemperature }),
        maxTokens: effectiveMaxTokens,
        thinking,
        ...(outputConfig && { outputConfig }),
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
      
      if (options.tool_choice) {
        requestOptions.tool_choice = requiresAutoToolChoice(model) && options.tool_choice.type !== "none"
          ? { type: "auto" } : options.tool_choice;
      }
      
      // Add timeout to prevent hanging indefinitely
      // Use remaining job time if available, otherwise use provided/default timeout
      const DEFAULT_CLAUDE_TIMEOUT_MS = 180000; // 3 minutes default
      const remainingJobTime = getRemainingTimeMs();
      const requestedTimeout = options.timeout || DEFAULT_CLAUDE_TIMEOUT_MS;
      const timeoutMs = remainingJobTime !== undefined
        ? Math.min(remainingJobTime, requestedTimeout)
        : requestedTimeout;
      let timeoutId: NodeJS.Timeout;
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Claude API call timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      // Capture timing for telemetry
      apiCallStartTime = Date.now();

      let result: Anthropic.Messages.Message;
      if (options.stream) {
        // Use streaming to avoid SDK's non-streaming timeout for long requests
        const stream = anthropic.messages.stream(requestOptions);
        result = await Promise.race([
          stream.finalMessage(),
          timeoutPromise
        ]).finally(() => {
          clearTimeout(timeoutId);
        });
      } else {
        result = await Promise.race([
          anthropic.messages.create(requestOptions, { timeout: timeoutMs }),
          timeoutPromise
        ]).finally(() => {
          clearTimeout(timeoutId);
        });
      }
      
      // Response structure is validated by TypeScript types
      // result is guaranteed to have content and usage by Anthropic.Messages.Message type
      
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
      _lastError = error instanceof Error ? error : new Error(String(error));
      throwIfProviderAccessError(error);
      
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

  // TypeScript can't prove response is set (even though our logic guarantees it)
  // because the for loop could theoretically complete without breaking.
  // We know this is impossible because we always either break or throw.
  const finalResponse = response!;

  // Automatically create interaction with proper format
  const interaction: RichLLMInteraction = {
    model,
    prompt: buildPromptString(options.system, options.messages),
    response: JSON.stringify(finalResponse.content),
    tokensUsed: {
      prompt: finalResponse.usage.input_tokens,
      completion: finalResponse.usage.output_tokens,
      total: finalResponse.usage.input_tokens + finalResponse.usage.output_tokens
    },
    timestamp: new Date(),
    duration: Date.now() - startTime
  };

  // Auto-accumulate if previous interactions array provided
  if (previousInteractions) {
    previousInteractions.push(interaction);
  }

  // Build raw usage object for unified metrics
  const rawUsage: AnthropicRawUsage = {
    input_tokens: finalResponse.usage.input_tokens,
    output_tokens: finalResponse.usage.output_tokens,
    cache_creation_input_tokens: (finalResponse.usage as { cache_creation_input_tokens?: number }).cache_creation_input_tokens,
    cache_read_input_tokens: (finalResponse.usage as { cache_read_input_tokens?: number }).cache_read_input_tokens,
  };

  // Calculate latency
  const latencyMs = apiCallStartTime > 0 ? Date.now() - apiCallStartTime : Date.now() - startTime;

  // Build response metrics for telemetry
  const responseMetrics: ClaudeResponseMetrics = {
    success: true,
    latencyMs,
    inputTokens: finalResponse.usage.input_tokens,
    outputTokens: finalResponse.usage.output_tokens,
    cacheReadTokens: rawUsage.cache_read_input_tokens,
    cacheWriteTokens: rawUsage.cache_creation_input_tokens,
    stopReason: finalResponse.stop_reason || undefined,
    rawUsage,
  };

  // Build unified usage metrics (includes calculated cost)
  const unifiedUsage = fromAnthropicUsage(rawUsage, model, latencyMs);

  return {
    response: finalResponse,
    interaction,
    actualParams: actualParams!,
    responseMetrics,
    unifiedUsage,
  };
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
  // When thinking is enabled, we must use tool_choice: 'auto' because
  // forced tool_choice is incompatible with extended thinking
  const thinkingEnabled = options.thinking === true || typeof options.thinking === 'object';

  const toolOptions: ClaudeCallOptions = {
    ...options,
    system: `${options.system ?? ""}\nReturn the result by calling the ${options.toolName} tool.`,
    tools: [{
      name: options.toolName,
      description: options.toolDescription,
      input_schema: options.toolSchema
    }],
    // Use 'auto' when thinking is enabled, otherwise force the specific tool
    tool_choice: thinkingEnabled || requiresAutoToolChoice(options.model || MODEL_CONFIG.analysis)
      ? { type: "auto" }
      : { type: "tool", name: options.toolName },
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
    // Note: 'max_tokens' stop reason exists but isn't in the SDK types
    if ((result.response.stop_reason as string) === 'max_tokens') {
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
    // Note: 'max_tokens' stop reason exists but isn't in the SDK types
    if ((result.response.stop_reason as string) === 'max_tokens') {
      logger.error('[Claude] Tool returned empty due to max_tokens truncation', {
        tool: options.toolName,
        max_tokens: options.max_tokens || 4000,
        stop_reason: result.response.stop_reason
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
