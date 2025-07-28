import { z } from 'zod';
import { 
  MathVerificationStatus, 
  MathErrorDetails, 
  MathVerificationDetails 
} from '@/tools/shared/math-schemas';
import { RichLLMInteraction } from '@/types/llm';

export interface CheckMathAgenticInput {
  statement: string;
  context?: string;
}

export interface CheckMathAgenticOutput {
  statement: string;
  status: MathVerificationStatus;
  explanation: string;
  reasoning: string;
  errorDetails?: {
    errorType: 'calculation' | 'logic' | 'unit' | 'notation' | 'conceptual';
    severity: 'critical' | 'major' | 'minor';
    conciseCorrection: string;
    expectedValue?: string;
    actualValue?: string;
  };
  llmInteraction: RichLLMInteraction;
}