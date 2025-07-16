/**
 * LLM client wrapper for spelling/grammar analysis
 * Handles API calls, retries, and error handling
 */

import { callClaudeWithTool, MODEL_CONFIG } from '@/lib/claude/wrapper';
import type { LLMInteraction, RichLLMInteraction } from '@/types/llm';
import { DEFAULT_TEMPERATURE } from '../../../../types/openai';
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
    private readonly model: string = MODEL_CONFIG.analysis,
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
    let lastUsage: any = null;
    const interactions: RichLLMInteraction[] = [];

    const analyzeWithRetry = async (): Promise<LLMResponse> => {
      const toolDefinition = this.getErrorReportingTool();
      
      try {
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
          temperature: this.temperature
        }, interactions);

        lastUsage = result.response.usage;

        const errors = this.parseErrors(result.toolResult);
        const llmInteraction = this.createInteractionFromRich(result.interaction, result.toolResult);

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
          },
          llmInteraction
        };
      } catch (error) {
        // Check if it's a tool use error that might contain a text response
        if (error instanceof Error && error.message.includes('Expected tool use') && interactions.length > 0) {
          const lastInteraction = interactions[interactions.length - 1];
          const fallbackResult = this.tryParseTextResponse(lastInteraction.response);
          if (fallbackResult) {
            logger.warn(`${LOG_PREFIXES.CHUNK_ANALYSIS} Successfully parsed fallback text response`);
            return {
              errors: this.parseErrors(fallbackResult),
              usage: {
                input_tokens: lastInteraction.tokensUsed.prompt,
                output_tokens: lastInteraction.tokensUsed.completion
              },
              llmInteraction: this.createInteractionFromRich(lastInteraction, fallbackResult)
            };
          }
        }
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
      // If all retries failed and we have usage info, return empty result
      if (lastUsage || interactions.length > 0) {
        const usage = lastUsage || (interactions.length > 0 ? {
          input_tokens: interactions[interactions.length - 1].tokensUsed.prompt,
          output_tokens: interactions[interactions.length - 1].tokensUsed.completion
        } : { input_tokens: 0, output_tokens: 0 });
        
        return this.createEmptyResponse(usage, 'No tool use in response after all retries');
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
   * Create LLM interaction record from RichLLMInteraction
   */
  private createInteractionFromRich(
    richInteraction: RichLLMInteraction,
    result: any
  ): LLMInteraction {
    // Parse prompt to extract system and user messages
    const promptParts = richInteraction.prompt.split('\n\n');
    let systemContent = '';
    let userContent = '';
    
    if (promptParts[0].startsWith('SYSTEM:')) {
      systemContent = promptParts[0].replace('SYSTEM: ', '');
      userContent = promptParts.slice(1).join('\n\n').replace('USER: ', '');
    } else {
      userContent = richInteraction.prompt.replace('USER: ', '');
    }

    return {
      messages: [
        ...(systemContent ? [{ role: 'system' as const, content: systemContent }] : []),
        { role: 'user' as const, content: userContent },
        { role: 'assistant' as const, content: JSON.stringify(result) }
      ],
      usage: {
        input_tokens: richInteraction.tokensUsed.prompt,
        output_tokens: richInteraction.tokensUsed.completion
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
      } catch (e) {
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