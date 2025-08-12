import { createToolAPIHandler } from '@/application/services/tools/createToolAPIHandler';
import { fuzzyTextLocatorTool } from '@roast/ai/server';

export const POST = createToolAPIHandler(fuzzyTextLocatorTool);
