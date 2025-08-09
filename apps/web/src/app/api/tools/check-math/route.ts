import { createToolRoute } from '@/application/services/tools/createToolRoute';
import { checkMathTool } from '@roast/ai/server';

export const { GET, POST } = createToolRoute(checkMathTool);
