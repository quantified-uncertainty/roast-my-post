import { createToolRoute } from '@/tools/base/createToolRoute';
import CheckSpellingGrammarTool from '@/tools/check-spelling-grammar';

export const POST = createToolRoute(CheckSpellingGrammarTool);