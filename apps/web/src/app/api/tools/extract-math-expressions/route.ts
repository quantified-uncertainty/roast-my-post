import { createToolRoute } from '@/lib/tools/createToolRoute';
import { extractMathExpressionsTool } from '@roast/ai';

export const POST = createToolRoute(extractMathExpressionsTool);
