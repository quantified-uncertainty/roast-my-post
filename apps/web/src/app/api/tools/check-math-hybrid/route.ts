import { createToolRoute } from '@/application/services/tools/createToolRoute';
import { checkMathHybridTool } from '@roast/ai/server';

export const { GET, POST } = createToolRoute(checkMathHybridTool);
