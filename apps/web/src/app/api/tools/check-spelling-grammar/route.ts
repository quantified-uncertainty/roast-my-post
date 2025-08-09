import { createToolRoute } from '@/application/services/tools/createToolRoute';
import { checkSpellingGrammarTool } from '@roast/ai/server';

export const { GET, POST } = createToolRoute(checkSpellingGrammarTool);
