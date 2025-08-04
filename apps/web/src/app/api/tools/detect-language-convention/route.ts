import { createToolRoute } from '@/lib/tools/createToolRoute';
import { detectLanguageConventionTool } from '@roast/ai/server';

export const POST = createToolRoute(detectLanguageConventionTool);
