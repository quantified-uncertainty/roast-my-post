import { z } from 'zod';
import { Tool, ToolContext } from '../base/Tool';
import type { LanguageConvention } from '../../shared/types';
import { detectLanguageConvention, detectDocumentType } from './conventionDetector';

export interface DetectLanguageConventionInput {
  text: string;
  sampleSize?: number;
}

export interface DetectLanguageConventionOutput {
  convention: LanguageConvention;
  confidence: number;
  consistency: number;
  evidence: Array<{
    word: string;
    convention: LanguageConvention;
    count: number;
  }>;
  documentType?: {
    type: 'academic' | 'technical' | 'blog' | 'casual' | 'unknown';
    confidence: number;
  };
}

// Input schema
const inputSchema = z.object({
  text: z.string().min(1).max(500000).describe('The text to analyze for language convention (multiline)'),
  // sampleSize is internal - not exposed to UI
}) satisfies z.ZodType<Omit<DetectLanguageConventionInput, 'sampleSize'>>;

// Output schema
const outputSchema = z.object({
  convention: z.enum(['US', 'UK']).describe('Dominant language convention'),
  confidence: z.number().min(0).max(1).describe('Confidence in the detection (0-1)'),
  consistency: z.number().min(0).max(1).describe('How consistent the document is (0-1)'),
  evidence: z.array(z.object({
    word: z.string().describe('Example word found'),
    convention: z.enum(['US', 'UK'] as const).describe('Which convention this word belongs to'),
    count: z.number().describe('Number of occurrences')
  })).describe('Evidence supporting the detection'),
  documentType: z.object({
    type: z.enum(['academic', 'technical', 'blog', 'casual', 'unknown']).describe('Type of document'),
    confidence: z.number().min(0).max(1).describe('Confidence in document type detection')
  }).optional().describe('Detected document type')
});

export class DetectLanguageConventionTool extends Tool<DetectLanguageConventionInput, DetectLanguageConventionOutput> {
  config = {
    id: 'detect-language-convention',
    name: 'Detect Language Convention',
    description: 'Detect whether text uses US or UK English conventions',
    version: '1.0.0',
    category: 'analysis' as const,
    path: '/tools/detect-language-convention',
    status: 'stable' as const,
    costEstimate: '~$0.00 (no LLM calls)',
    inputSchema,
    outputSchema,
  };
  
  inputSchema = inputSchema;
  outputSchema = outputSchema as any;

  async execute(
    input: DetectLanguageConventionInput,
    context: ToolContext
  ): Promise<DetectLanguageConventionOutput> {
    context.logger.info('Detecting language convention', {
      textLength: input.text.length,
      sampleSize: input.sampleSize || 2000
    });

    // Use the sample size to analyze a portion of the text
    const sampleSize = Math.min(input.sampleSize || 2000, input.text.length);
    const sample = input.text.slice(0, sampleSize);
    
    // Detect language convention
    const conventionResult = detectLanguageConvention(sample);
    
    // Also detect document type for additional context
    const documentTypeResult = detectDocumentType(sample);
    
    context.logger.info('Convention detected', {
      convention: conventionResult.convention,
      confidence: conventionResult.confidence,
      evidenceCount: conventionResult.evidence.length,
      documentType: documentTypeResult.type
    });

    return {
      convention: conventionResult.convention,
      confidence: conventionResult.confidence,
      consistency: conventionResult.consistency,
      evidence: conventionResult.evidence.slice(0, 10), // Limit to top 10 evidence items
      documentType: {
        type: documentTypeResult.type,
        confidence: documentTypeResult.confidence
      }
    };
  }
}

// Export singleton instance
export const detectLanguageConventionTool = new DetectLanguageConventionTool();