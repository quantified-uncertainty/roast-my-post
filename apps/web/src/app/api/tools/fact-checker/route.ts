import { createToolRoute } from '@/application/services/tools/createToolRoute';
import { factCheckerTool } from '@roast/ai/server';

export const POST = createToolRoute(factCheckerTool);
