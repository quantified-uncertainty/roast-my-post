import { createToolRoute } from '@/application/services/tools/createToolRoute';
import { extractForecastingClaimsTool } from '@roast/ai/server';

export const POST = createToolRoute(extractForecastingClaimsTool);
