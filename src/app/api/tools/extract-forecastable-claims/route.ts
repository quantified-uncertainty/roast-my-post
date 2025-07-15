import { NextRequest, NextResponse } from 'next/server';
import { extractForecasts } from '@/lib/documentAnalysis/narrow-epistemic-evals/forecaster';
import { ANALYSIS_MODEL } from '@/types/openai';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';

const requestSchema = z.object({
  text: z.string().min(1).max(10000),
  agentInstructions: z.string().max(1000).optional(),
  maxDetailedAnalysis: z.number().min(1).max(10).default(3)
});

async function selectForecastsForAnalysis(
  forecasts: any[],
  agentInstructions: string,
  maxCount: number
): Promise<any[]> {
  if (forecasts.length === 0) return [];
  
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  
  const systemPrompt = `You are a forecast analyst. Given a list of extracted forecasts and agent instructions, 
select which forecasts are worth detailed probability analysis (which costs 6 LLM calls each).

Agent instructions: ${agentInstructions}

Consider:
- Importance and impact of the prediction
- Specificity and verifiability
- Relevance to the agent's focus areas
- Whether a probability estimate would be valuable

Select up to ${maxCount} forecasts.`;

  const response = await anthropic.messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: 1500,
    temperature: 0,
    system: systemPrompt,
    messages: [{
      role: "user",
      content: `Select which of these forecasts deserve detailed analysis:\n\n${JSON.stringify(forecasts, null, 2)}`
    }],
    tools: [{
      name: "select_forecasts",
      description: "Select forecasts for detailed analysis",
      input_schema: {
        type: "object",
        properties: {
          selections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                index: { type: "number", description: "Index of the forecast in the input array" },
                reasoning: { type: "string", description: "Why this forecast was selected" }
              },
              required: ["index", "reasoning"]
            }
          }
        },
        required: ["selections"]
      }
    }],
    tool_choice: { type: "tool", name: "select_forecasts" }
  });

  const toolUse = response.content.find((c: any) => c.type === "tool_use") as any;
  const selections = toolUse?.input?.selections || [];
  
  // Mark selected forecasts
  return forecasts.map((forecast, index) => {
    const selection = selections.find((s: any) => s.index === index);
    return {
      ...forecast,
      worthDetailedAnalysis: !!selection,
      reasoning: selection?.reasoning
    };
  });
}

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

    const { text, agentInstructions, maxDetailedAnalysis } = validationResult.data;

    // Extract forecasts
    console.log('[Extract Forecasts API] Extracting forecasts from text');
    const extractedForecasts = await extractForecasts(text);

    // Select which ones deserve detailed analysis
    console.log(`[Extract Forecasts API] Selecting up to ${maxDetailedAnalysis} for detailed analysis`);
    const analyzedForecasts = await selectForecastsForAnalysis(
      extractedForecasts,
      agentInstructions || 'Select the most important and impactful predictions',
      maxDetailedAnalysis
    );

    return NextResponse.json({
      forecasts: analyzedForecasts,
      totalFound: extractedForecasts.length,
      selectedForAnalysis: analyzedForecasts.filter(f => f.worthDetailedAnalysis).length
    });
  } catch (error) {
    console.error('[Extract Forecasts API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to extract forecasts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}