import { createToolRoute } from '@/lib/tools/createToolRoute';
import { linkValidator } from '@roast/ai/server';

export const POST = createToolRoute(linkValidator);
