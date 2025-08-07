import { NextRequest, NextResponse } from 'next/server';
import { Tool } from '@roast/ai';
import { logger } from '@/infrastructure/logging/logger';
import { auth } from '@/infrastructure/auth/auth';

export function createToolRoute(tool: Tool<any, any>) {
  return async function POST(request: NextRequest) {
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
      const result = await tool.execute(data, {
        userId: session.user.id,
        logger,
      });

      return NextResponse.json({
        success: true,
        result,
      });
    } catch (error) {
      logger.error(`${tool.config.name} tool error:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: 500 }
      );
    }
  };
}