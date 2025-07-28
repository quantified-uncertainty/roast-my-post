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
  verificationDetails?: MathVerificationDetails;
  errorDetails?: MathErrorDetails;
  error?: string;
  llmInteraction: RichLLMInteraction;
}