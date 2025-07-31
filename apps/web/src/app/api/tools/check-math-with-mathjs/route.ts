import { createToolRoute } from '@/tools/base/createToolRoute';
import CheckMathWithMathJsTool from '@/tools/check-math-with-mathjs';

export const POST = createToolRoute(CheckMathWithMathJsTool);