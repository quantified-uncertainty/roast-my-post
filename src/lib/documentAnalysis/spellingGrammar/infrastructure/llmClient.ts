/**
 * LLM client wrapper for spelling/grammar analysis
 * Handles API calls, retries, and error handling
 */

import { createAnthropicClient, ANALYSIS_MODEL, DEFAULT_TEMPERATURE } from '../../../../types/openai';
import type { LLMInteraction } from '@/types/llm';
import { logger } from '@/lib/logger';
import { MAX_RETRIES, RETRY_BASE_DELAY_MS, LOG_PREFIXES } from '../constants';
import { SpellingGrammarError } from '../domain';
import { categorizeError, determineSeverity } from '../application';
import { withRetry } from '../../shared/retryUtils';

export interface LLMResponse {
  errors: SpellingGrammarError[];
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  llmInteraction: LLMInteraction;
}

/**
 * LLM client for spelling/grammar analysis
 */
export class SpellingGrammarLLMClient {
  constructor(
    private readonly model: string = ANALYSIS_MODEL,
    private readonly temperature: number = DEFAULT_TEMPERATURE,
    private readonly maxRetries: number = MAX_RETRIES
  ) {}

  /**
   * Analyze text for spelling and grammar errors
   */
  async analyzeText(
    systemPrompt: string,
    userPrompt: string
  ): Promise<LLMResponse> {
    let lastResponse: any = null;

    const analyzeWithRetry = async (): Promise<LLMResponse> => {
      const response = await createAnthropicClient().messages.create({
        model: this.model,
        max_tokens: 8000,
        temperature: this.temperature,
        system: [
          {
            type: "text",
            text: systemPrompt,
            cache_control: { type: "ephemeral" }
          }
        ],
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
        tools: [this.getErrorReportingTool()],
        tool_choice: { type: "tool", name: "report_errors" },
      });

      lastResponse = response;

      const result = this.extractToolResponse(response);
      if (!result) {
        throw new Error('No tool use in response');
      }

      const errors = this.parseErrors(result);
      const llmInteraction = this.createInteraction(systemPrompt, userPrompt, result, response.usage);

      logger.debug(`${LOG_PREFIXES.CHUNK_ANALYSIS} Token usage`, {
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
        model: this.model
      });

      return {
        errors,
        usage: {
          input_tokens: response.usage?.input_tokens || 0,
          output_tokens: response.usage?.output_tokens || 0
        },
        llmInteraction
      };
    };

    try {
      return await withRetry(analyzeWithRetry, {
        maxRetries: this.maxRetries,
        baseDelayMs: RETRY_BASE_DELAY_MS,
        logPrefix: LOG_PREFIXES.CHUNK_ANALYSIS
      });
    } catch (error) {
      // If all retries failed and we have a response, return empty result
      if (lastResponse?.usage) {
        return this.createEmptyResponse(lastResponse.usage, 'No tool use in response after all retries');
      }
      throw error;
    }
  }

