import { createToolRoute } from '@/application/services/tools/createToolRoute';
import { checkMathHybridTool } from '@roast/ai/server';

export const POST = createToolRoute(checkMathHybridTool);
