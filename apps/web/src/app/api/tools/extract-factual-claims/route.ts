import { createToolRoute } from '@/lib/tools/createToolRoute';
import { extractFactualClaimsTool } from '@roast/ai/server';

export const POST = createToolRoute(extractFactualClaimsTool);
