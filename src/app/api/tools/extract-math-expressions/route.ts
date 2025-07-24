import { createToolRoute } from '@/tools/base/createToolRoute';
import ExtractMathExpressionsTool from '@/tools/extract-math-expressions';

export const POST = createToolRoute(ExtractMathExpressionsTool);