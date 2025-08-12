import { createToolAPIHandler } from '@/application/services/tools/createToolAPIHandler';
import { perplexityResearchTool } from '@roast/ai/server';

export const POST = createToolAPIHandler(perplexityResearchTool);
