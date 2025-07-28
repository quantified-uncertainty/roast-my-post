import { z } from 'zod';
import { Anthropic } from '@anthropic-ai/sdk';
import { 
  mathStatusSchema,
  mathExplanationSchema,
  mathVerificationDetailsSchema,
  mathErrorDetailsSchema
} from '@/tools/shared/math-schemas';

// Input schema - single mathematical statement
export const inputSchema = z.object({
  statement: z.string().min(1).max(1000).describe('A single mathematical statement to verify (e.g., "2 + 2 = 4" or "The square root of 16 is 4")'),
  context: z.string().max(500).optional().describe('Additional context about the statement')
});

// Output schema - simple verification result
export const outputSchema = z.object({
  statement: z.string().describe('The original statement that was verified'),
  status: z.enum(['verified_true', 'verified_false', 'cannot_verify']).describe('Verification result'),
  explanation: z.string().describe('Clear explanation of why the statement is true, false, or cannot be verified'),
  verificationDetails: z.object({
    mathJsExpression: z.string().optional().describe('The MathJS expression used for verification'),
    computedValue: z.string().optional().describe('The computed value from mathematical evaluation'),
    steps: z.array(z.object({
      expression: z.string().describe('Mathematical expression'),
      result: z.string().describe('Result of the expression')
    })).optional().describe('Step-by-step calculation')
  }).optional().describe('Details about how the verification was performed'),
  errorDetails: z.object({
    errorType: z.enum(['calculation', 'logic', 'unit', 'notation', 'conceptual']).describe('Type of mathematical error'),
    severity: z.enum(['critical', 'major', 'minor']).describe('Severity of the error'),
    conciseCorrection: z.string().describe('Concise summary of the correction (e.g., "45 → 234", "4x → 5x")'),
    expectedValue: z.string().optional().describe('The expected/correct value'),
    actualValue: z.string().optional().describe('The actual/incorrect value found in the statement')
  }).optional().describe('Details about the error (only present when status is verified_false)'),
  error: z.string().optional().describe('Technical error if verification failed')
});

// Tool schemas for Claude
export const verifyStatementToolSchema: Anthropic.Messages.Tool = {
  name: "verify_statement",
  description: "Verify a single mathematical statement using MathJS computation",
  input_schema: {
    type: "object" as const,
    properties: {
      statement: {
        type: "string",
        description: "A single mathematical statement to verify (e.g., '2 + 2 = 4', 'sqrt(16) = 4')"
      },
      mathJsExpression: {
        type: "string",
        description: "The MathJS expression to evaluate for verification"
      }
    },
    required: ["statement", "mathJsExpression"]
  }
};

export const getMathJsDocsToolSchema: Anthropic.Messages.Tool = {
  name: "get_mathjs_docs",
  description: "Get MathJS documentation for a specific topic",
  input_schema: {
    type: "object" as const,
    properties: {
      topic: {
        type: "string",
        description: "The topic to get documentation for (e.g., 'expressions', 'units', 'functions')"
      }
    },
    required: ["topic"]
  }
};

export const reportVerificationResultToolSchema: Anthropic.Messages.Tool = {
  name: "report_verification_result",
  description: "Report the final verification result for the mathematical statement",
  input_schema: {
    type: "object" as const,
    properties: {
      statement: {
        type: "string",
        description: "The original mathematical statement"
      },
      status: mathStatusSchema,
      explanation: mathExplanationSchema,
      verificationDetails: mathVerificationDetailsSchema,
      errorDetails: mathErrorDetailsSchema,
      error: {
        type: "string",
        description: "Technical error if verification failed"
      }
    },
    required: ["statement", "status", "explanation"]
  }
};