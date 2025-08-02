import { createToolRoute } from '@/lib/tools/createToolRoute';
import { checkMathTool } from '@roast/ai';

export const POST = createToolRoute(checkMathTool);
