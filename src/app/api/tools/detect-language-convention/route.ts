import { createToolRoute } from '@/tools/base/createToolRoute';
import { detectLanguageConventionTool } from '@/tools/detect-language-convention';

export const POST = createToolRoute(detectLanguageConventionTool);