import { createToolRoute } from '@/lib/tools/createToolRoute';
import { forecasterTool } from '@roast/ai';

export const POST = createToolRoute(forecasterTool);
