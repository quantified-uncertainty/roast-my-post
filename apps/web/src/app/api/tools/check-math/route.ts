import { createToolAPIHandler } from '@/application/services/tools/createToolAPIHandler';
import { checkMathTool } from '@roast/ai/server';

export const POST = createToolAPIHandler(checkMathTool);
