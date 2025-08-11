import { createToolAPIHandler } from '@/application/services/tools/createToolAPIHandler';
import { checkMathHybridTool } from '@roast/ai/server';

export const POST = createToolAPIHandler(checkMathHybridTool);
