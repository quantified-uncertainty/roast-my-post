import { createToolRoute } from '@/application/services/tools/createToolRoute';
import { checkMathTool } from '@roast/ai/server';

export const POST = createToolRoute(checkMathTool);
