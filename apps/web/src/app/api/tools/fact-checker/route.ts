import { createToolRoute } from '@/lib/tools/createToolRoute';
import { factCheckerTool } from '@roast/ai/server';

export const POST = createToolRoute(factCheckerTool);
