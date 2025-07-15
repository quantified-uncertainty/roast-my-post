import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPerplexityClient } from '@/lib/perplexity/client';

const requestSchema = z.object({
  query: z.string().min(1).max(500),
  maxSources: z.number().min(3).max(10).default(5),
  focusArea: z.enum(['general', 'academic', 'news', 'technical', 'market']).default('general')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = requestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { query, maxSources, focusArea } = validationResult.data;

    console.log(`[Perplexity Research API] Researching: ${query} (${focusArea}, max ${maxSources} sources)`);
    
    try {
      // Use real Perplexity client
      const client = getPerplexityClient();
      const research = await client.research(query, { focusArea, maxSources });
      
      // Format response to match our interface
      const result = {
        query,
        summary: research.summary,
        sources: research.sources.map((source, i) => ({
          ...source,
          relevance: i < 2 ? 'high' : i < 4 ? 'medium' : 'low' as const
        })),
        keyFindings: research.keyFindings,
        timestamp: new Date().toISOString()
      };

      return NextResponse.json(result);
    } catch (perplexityError) {
      console.error('[Perplexity Research API] Perplexity error:', perplexityError);
      
      // Fallback to basic query if structured research fails
      try {
        const client = getPerplexityClient();
        const response = await client.query(query);
        
        return NextResponse.json({
          query,
          summary: response,
          sources: [],
          keyFindings: response.split('\n').filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
            .map(line => line.replace(/^[-•]\s*/, '')),
          timestamp: new Date().toISOString(),
          note: 'Fallback mode - structured research parsing failed'
        });
      } catch (fallbackError) {
        throw fallbackError;
      }
    }
  } catch (error) {
    console.error('[Perplexity Research API] Error:', error);
    
    // Check if it's an API key error
    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json(
        { 
          error: 'API configuration error', 
          details: 'OpenRouter API key not configured. Please set OPENROUTER_API_KEY environment variable.',
          docs: 'https://openrouter.ai/keys'
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to perform research', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}