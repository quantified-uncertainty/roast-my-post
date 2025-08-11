import { createToolAPIHandler } from '@/application/services/tools/createToolAPIHandler';
import { extractMathExpressionsTool } from '@roast/ai/server';

export const POST = createToolAPIHandler(extractMathExpressionsTool);
