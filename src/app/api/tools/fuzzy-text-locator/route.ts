import { createToolRoute } from '@/tools/base/createToolRoute';
import fuzzyTextLocatorTool from '@/tools/fuzzy-text-locator';

export const POST = createToolRoute(fuzzyTextLocatorTool);