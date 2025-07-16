import { createToolRoute } from '@/tools/base/createToolRoute';
import FactCheckTool from '@/tools/fact-check';

export const POST = createToolRoute(FactCheckTool);