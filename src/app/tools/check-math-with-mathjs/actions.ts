'use server';

import checkMathWithMathJsTool from '@/tools/check-math-with-mathjs';
import { logger } from '@/lib/logger';

export async function checkMathWithMathJs(input: { statement: string; context?: string }) {
  try {
    // Use the tool directly server-side with a system context
    const result = await checkMathWithMathJsTool.run(input, {
      userId: 'system-ui', // Use a system user for UI operations
      logger,
      apiKey: process.env.ROAST_MY_POST_MCP_USER_API_KEY
    });
    
    return { success: true, result };
  } catch (error) {
    logger.error('[checkMathWithMathJs] Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}