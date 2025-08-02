import { createToolRoute } from '@/lib/tools/createToolRoute';
import { checkMathWithMathJsTool } from '@roast/ai';

export const POST = createToolRoute(checkMathWithMathJsTool);
