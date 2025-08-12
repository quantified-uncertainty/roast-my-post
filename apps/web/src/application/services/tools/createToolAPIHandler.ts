import { NextRequest, NextResponse } from 'next/server';
import { Tool } from '@roast/ai';
import { logger } from '@/infrastructure/logging/logger';
import { auth } from '@/infrastructure/auth/auth';
import { config } from '@roast/domain';

/**
 * Creates an API route handler for a tool that users can execute.
 * This does NOT create new tools - it creates API endpoints for existing tools.
 * Users run/execute tools through these endpoints, they don't create new tools.
 * 
 * @param tool - The pre-defined tool instance from @roast/ai package
 * @returns A Next.js POST route handler that executes the tool
 */
export function createToolAPIHandler(tool: Tool<any, any>) {
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
  
  return POST;
}

// Export the legacy name for backwards compatibility
// TODO: Remove this once all usages are updated
export const createToolRoute = createToolAPIHandler;