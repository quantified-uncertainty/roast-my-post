import { createToolRoute } from '@/tools/base/createToolRoute';
import perplexityResearchTool from '@/tools/perplexity-research';

export const POST = createToolRoute(perplexityResearchTool);