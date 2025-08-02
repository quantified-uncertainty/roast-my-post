import { createToolRoute } from '@/lib/tools/createToolRoute';
import { detectLanguageConventionTool } from '@roast/ai';

export const POST = createToolRoute(detectLanguageConventionTool);
