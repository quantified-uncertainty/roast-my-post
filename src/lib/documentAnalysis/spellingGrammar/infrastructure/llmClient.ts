/**
 * LLM client wrapper for spelling/grammar analysis
 * Handles API calls, retries, and error handling
 */

import { anthropic, ANALYSIS_MODEL, DEFAULT_TEMPERATURE } from '../../../../types/openai';
import type { LLMInteraction } from '@/types/llm';
import { logger } from '@/lib/logger';
import { MAX_RETRIES, RETRY_BASE_DELAY_MS, LOG_PREFIXES } from '../constants';
import { SpellingGrammarError } from '../domain';
import { categorizeError, determineSeverity } from '../application';

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
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // Add delay between retries
        if (attempt > 1) {
          const delay = Math.pow(2, attempt - 1) * RETRY_BASE_DELAY_MS;
          logger.info(`${LOG_PREFIXES.CHUNK_ANALYSIS} Retrying (attempt ${attempt}/${this.maxRetries}) after ${delay}ms delay`);
          await this.delay(delay);
        }

        const response = await anthropic.messages.create({
          model: this.model,
          max_tokens: 2000,
          temperature: this.temperature,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: userPrompt,
            },
          ],
          tools: [this.getErrorReportingTool()],
          tool_choice: { type: "tool", name: "report_errors" },
        });

        const result = this.extractToolResponse(response);
        if (!result) {
          if (attempt === this.maxRetries) {
            return this.createEmptyResponse(response.usage, 'No tool use in response');
          }
          continue;
        }

        const errors = this.parseErrors(result);
        const llmInteraction = this.createInteraction(systemPrompt, userPrompt, result, response.usage);

        if (attempt > 1) {
          logger.info(`${LOG_PREFIXES.CHUNK_ANALYSIS} Succeeded on attempt ${attempt}`);
        }

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

      } catch (error) {
        logger.error(`Error analyzing text (attempt ${attempt}/${this.maxRetries}):`, error);
        if (attempt === this.maxRetries) {
          throw error;
        }
      }
    }

    // Should never reach here
    return this.createEmptyResponse({ input_tokens: 0, output_tokens: 0 }, 'Max retries exhausted');
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
    const toolUse = response.content.find((c: any) => c.type === "tool_use");
    if (!toolUse || toolUse.name !== "report_errors") {
      logger.error(`${LOG_PREFIXES.CHUNK_ANALYSIS} No tool use response from Anthropic`);
      return null;
    }

    const result = toolUse.input as { errors: any[] };
    if (!result || !Array.isArray(result.errors)) {
      logger.error(`Invalid response structure from LLM`, {
        result,
        toolUseName: toolUse.name,
        responseId: response.id
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
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}