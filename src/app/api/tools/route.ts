import { NextResponse } from 'next/server';
import { toolRegistry } from '@/tools/registry';

export async function GET() {
  const tools = toolRegistry.getMetadata();
  
  return NextResponse.json({
    tools,
    categories: {
      analysis: toolRegistry.getByCategory('analysis').length,
      research: toolRegistry.getByCategory('research').length,
      utility: toolRegistry.getByCategory('utility').length
    }
  });
}