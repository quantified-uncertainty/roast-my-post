import { createToolRoute } from '@/lib/tools/createToolRoute';
import { checkMathWithMathJsTool } from '@roast/ai/server';

export const POST = createToolRoute(checkMathWithMathJsTool);
