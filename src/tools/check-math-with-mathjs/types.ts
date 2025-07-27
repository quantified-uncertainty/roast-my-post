import { z } from 'zod';
import { inputSchema, outputSchema } from './schemas';

export interface MathError {
  lineStart: number;
  lineEnd: number;
  highlightedText: string;
  description: string;
  errorType: 'calculation' | 'logic' | 'unit' | 'notation' | 'conceptual';
  severity: 'critical' | 'major' | 'minor';
  conciseCorrection?: string;
  verificationResult?: {
    evaluated: boolean;
    expectedValue?: string;
    actualValue?: string;
    error?: string;
    steps?: Array<{
      expression: string;
      result: string;
      description?: string;
    }>;
    copyableExpression?: string; // Full expression for copy-paste
  };
}

export type CheckMathWithMathJsInput = z.infer<typeof inputSchema>;
export type CheckMathWithMathJsOutput = z.infer<typeof outputSchema>;