import { createToolRoute } from '@/lib/tools/createToolRoute';
import { checkMathHybridTool } from '@roast/ai/server';

export const POST = createToolRoute(checkMathHybridTool);
