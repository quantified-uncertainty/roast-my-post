import { createToolRoute } from '@/lib/tools/createToolRoute';
import { extractForecastingClaimsTool } from '@roast/ai/server';

export const POST = createToolRoute(extractForecastingClaimsTool);
