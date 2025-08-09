import { NextRequest, NextResponse } from 'next/server';
import { Tool } from '@roast/ai';
import { logger } from '@/infrastructure/logging/logger';
import { auth } from '@/infrastructure/auth/auth';
import { config } from '@roast/domain';

export function createToolRoute(tool: Tool<any, any>) {
  const POST = async function (request: NextRequest) {
    try {
      let userId: string;
      
      // Development bypass when BYPASS_TOOL_AUTH is set
      if (process.env.BYPASS_TOOL_AUTH === 'true' && config.env.isDevelopment) {
        logger.info(`[DEV] Bypassing authentication for ${tool.config.name} tool`);
        userId = 'dev-bypass-user';
      } else {
        // Check authentication
        const session = await auth();
        if (!session?.user?.id) {
          return NextResponse.json(
            { success: false, error: 'Not authenticated' },
            { status: 401 }
          );
        }
        userId = session.user.id;
      }

      const data = await request.json();
      
      // Execute the tool with user context
      const result = await tool.execute(data, {
        userId,
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
  
  const GET = async function (_request: NextRequest) {
    try {
      // Return tool metadata including JSON schemas
      return NextResponse.json({
        success: true,
        tool: {
          config: tool.config,
          inputSchema: tool.getInputJsonSchema(),
          outputSchema: tool.getOutputJsonSchema(),
        }
      });
    } catch (error) {
      logger.error(`${tool.config.name} schema error:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to get schemas';
      
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: 500 }
      );
    }
  };
  
  return { GET, POST };
}