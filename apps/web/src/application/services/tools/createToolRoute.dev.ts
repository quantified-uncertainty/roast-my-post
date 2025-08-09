import { NextRequest, NextResponse } from 'next/server';
import { Tool } from '@roast/ai';
import { logger } from '@/infrastructure/logging/logger';
import { auth } from '@/infrastructure/auth/auth';
import { config } from '@roast/domain';

/**
 * Development version of createToolRoute that bypasses authentication
 * when BYPASS_TOOL_AUTH=true environment variable is set
 */
export function createToolRoute(tool: Tool<any, any>) {
  return async function POST(request: NextRequest) {
    try {
      let userId: string;
      
      // Check if we should bypass auth in development
      const bypassAuth = process.env.BYPASS_TOOL_AUTH === 'true' && config.env.isDevelopment;
      
      if (bypassAuth) {
        // Use a default test user ID or create one
        logger.info(`Bypassing authentication for ${tool.config.name} tool in development`);
        
        // Import prisma dynamically to avoid issues
        const { prisma } = await import('@roast/db');
        
        // Find or create a test user
        let testUser = await prisma.user.findFirst({
          where: { email: 'tool-test@dev.local' }
        });
        
        if (!testUser) {
          testUser = await prisma.user.create({
            data: {
              id: 'tool-test-user',
              email: 'tool-test@dev.local',
              name: 'Tool Test User',
              role: 'USER'
            }
          });
        }
        
        userId = testUser.id;
      } else {
        // Normal authentication check
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
}