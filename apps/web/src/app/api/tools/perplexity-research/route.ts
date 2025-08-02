import { createToolRoute } from '@/lib/tools/createToolRoute';
import { perplexityResearchTool } from '@roast/ai';

export const POST = createToolRoute(perplexityResearchTool);
