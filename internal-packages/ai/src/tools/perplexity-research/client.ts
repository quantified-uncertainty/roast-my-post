/**
 * Perplexity client using OpenRouter with Helicone integration
 * Provides access to Perplexity's Sonar models with web search capabilities
 */

import { OpenAI } from 'openai';
import { aiConfig } from '../../config';
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
    const key = apiKey || process.env.OPENROUTER_API_KEY || '';
    
    if (!key || key === 'your_openrouter_api_key_here') {
      throw new Error(
        'OpenRouter API key is required for Perplexity integration. ' +
        'Please set OPENROUTER_API_KEY in your .env.local file with a valid API key from https://openrouter.ai/'
      );
    }
    
    const heliconeKey = aiConfig.helicone.apiKey || process.env.HELICONE_API_KEY;
    
    // Determine environment for better tracking
    const isProduction = process.env.NODE_ENV === 'production';
    const environment = isProduction ? 'Prod' : 'Dev';
    const appTitle = `RoastMyPost Tools - ${environment}`;
    // OpenRouter primarily uses HTTP-Referer for the "App" column
    // But X-Title might also influence the display
    const referer = isProduction ? 'https://roastmypost.org' : 'http://localhost:3000';
    
    // Use Helicone proxy if available, otherwise direct OpenRouter
    if (heliconeKey) {
      this.client = new OpenAI({
        baseURL: 'https://openrouter.helicone.ai/api/v1',
        apiKey: key,
        defaultHeaders: {
          'Helicone-Auth': `Bearer ${heliconeKey}`,
          'HTTP-Referer': referer,
          'X-Title': appTitle,
          'X-Environment': environment,
        }
      });
    } else {
      this.client = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: key,
        defaultHeaders: {
          'HTTP-Referer': referer,
          'X-Title': appTitle,
          'X-Environment': environment,
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
      
      // Add additional metadata headers
      const environment = process.env.NODE_ENV === 'production' ? 'Prod' : 'Dev';
      const enhancedHeaders = {
        ...sessionHeaders,
        'X-Request-Source': `perplexity-research-${environment.toLowerCase()}`,
        'X-Tool-Version': '1.0.0',
        'X-Request-Time': new Date().toISOString(),
        // Some providers use User-Agent for additional context
        'User-Agent': `RoastMyPost-Tools-${environment}/1.0.0`,
      };
      
      // Combine default headers with enhanced headers
      const appTitle = `RoastMyPost Tools - ${environment}`;
      const referer = process.env.NODE_ENV === 'production' ? 'https://roastmypost.org' : 'http://localhost:3000';
      
      const finalHeaders = {
        ...enhancedHeaders,
        'HTTP-Referer': referer,
        'X-Title': appTitle,
      };
      
      // Debug logging only in development
      if (process.env.NODE_ENV !== 'production') {
        console.log('[PerplexityClient] Request details:', {
          model,
          environment,
          baseURL: this.client.baseURL,
          hasApiKey: !!this.client.apiKey,
          apiKeyPrefix: this.client.apiKey?.substring(0, 10),
          appTitle,
          headers: finalHeaders
        });
      }
      
      const completion = await this.client.chat.completions.create({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
        stream: false
      }, {
        headers: finalHeaders
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
    } catch (error: any) {
      // Log error details (verbose in dev, minimal in prod)
      const errorLog = {
        message: error.message,
        status: error.status,
        model,
      };
      
      if (process.env.NODE_ENV !== 'production') {
        Object.assign(errorLog, {
          response: error.response?.data,
          headers: error.response?.headers,
        });
      }
      
      console.error('[PerplexityClient] Request failed:', errorLog);
      
      // Simplify error messages
      if (error.status === 401 || error.message?.includes('401')) {
        throw new Error('OpenRouter authentication failed. Check API key and credits.');
      }
      
      if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      
      throw error;
    }
  }
}

