import { createToolRoute } from '@/lib/tools/createToolRoute';
import { forecasterTool } from '@roast/ai/server';

export const POST = createToolRoute(forecasterTool);
