import { createToolRoute } from '@/tools/base/createToolRoute';
import extractForecastingClaimsTool from '@/tools/extract-forecasting-claims';

export const POST = createToolRoute(extractForecastingClaimsTool);