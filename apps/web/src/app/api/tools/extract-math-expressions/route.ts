import { createToolRoute } from '@/application/services/tools/createToolRoute';
import { extractMathExpressionsTool } from '@roast/ai/server';

export const { GET, POST } = createToolRoute(extractMathExpressionsTool);
