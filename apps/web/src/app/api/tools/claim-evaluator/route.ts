import { createToolAPIHandler } from '@/application/services/tools/createToolAPIHandler';
import { claimEvaluatorTool } from '@roast/ai/server';

export const POST = createToolAPIHandler(claimEvaluatorTool);
