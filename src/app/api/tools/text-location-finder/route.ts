import { createToolRoute } from '@/tools/base/createToolRoute';
import textLocationFinderTool from '@/tools/text-location-finder';

export const POST = createToolRoute(textLocationFinderTool);