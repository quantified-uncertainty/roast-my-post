import { createToolRoute } from '@/application/services/tools/createToolRoute';
import { linkValidator } from '@roast/ai/server';

export const POST = createToolRoute(linkValidator);
