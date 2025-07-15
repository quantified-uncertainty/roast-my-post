/**
 * Perplexity client using OpenRouter
 * Provides access to Perplexity's Sonar models with web search capabilities
 */

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class PerplexityClient {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';
  
  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('OpenRouter API key is required for Perplexity integration');
    }
  }

  /**
   * Call Perplexity Sonar model for web-enhanced responses
   */
  async query(
    question: string,
    options: {
      model?: 'perplexity/sonar' | 'perplexity/sonar-pro';
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    } = {}
  ): Promise<string> {
    const {
      model = 'perplexity/sonar',
      maxTokens = 1000,
      temperature = 0.7,
      systemPrompt
    } = options;

    const messages: PerplexityMessage[] = [];
    
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
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://roastmypost.org',
          'X-Title': 'RoastMyPost Tools'
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
          stream: false
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
      }

      const data: PerplexityResponse = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from Perplexity');
      }

      return data.choices[0].message.content;
    } catch (error) {
      console.error('Perplexity query error:', error);
      throw error;
    }
  }

  /**
   * Research a topic with structured output
   */
  async research(
    query: string,
    options: {
      focusArea?: 'general' | 'academic' | 'news' | 'technical' | 'market';
      maxSources?: number;
    } = {}
  ): Promise<{
    summary: string;
    sources: Array<{ title: string; url: string; snippet: string }>;
    keyFindings: string[];
  }> {
    const { focusArea = 'general', maxSources = 5 } = options;

    const systemPrompt = `You are a research assistant using Perplexity's web search capabilities. 
When researching topics, provide:
1. A comprehensive summary
2. Key findings as bullet points
3. Sources with titles, URLs, and relevant snippets

Focus area: ${focusArea}
Maximum sources to include: ${maxSources}

Format your response as JSON with this structure:
{
  "summary": "...",
  "keyFindings": ["finding1", "finding2", ...],
  "sources": [
    {"title": "...", "url": "...", "snippet": "..."},
    ...
  ]
}`;

    const response = await this.query(query, {
      model: 'perplexity/sonar',
      systemPrompt,
      maxTokens: 2000,
      temperature: 0.3 // Lower temperature for more factual responses
    });

    try {
      // Try to parse as JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Fallback to text parsing if JSON parsing fails
      console.warn('Failed to parse JSON response, using fallback parsing');
    }

    // Fallback parsing
    return {
      summary: response.split('\n')[0] || response.substring(0, 500),
      keyFindings: response.match(/[-•]\s*(.+)/g)?.map(f => f.replace(/^[-•]\s*/, '')) || [],
      sources: []
    };
  }

  /**
   * Get context for a forecasting question
   */
  async getForecastingContext(
    question: string,
    existingContext?: string
  ): Promise<string> {
    const prompt = `Research current information relevant to this forecasting question: "${question}"
    
${existingContext ? `Existing context: ${existingContext}\n` : ''}

Provide relevant facts, recent developments, base rates, and any information that would help make an accurate probability forecast. Focus on:
1. Current state and recent trends
2. Historical precedents and base rates
3. Key factors that could influence the outcome
4. Expert opinions or predictions if available

Keep the response concise and focused on information directly relevant to forecasting.`;

    const response = await this.query(prompt, {
      model: 'perplexity/sonar',
      maxTokens: 1500,
      temperature: 0.5
    });

    return response;
  }
}

// Singleton instance
let perplexityClient: PerplexityClient | null = null;

export function getPerplexityClient(): PerplexityClient {
  if (!perplexityClient) {
    perplexityClient = new PerplexityClient();
  }
  return perplexityClient;
}