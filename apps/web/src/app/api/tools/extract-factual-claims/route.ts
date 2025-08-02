import { createToolRoute } from '@/lib/tools/createToolRoute';
import { extractFactualClaimsTool } from '@roast/ai';

export const POST = createToolRoute(extractFactualClaimsTool);
