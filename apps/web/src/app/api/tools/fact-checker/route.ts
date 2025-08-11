import { createToolRoute } from '@/application/services/tools/createToolRoute';
import { multiFactCheckerTool } from '@roast/ai/server';

export const POST = createToolRoute(multiFactCheckerTool);
