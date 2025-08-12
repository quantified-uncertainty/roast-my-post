import { createToolAPIHandler } from '@/application/services/tools/createToolAPIHandler';
import { documentChunkerTool } from '@roast/ai/server';

export const POST = createToolAPIHandler(documentChunkerTool);