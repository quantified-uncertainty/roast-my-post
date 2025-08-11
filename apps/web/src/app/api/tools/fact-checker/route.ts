import { createToolAPIHandler } from '@/application/services/tools/createToolAPIHandler';
import { multiFactCheckerTool } from '@roast/ai/server';

export const POST = createToolAPIHandler(multiFactCheckerTool);
