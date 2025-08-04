import { createToolRoute } from '@/lib/tools/createToolRoute';
import { checkMathTool } from '@roast/ai/server';

export const POST = createToolRoute(checkMathTool);
