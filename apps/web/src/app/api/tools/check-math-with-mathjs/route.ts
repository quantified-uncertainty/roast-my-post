import { createToolAPIHandler } from '@/application/services/tools/createToolAPIHandler';
import { checkMathWithMathJsTool } from '@roast/ai/server';

export const POST = createToolAPIHandler(checkMathWithMathJsTool);
