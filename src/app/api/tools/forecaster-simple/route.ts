import { NextRequest, NextResponse } from 'next/server';
import { generateForecast } from '@/lib/documentAnalysis/narrow-epistemic-evals/forecaster';
import { z } from 'zod';

const requestSchema = z.object({
  question: z.string().min(1).max(500),
  context: z.string().max(1000).optional(),
  timeframe: z.string().max(200).optional(),
  numForecasts: z.number().min(3).max(20).optional().default(6),
  usePerplexity: z.boolean().optional().default(false)
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

    const { question, context, timeframe, numForecasts, usePerplexity } = validationResult.data;

    // Generate forecast
    console.log(`[Forecaster API] Starting forecast for: ${question} (${numForecasts} forecasts${usePerplexity ? ' with Perplexity' : ''})`);
    const result = await generateForecast({ question, context, timeframe, numForecasts, usePerplexity });

    // Format response
    const response = {
      probability: result.forecast.probability,
      description: result.forecast.description,
      individualForecasts: result.individual_forecasts.map(f => ({
        probability: f.probability,
        confidence: f.confidence,
        reasoning: f.reasoning
      })),
      statistics: result.statistics,
      outliersRemoved: result.outliers_removed.length
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Forecaster API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate forecast', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}