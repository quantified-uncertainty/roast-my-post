import { createToolRoute } from '@/lib/tools/createToolRoute';
import { checkMathHybridTool } from '@roast/ai';

export const POST = createToolRoute(checkMathHybridTool);
