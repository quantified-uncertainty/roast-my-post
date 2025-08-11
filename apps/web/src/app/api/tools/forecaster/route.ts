import { createToolAPIHandler } from '@/application/services/tools/createToolAPIHandler';
import { forecasterTool } from '@roast/ai/server';

export const POST = createToolAPIHandler(forecasterTool);
