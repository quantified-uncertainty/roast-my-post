import { NextRequest, NextResponse } from 'next/server';
import { documentChunkerTool } from '@roast/ai';
import { logger } from '@/lib/logger';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const data = await request.json();
    
    // Execute the tool with user context
    const result = await documentChunkerTool.execute(data, {
      userId: session.user.id,
      logger,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    logger.error('Document chunker tool error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