  /**
   * Get the error reporting tool definition
   */
  private getErrorReportingTool() {
    return {
      name: "report_errors",
      description: "Report spelling and grammar errors found in the text",
      input_schema: {
        type: "object" as const,
        properties: {
          errors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                lineStart: {
                  type: "number",
                  description: "Starting line number where the error occurs (from the provided line numbers)",
                },
                lineEnd: {
                  type: "number",
                  description: "Ending line number where the error occurs (same as lineStart for single-line errors)",
                },
                highlightedText: {
                  type: "string",
                  description: "ONLY the problematic word(s). For spelling: just the misspelled word. For grammar: just the incorrect word(s). Be precise and minimal.",
                },
                description: {
                  type: "string",
                  description: "Clear explanation of the error and suggested correction. Format: 'Error type: [explanation]. Suggested correction: [correction]'",
                },
              },
              required: ["lineStart", "lineEnd", "highlightedText", "description"],
            },
          },
        },
        required: ["errors"],
      },
    };
  }

  /**
   * Extract tool response from Anthropic response
   */
  private extractToolResponse(response: any): any {
    // Enhanced error logging to capture response structure
    if (!response.content || !Array.isArray(response.content)) {
      logger.error(`${LOG_PREFIXES.CHUNK_ANALYSIS} Invalid response structure`, {
        hasContent: !!response.content,
        contentType: typeof response.content,
        responseId: response.id,
        responseKeys: Object.keys(response || {}),
        fullResponse: JSON.stringify(response, null, 2)
      });
      return null;
    }

    const toolUse = response.content.find((c: any) => c.type === "tool_use");
    if (!toolUse || toolUse.name !== "report_errors") {
      // Capture detailed debugging information
      const textContent = response.content.filter((c: any) => c.type === "text").map((c: any) => c.text);
      
      logger.error(`${LOG_PREFIXES.CHUNK_ANALYSIS} No tool use response from Anthropic`, {
        responseId: response.id,
        contentTypes: response.content.map((c: any) => c.type),
        toolUseName: toolUse?.name,
        hasToolUse: !!toolUse,
        textContent: textContent,
        fullContent: response.content,
        usage: response.usage
      });

      // Check if response has text content that looks like analysis results
      if (textContent.length > 0) {
        const combinedText = textContent.join(' ');
        const fallbackResult = this.tryParseTextResponse(combinedText);
        if (fallbackResult) {
          logger.warn(`${LOG_PREFIXES.CHUNK_ANALYSIS} Successfully parsed fallback text response`);
          return fallbackResult;
        }
      }

      return null;
    }

    const result = toolUse.input as { errors: any[] };
    if (!result || !Array.isArray(result.errors)) {
      logger.error(`${LOG_PREFIXES.CHUNK_ANALYSIS} Invalid tool use structure from LLM`, {
        result,
        toolUseName: toolUse.name,
        responseId: response.id,
        toolUseInput: toolUse.input
      });
      return null;
    }

    return result;
  }

  /**
   * Parse errors from LLM response
   */
  private parseErrors(result: { errors: any[] }): SpellingGrammarError[] {
    return result.errors.map(error => {
      const errorType = categorizeError(error.description);
      const severity = determineSeverity(errorType, error.description);

      return new SpellingGrammarError(
        error.lineStart,
        error.lineEnd,
        error.highlightedText,
        error.description,
        errorType,
        severity
      );
    });
  }

  /**
   * Create LLM interaction record
   */
  private createInteraction(
    systemPrompt: string,
    userPrompt: string,
    result: any,
    usage: any
  ): LLMInteraction {
    return {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
        { role: 'assistant', content: JSON.stringify(result) }
      ],
      usage: {
        input_tokens: usage?.input_tokens || 0,
        output_tokens: usage?.output_tokens || 0
      }
    };
  }

  /**
   * Create empty response
   */
  private createEmptyResponse(usage: any, error: string): LLMResponse {
    return {
      errors: [],
      usage: {
        input_tokens: usage?.input_tokens || 0,
        output_tokens: usage?.output_tokens || 0
      },
      llmInteraction: {
        messages: [
          { role: 'assistant', content: `Error: ${error}` }
        ],
        usage: {
          input_tokens: usage?.input_tokens || 0,
          output_tokens: usage?.output_tokens || 0
        }
      }
    };
  }

  /**
   * Try to parse text response as fallback when tool use fails
   */
  private tryParseTextResponse(text: string): { errors: any[] } | null {
    try {
      // Handle common patterns in plain text responses
      const lowerText = text.toLowerCase();
      
      // Pattern 1: "analyzed chunk X: Y errors found" or "0 errors found"
      if (lowerText.includes('0 errors found') || 
          lowerText.includes('no errors') ||
          lowerText.includes('no spelling') ||
          lowerText.includes('no grammar')) {
        logger.info(`${LOG_PREFIXES.CHUNK_ANALYSIS} Fallback parsing: detected no errors pattern`);
        return { errors: [] };
      }

      // Pattern 2: "analyzed chunk X: Y errors found" where Y > 0
      const errorCountMatch = text.match(/(\d+)\s+errors?\s+found/i);
      if (errorCountMatch) {
        const errorCount = parseInt(errorCountMatch[1]);
        if (errorCount === 0) {
          logger.info(`${LOG_PREFIXES.CHUNK_ANALYSIS} Fallback parsing: extracted 0 errors from count`);
          return { errors: [] };
        } else {
          logger.warn(`${LOG_PREFIXES.CHUNK_ANALYSIS} Fallback parsing: ${errorCount} errors mentioned but no details provided`);
          // We can't extract the actual errors from plain text, so return empty
          // but log this as a notable case
          return { errors: [] };
        }
      }

      // If we can't parse it, return null to continue with normal error handling
      logger.warn(`${LOG_PREFIXES.CHUNK_ANALYSIS} Fallback parsing failed: unrecognized text pattern`, {
        textPreview: text.substring(0, 200)
      });
      return null;

    } catch (error) {
      logger.error(`${LOG_PREFIXES.CHUNK_ANALYSIS} Error in fallback text parsing:`, error);
      return null;
    }
  }

}