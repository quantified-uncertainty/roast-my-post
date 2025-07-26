import { createToolRoute } from '@/tools/base/createToolRoute';
import FactCheckerTool from '@/tools/fact-checker';

export const POST = createToolRoute(FactCheckerTool);