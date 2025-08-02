import { createToolRoute } from '@/lib/tools/createToolRoute';
import { fuzzyTextLocatorTool } from '@roast/ai';

export const POST = createToolRoute(fuzzyTextLocatorTool);
