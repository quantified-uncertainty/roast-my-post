import { createToolRoute } from '@/application/services/tools/createToolRoute';
import { extractMathExpressionsTool } from '@roast/ai/server';

export const POST = createToolRoute(extractMathExpressionsTool);
