import { createToolRoute } from '@/lib/tools/createToolRoute';
import { perplexityResearchTool } from '@roast/ai/server';

export const POST = createToolRoute(perplexityResearchTool);
