import { createToolAPIHandler } from '@/application/services/tools/createToolAPIHandler';
import { detectLanguageConventionTool } from '@roast/ai/server';

export const POST = createToolAPIHandler(detectLanguageConventionTool);
