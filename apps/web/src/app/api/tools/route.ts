import { NextResponse } from 'next/server';
import { toolRegistry } from '@roast/ai/server';

export async function GET() {
  const tools = toolRegistry.getMetadata();
  return NextResponse.json(tools);
}
