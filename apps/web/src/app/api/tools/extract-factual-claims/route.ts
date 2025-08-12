import { createToolAPIHandler } from '@/application/services/tools/createToolAPIHandler';
import { extractFactualClaimsTool } from '@roast/ai/server';

export const POST = createToolAPIHandler(extractFactualClaimsTool);
