import { createToolAPIHandler } from '@/application/services/tools/createToolAPIHandler';
import { factCheckerTool } from '@roast/ai/server';

export const POST = createToolAPIHandler(factCheckerTool);
