import { createToolAPIHandler } from '@/application/services/tools/createToolAPIHandler';
import { extractForecastingClaimsTool } from '@roast/ai/server';

export const POST = createToolAPIHandler(extractForecastingClaimsTool);
