import { createToolRoute } from '@/application/services/tools/createToolRoute';
import { documentChunkerTool } from '@roast/ai/server';

export const POST = createToolRoute(documentChunkerTool);