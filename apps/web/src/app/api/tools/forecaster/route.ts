import { createToolRoute } from '@/application/services/tools/createToolRoute';
import { forecasterTool } from '@roast/ai/server';

export const POST = createToolRoute(forecasterTool);
