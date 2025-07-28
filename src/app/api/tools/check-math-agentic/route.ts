import { NextResponse } from 'next/server';
import { checkMathAgenticTool } from '@/tools/check-math-agentic';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Request validation schema
const requestSchema = z.object({
  statement: z.string().min(1).max(1000),
  context: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validationResult = requestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { statement, context } = validationResult.data;

    // Execute the tool
    const result = await checkMathAgenticTool.execute(
      { statement, context },
      { logger }
    );

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Check Math Agentic API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}