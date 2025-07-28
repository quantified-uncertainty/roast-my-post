import { z } from 'zod';
import { llmInteractionSchema } from '@/types/llmSchema';

// Input schema - single mathematical statement
export const inputSchema = z.object({
  statement: z.string().min(1).max(1000).describe('A mathematical statement to verify'),
  context: z.string().max(500).optional().describe('Additional context about the statement')
});

// Output schema - agentic verification result
export const outputSchema = z.object({
  statement: z.string().describe('The original statement that was analyzed'),
  status: z.enum(['verified_true', 'verified_false', 'cannot_verify']).describe('Analysis result'),
  explanation: z.string().describe('Clear explanation of why the statement is true, false, or cannot be verified'),
  reasoning: z.string().describe('Detailed reasoning behind the analysis'),
  errorDetails: z.object({
    errorType: z.enum(['calculation', 'logic', 'unit', 'notation', 'conceptual']).describe('Type of mathematical error'),
    severity: z.enum(['critical', 'major', 'minor']).describe('Severity of the error'),
    conciseCorrection: z.string().describe('Concise summary of the correction (e.g., "45 → 234", "4x → 5x")'),
    expectedValue: z.string().optional().describe('The expected/correct value'),
    actualValue: z.string().optional().describe('The actual/incorrect value found in the statement')
  }).optional().describe('Details about the error (only present when status is verified_false)'),
  llmInteraction: llmInteractionSchema.describe('LLM interaction for monitoring and debugging')
});