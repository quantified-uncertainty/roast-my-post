import { createToolRoute } from '@/tools/base/createToolRoute';
import forecasterTool from '@/tools/forecaster';

export const POST = createToolRoute(forecasterTool);