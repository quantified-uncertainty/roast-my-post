import { createToolRoute } from '@/tools/base/createToolRoute';
import checkMathHybridTool from '@/tools/check-math-hybrid';

export const POST = createToolRoute(checkMathHybridTool);