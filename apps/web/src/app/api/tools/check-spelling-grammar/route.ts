import { createToolRoute } from '@/lib/tools/createToolRoute';
import { checkSpellingGrammarTool } from '@roast/ai';

export const POST = createToolRoute(checkSpellingGrammarTool);
