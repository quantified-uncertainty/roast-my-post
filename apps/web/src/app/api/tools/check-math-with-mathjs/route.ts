import { createToolRoute } from '@/application/services/tools/createToolRoute';
import { checkMathWithMathJsTool } from '@roast/ai/server';

export const { GET, POST } = createToolRoute(checkMathWithMathJsTool);
