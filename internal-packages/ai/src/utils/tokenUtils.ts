/**
 * Token counting utilities for accurate token estimation
 */

import Anthropic from '@anthropic-ai/sdk';

/**
 * Accurate token counting using Anthropic's built-in tokenizer
 */
export class TokenCounter {
  private static anthropic: Anthropic | null = null;

  private static getAnthropicClient(): Anthropic {
    // Only initialize when running on server
    if (typeof window !== 'undefined') {
      throw new Error('TokenCounter cannot be used in browser environment');
    }
    
    if (!this.anthropic) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder'
      });
    }
    return this.anthropic;
  }

  /**
   * Count tokens in text using Anthropic's tokenizer
   * Note: This requires the Anthropic SDK v0.54.0+ which includes token counting
   */
  static async countTokens(text: string, model: string = 'claude-3-sonnet-20240229'): Promise<number> {
    try {
      // Check if the SDK has the beta.messages.countTokens method
      const anthropic = this.getAnthropicClient();
      if (anthropic.beta?.messages?.countTokens) {
        const result = await anthropic.beta.messages.countTokens({
          model: model as any,
          messages: [{ role: 'user', content: text }]
        });
        return result.input_tokens;
      }
      
      // Fallback to improved estimation if API method not available
      return this.estimateTokens(text);
    } catch (error) {
      console.warn('Token counting API failed, falling back to estimation:', error);
      return this.estimateTokens(text);
    }
  }

  /**
   * Improved token estimation based on more accurate Claude patterns
   * Much better than the simple /4 approach
   */
  static estimateTokens(text: string): number {
    // Clean the text first
    const cleanText = text.trim();
    if (!cleanText) return 0;

    // More sophisticated estimation based on Claude tokenization patterns
    // This accounts for:
    // - Whitespace compression
    // - Common word patterns  
    // - Punctuation handling
    // - Special characters

    // Split into words and punctuation
    const words = cleanText.split(/\s+/);
    let tokenCount = 0;

    for (const word of words) {
      if (!word) continue;

      // Handle different word types
      if (word.length <= 3) {
        // Short words are usually 1 token
        tokenCount += 1;
      } else if (word.length <= 6) {
        // Medium words are usually 1-2 tokens
        tokenCount += word.includes('-') || word.includes('_') ? 2 : 1;
      } else if (word.length <= 12) {
        // Longer words are typically 2-3 tokens
        const specialChars = (word.match(/[^a-zA-Z0-9]/g) || []).length;
        tokenCount += Math.min(3, Math.ceil(word.length / 4) + specialChars);
      } else {
        // Very long words (often technical terms, URLs, etc.)
        tokenCount += Math.ceil(word.length / 3.5);
      }
    }

    // Account for punctuation and special formatting
    const punctuationCount = (cleanText.match(/[.!?;:,(){}[\]"'`]/g) || []).length;
    tokenCount += Math.ceil(punctuationCount / 2);

    // Account for newlines and formatting
    const newlineCount = (cleanText.match(/\n/g) || []).length;
    tokenCount += newlineCount;

    // Add small buffer for tokenization overhead
    return Math.ceil(tokenCount * 1.1);
  }

  /**
   * Estimate tokens for system + user messages (common pattern)
   */
  static async estimateConversationTokens(
    systemMessage: string,
    userMessage: string,
    model: string = 'claude-3-sonnet-20240229'
  ): Promise<{ systemTokens: number; userTokens: number; totalTokens: number }> {
    const [systemTokens, userTokens] = await Promise.all([
      this.countTokens(systemMessage, model),
      this.countTokens(userMessage, model)
    ]);

    return {
      systemTokens,
      userTokens,
      totalTokens: systemTokens + userTokens
    };
  }

  /**
   * Synchronous estimation (faster, less accurate)
   * Use when you need immediate results and API calls aren't practical
   */
  static estimateTokensSync(text: string): number {
    return this.estimateTokens(text);
  }

  /**
   * Check if text is within token limits for different Claude models
   */
  static checkTokenLimits(tokenCount: number, model: string = 'claude-3-sonnet-20240229'): {
    withinLimit: boolean;
    percentUsed: number;
    maxTokens: number;
  } {
    const modelLimits: Record<string, number> = {
      'claude-3-sonnet-20240229': 200000,
      'claude-3-opus-20240229': 200000,
      'claude-3-haiku-20240307': 200000,
      'claude-3-5-sonnet-20241022': 200000,
      'claude-3-5-haiku-20241022': 200000
    };

    const maxTokens = modelLimits[model] || 200000;
    const percentUsed = (tokenCount / maxTokens) * 100;

    return {
      withinLimit: tokenCount <= maxTokens,
      percentUsed,
      maxTokens
    };
  }
}

/**
 * Simple wrapper functions for common use cases
 */
export const countTokens = TokenCounter.countTokens.bind(TokenCounter);
export const estimateTokens = TokenCounter.estimateTokensSync.bind(TokenCounter);
export const estimateConversationTokens = TokenCounter.estimateConversationTokens.bind(TokenCounter);
export const checkTokenLimits = TokenCounter.checkTokenLimits.bind(TokenCounter);

/**
 * Legacy compatibility - improved version of the old /4 estimation
 * Drop-in replacement for Math.floor(text.length / 4)
 */
export function improvedTokenEstimate(text: string): number {
  return TokenCounter.estimateTokensSync(text);
}