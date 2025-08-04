import { createToolRoute } from '@/lib/tools/createToolRoute';
import { fuzzyTextLocatorTool } from '@roast/ai/server';

export const POST = createToolRoute(fuzzyTextLocatorTool);
