import { createToolAPIHandler } from '@/application/services/tools/createToolAPIHandler';
import { checkSpellingGrammarTool } from '@roast/ai/server';

export const POST = createToolAPIHandler(checkSpellingGrammarTool);
