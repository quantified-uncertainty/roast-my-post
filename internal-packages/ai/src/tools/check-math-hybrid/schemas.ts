import { z } from 'zod';

// Input schema - single mathematical statement
export const inputSchema = z.object({
  statement: z.string().min(1).max(1000).describe('A single mathematical statement to verify (e.g., "2 + 2 = 4" or "The square root of 16 is 4")'),
  context: z.string().max(500).optional().describe('Additional context about the statement')
});

// Output schema - hybrid verification result
export const outputSchema = z.object({
  statement: z.string().describe('The original statement that was verified'),
  status: z.enum(['verified_true', 'verified_false', 'verified_warning', 'cannot_verify']).describe('Hybrid verification result'),
  explanation: z.string().describe('Clear explanation of the verification result'),
  verifiedBy: z.enum(['mathjs', 'llm', 'both']).describe('Which tool(s) provided the verification'),
  mathJsResult: z.object({
    status: z.enum(['verified_true', 'verified_false', 'verified_warning', 'cannot_verify']).describe('MathJS verification result'),
    explanation: z.string().describe('MathJS explanation'),
    mathJsExpression: z.string().optional().describe('The MathJS expression used'),
    computedValue: z.string().optional().describe('Computed value from MathJS'),
    steps: z.array(z.object({
      expression: z.string().describe('Mathematical expression'),
      result: z.string().describe('Result of the expression')
    })).optional().describe('Step-by-step calculation'),
    error: z.string().optional().describe('Technical error if verification failed')
  }).optional().describe('MathJS verification details'),
  llmResult: z.object({
    status: z.enum(['verified_true', 'verified_false', 'cannot_verify']).describe('LLM analysis result'),
    explanation: z.string().describe('LLM explanation'),
    errorType: z.enum(['calculation', 'logic', 'unit', 'notation', 'conceptual']).optional().describe('Type of error if found'),
    severity: z.enum(['critical', 'major', 'minor']).optional().describe('Severity if error found'),
    reasoning: z.string().describe('Detailed reasoning')
  }).optional().describe('LLM analysis details'),
  conciseCorrection: z.string().optional().describe('Concise summary of the correction (e.g., "45 → 234", "4x → 5x")'),
  toolsUsed: z.array(z.enum(['mathjs', 'llm'])).describe('Which tools were used')
});