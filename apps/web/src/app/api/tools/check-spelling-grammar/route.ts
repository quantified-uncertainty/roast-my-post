import { createToolRoute } from '@/lib/tools/createToolRoute';
import { checkSpellingGrammarTool } from '@roast/ai/server';

export const POST = createToolRoute(checkSpellingGrammarTool);
