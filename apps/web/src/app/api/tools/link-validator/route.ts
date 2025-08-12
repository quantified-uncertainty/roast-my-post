import { createToolAPIHandler } from '@/application/services/tools/createToolAPIHandler';
import { linkValidator } from '@roast/ai/server';

export const POST = createToolAPIHandler(linkValidator);
