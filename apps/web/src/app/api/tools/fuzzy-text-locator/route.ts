import { createToolRoute } from '@/application/services/tools/createToolRoute';
import { fuzzyTextLocatorTool } from '@roast/ai/server';

export const POST = createToolRoute(fuzzyTextLocatorTool);
