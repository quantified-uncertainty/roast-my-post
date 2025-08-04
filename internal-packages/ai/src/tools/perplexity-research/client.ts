/**
 * Perplexity client using OpenRouter with Helicone integration
 * Provides access to Perplexity's Sonar models with web search capabilities
 */

import { OpenAI } from 'openai';
import { getConfig } from '../../config';
import { getCurrentHeliconeHeaders } from '../../helicone/simpleSessionManager';

export interface PerplexityOptions {
  model?: 'perplexity/sonar' | 'perplexity/sonar-pro';
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export class PerplexityClient {
  private client: OpenAI;
  
  constructor(apiKey?: string) {
    const config = getConfig();
    const key = apiKey || config.openRouterApiKey || process.env.OPENROUTER_API_KEY || '';
    
    if (!key || key === 'your_openrouter_api_key_here') {
      throw new Error(
        'OpenRouter API key is required for Perplexity integration. ' +
        'Please set OPENROUTER_API_KEY in your .env.local file with a valid API key from https://openrouter.ai/'
      );
    }
    
    const heliconeKey = config.heliconeApiKey || process.env.HELICONE_API_KEY;
    
    // Use Helicone proxy if available, otherwise direct OpenRouter
    if (heliconeKey) {
      this.client = new OpenAI({
        baseURL: 'https://openrouter.helicone.ai/api/v1',
        apiKey: key,
        defaultHeaders: {
          'Helicone-Auth': `Bearer ${heliconeKey}`,
          'HTTP-Referer': 'https://roastmypost.org',
          'X-Title': 'RoastMyPost Tools',
        }
      });
    } else {
      this.client = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: key,
        defaultHeaders: {
          'HTTP-Referer': 'https://roastmypost.org',
          'X-Title': 'RoastMyPost Tools',
        }
      });
    }
  }

  /**
   * Call Perplexity Sonar model for web-enhanced responses
   */
  async query(
    question: string,
    options: PerplexityOptions = {}
  ): Promise<{ content: string; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }> {
    const {
      model = 'perplexity/sonar',
      maxTokens = 1000,
      temperature = 0.7,
      systemPrompt
    } = options;

    const messages: OpenAI.ChatCompletionMessageParam[] = [];
    
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }
    
    messages.push({
      role: 'user',
      content: question
    });

    try {
      // Get current session headers for tracking
      const sessionHeaders = getCurrentHeliconeHeaders();
      
      const completion = await this.client.chat.completions.create({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
        stream: false
      }, {
        headers: sessionHeaders
      });
      
      if (!completion.choices || completion.choices.length === 0) {
        throw new Error('No response from Perplexity');
      }

      return {
        content: completion.choices[0].message.content || '',
        usage: completion.usage ? {
          prompt_tokens: completion.usage.prompt_tokens,
          completion_tokens: completion.usage.completion_tokens,
          total_tokens: completion.usage.total_tokens
        } : undefined
      };
    } catch (error) {
      console.error('Perplexity query error:', error);
      throw error;
    }
  }
}

