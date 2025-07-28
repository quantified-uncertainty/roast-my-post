/**
 * LLM client wrapper for spelling/grammar analysis
 * Handles API calls, retries, and error handling
 */

import { callClaudeWithTool, MODEL_CONFIG } from '@/lib/claude/wrapper';
import { DEFAULT_TEMPERATURE } from '../../../../types/openai';
import { logger } from '@/lib/logger';
import { MAX_RETRIES, RETRY_BASE_DELAY_MS, LOG_PREFIXES } from '../constants';
import { SpellingGrammarError } from '../domain';
import { categorizeError, determineSeverity } from '../application';
import { withRetry } from '../../shared/retryUtils';
import type { HeliconeSessionConfig } from '../../../helicone/sessions';
import { createHeliconeHeaders } from '../../../helicone/sessions';

export interface LLMResponse {
  errors: SpellingGrammarError[];
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * LLM client for spelling/grammar analysis
 */
export class SpellingGrammarLLMClient {
  constructor(
    private readonly model: string = MODEL_CONFIG.analysis,
    private readonly temperature: number = DEFAULT_TEMPERATURE,
    private readonly maxRetries: number = MAX_RETRIES
  ) {}

  /**
   * Analyze text for spelling and grammar errors
   */
  async analyzeText(
    systemPrompt: string,
    userPrompt: string,
    sessionConfig?: HeliconeSessionConfig
  ): Promise<LLMResponse> {
    let lastUsage: any = null;

    const analyzeWithRetry = async (): Promise<LLMResponse> => {
      const toolDefinition = this.getErrorReportingTool();
      
      try {
        // Prepare helicone headers if session config is provided
        const heliconeHeaders = sessionConfig ? createHeliconeHeaders(sessionConfig) : undefined;
        
        const result = await callClaudeWithTool<{ errors: any[] }>({
          model: this.model,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: userPrompt,
            },
          ],
          toolName: toolDefinition.name,
          toolDescription: toolDefinition.description,
          toolSchema: toolDefinition.input_schema,
          max_tokens: 8000,
          temperature: this.temperature,
          heliconeHeaders
        });

        lastUsage = result.response.usage;

        const errors = this.parseErrors(result.toolResult);

        logger.debug(`${LOG_PREFIXES.CHUNK_ANALYSIS} Token usage`, {
          inputTokens: result.response.usage?.input_tokens,
          outputTokens: result.response.usage?.output_tokens,
          model: this.model
        });

        return {
          errors,
          usage: {
            input_tokens: result.response.usage?.input_tokens || 0,
            output_tokens: result.response.usage?.output_tokens || 0
          }
        };
      } catch (error) {
        throw error;
      }
    };

    try {
      return await withRetry(analyzeWithRetry, {
        maxRetries: this.maxRetries,
        baseDelayMs: RETRY_BASE_DELAY_MS,
        logPrefix: LOG_PREFIXES.CHUNK_ANALYSIS
      });
    } catch (error) {
      // If all retries failed, return empty result with basic usage info
      if (lastUsage) {
        return {
          errors: [],
          usage: {
            input_tokens: lastUsage?.input_tokens || 0,
            output_tokens: lastUsage?.output_tokens || 0
          }
        };
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
   * Try to parse text response as fallback when tool use fails
   */
  private tryParseTextResponse(text: string): { errors: any[] } | null {
    try {
      // First try to parse as JSON (the response might be a stringified JSON)
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].type === 'text') {
          // This is the Claude response format
          const textContent = parsed.map((item: any) => item.text || '').join(' ');
          return this.tryParseTextResponse(textContent);
        }
        if (parsed.errors && Array.isArray(parsed.errors)) {
          return parsed;
        }
      } catch (_e) {
        // Not JSON, continue with text parsing
      }

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