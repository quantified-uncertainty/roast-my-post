import { createToolRoute } from '@/application/services/tools/createToolRoute';
import { linkValidator } from '@roast/ai/server';

export const { GET, POST } = createToolRoute(linkValidator);
