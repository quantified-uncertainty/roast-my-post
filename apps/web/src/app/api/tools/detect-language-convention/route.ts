import { createToolRoute } from '@/application/services/tools/createToolRoute';
import { detectLanguageConventionTool } from '@roast/ai/server';

export const { GET, POST } = createToolRoute(detectLanguageConventionTool);
