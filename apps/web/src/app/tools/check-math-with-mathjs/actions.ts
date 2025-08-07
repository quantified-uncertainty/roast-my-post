'use server';

import { checkMathWithMathJsTool } from '@roast/ai/server';
import { auth } from '@/infrastructure/auth/auth';
import { logger } from '@/infrastructure/logging/logger';

export async function checkMathWithMathJs(text: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }

  try {
    const result = await checkMathWithMathJsTool.execute(
      { statement: text },
      { userId: session.user.id, logger }
    );
    return result;
  } catch (error) {
    logger.error('Check math with MathJS error:', error);
    throw error;
  }
}
