import { NextRequest } from 'next/server';
import { toolRegistry } from '@roast/ai/server';
import { createToolAPIHandler } from '@/application/services/tools/createToolAPIHandler';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Unified API route handler for all tools
 * Uses dynamic routing with [id] to handle all tool requests
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  
  // Get the tool from registry by ID
  const tool = toolRegistry.get(id);
  
  if (!tool) {
    return Response.json(
      { success: false, error: `Tool "${id}" not found` },
      { status: 404 }
    );
  }
  
  // Use the existing handler creator with all the logic
  const handler = createToolAPIHandler(tool);
  return handler(request);
}

