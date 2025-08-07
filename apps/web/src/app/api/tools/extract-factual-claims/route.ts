import { createToolRoute } from '@/application/services/tools/createToolRoute';
import { extractFactualClaimsTool } from '@roast/ai/server';

export const POST = createToolRoute(extractFactualClaimsTool);
