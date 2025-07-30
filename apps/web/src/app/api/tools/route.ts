import { NextResponse } from 'next/server';
import { toolRegistry } from '@/tools/registry';
import { withSecurity } from '@/lib/security-middleware';

export const GET = withSecurity(
  async () => {
    const tools = toolRegistry.getMetadata();
    
    return NextResponse.json({
      tools,
      categories: {
        analysis: toolRegistry.getByCategory('analysis').length,
        research: toolRegistry.getByCategory('research').length,
        utility: toolRegistry.getByCategory('utility').length
      }
    });
  },
  {
    requireAuth: true,
    rateLimit: true
  }
);