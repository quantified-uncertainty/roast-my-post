import { createToolRoute } from '@/lib/tools/createToolRoute';
import { extractMathExpressionsTool } from '@roast/ai/server';

export const POST = createToolRoute(extractMathExpressionsTool);
