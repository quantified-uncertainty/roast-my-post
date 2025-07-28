import { z } from 'zod';
import { llmInteractionSchema } from '@/types/llmSchema';

// Input schema - single mathematical statement
export const inputSchema = z.object({
  statement: z.string().min(1).max(1000).describe('A mathematical statement to verify'),
  context: z.string().max(500).optional().describe('Additional context about the statement')
});

// Output schema - agentic verification result
export const outputSchema = z.object({
  statement: z.string().describe('The original statement'),
  status: z.enum(['verified_true', 'verified_false', 'cannot_verify']).describe('Verification result'),
  explanation: z.string().describe('Clear explanation of the verification result'),
  verificationDetails: z.object({
    mathJsExpression: z.string().optional(),
    computedValue: z.string().optional(),
    steps: z.array(z.object({
      expression: z.string(),
      result: z.string()
    })).optional()
  }).optional(),
  errorDetails: z.object({
    errorType: z.enum(['calculation', 'logic', 'unit', 'notation', 'conceptual']),
    severity: z.enum(['critical', 'major', 'minor']),
    conciseCorrection: z.string().optional(),
    expectedValue: z.string().optional(),
    actualValue: z.string().optional()
  }).optional(),
  agentReasoning: z.string().optional().describe('The agent\'s reasoning process'),
  toolCalls: z.array(z.object({
    tool: z.string(),
    input: z.any(),
    output: z.any()
  })).optional().describe('Record of tool calls made by the agent'),
  llmInteraction: llmInteractionSchema
});