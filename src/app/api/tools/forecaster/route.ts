import { createToolRoute } from '@/tools/base/createToolRoute';
import ForecasterTool from '@/tools/forecaster';

export const POST = createToolRoute(ForecasterTool);