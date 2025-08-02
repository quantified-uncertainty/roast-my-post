import { createToolRoute } from '@/lib/tools/createToolRoute';
import { factCheckerTool } from '@roast/ai';

export const POST = createToolRoute(factCheckerTool);
