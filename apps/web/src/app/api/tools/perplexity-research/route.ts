import { createToolRoute } from '@/application/services/tools/createToolRoute';
import { perplexityResearchTool } from '@roast/ai/server';

export const { GET, POST } = createToolRoute(perplexityResearchTool);
