import { NextResponse } from 'next/server';
import { toolRegistry } from '@roast/ai';

export async function GET() {
  const tools = toolRegistry.getMetadata();
  return NextResponse.json(tools);
}
