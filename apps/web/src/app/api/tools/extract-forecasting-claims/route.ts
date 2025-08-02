import { createToolRoute } from '@/lib/tools/createToolRoute';
import { extractForecastingClaimsTool } from '@roast/ai';

export const POST = createToolRoute(extractForecastingClaimsTool);
