import { createToolRoute } from '@/application/services/tools/createToolRoute';
import { extractFactualClaimsTool } from '@roast/ai/server';

export const { GET, POST } = createToolRoute(extractFactualClaimsTool);
