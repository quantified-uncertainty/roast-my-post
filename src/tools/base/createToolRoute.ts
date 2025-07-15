import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Tool } from './Tool';
import { ToolResponse } from './types';
import { authenticateRequest } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';

export function createToolRoute<TInput, TOutput>(tool: Tool<TInput, TOutput>) {
  return async function POST(request: NextRequest): Promise<NextResponse<ToolResponse<TOutput>>> {
    try {
      const userId = await authenticateRequest(request);
      const body = await request.json();
      
      const context = {
        userId,
        logger,
        apiKey: request.headers.get('x-api-key') || undefined
      };
      
      const result = await tool.run(body, context);
      
      return NextResponse.json({
        success: true,
        toolId: tool.config.id,
        result
      });
      
    } catch (error) {
      logger.error(`Tool ${tool.config.id} error:`, error);
      
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { 
            success: false,
            toolId: tool.config.id,
            error: 'Invalid input', 
            details: error.errors 
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { 
          success: false,
          toolId: tool.config.id,
          error: 'Tool execution failed', 
          details: error instanceof Error ? error.message : 'Unknown error' 
        },
        { status: 500 }
      );
    }
  };
}