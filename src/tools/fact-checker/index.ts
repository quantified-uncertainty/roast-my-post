import { z } from 'zod';
import { Tool, ToolContext } from '../base/Tool';
import { RichLLMInteraction } from '@/types/llm';
import { callClaudeWithTool } from '@/lib/claude/wrapper';
import { sessionContext } from '@/lib/helicone/sessionContext';
import { createHeliconeHeaders } from '@/lib/helicone/sessions';

const inputSchema = z.object({
  claim: z.string().min(1).max(1000).describe('The factual claim to verify'),
  context: z.string().max(5000).optional().describe('Additional context about the claim'),
  searchForEvidence: z.boolean().default(false).describe('Whether to search for additional evidence')
}) satisfies z.ZodType<FactCheckerInput>;

const factCheckResultSchema = z.object({
  verdict: z.enum(['true', 'false', 'partially-true', 'unverifiable', 'outdated']),
  confidence: z.enum(['high', 'medium', 'low']),
  explanation: z.string(),
  evidence: z.array(z.string()),
  corrections: z.string().optional(),
  lastVerified: z.string().optional(),
  sources: z.array(z.object({
    title: z.string(),
    url: z.string()
  })).optional()
});

const outputSchema = z.object({
  result: factCheckResultSchema.describe('The fact-check verdict and details'),
  researchNotes: z.string().optional().describe('Additional research notes if evidence was searched'),
  llmInteraction: z.any().describe('LLM interaction for monitoring')
}) satisfies z.ZodType<FactCheckerOutput>;

// Export types
export type FactCheckResult = z.infer<typeof factCheckResultSchema>;

export interface FactCheckerInput {
  claim: string;
  context?: string;
  searchForEvidence?: boolean;
}

export interface FactCheckerOutput {
  result: FactCheckResult;
  researchNotes?: string;
  llmInteraction?: any;
}

export class FactCheckerTool extends Tool<FactCheckerInput, FactCheckerOutput> {
  config = {
    id: 'fact-checker',
    name: 'Fact Checker',
    description: 'Verify the accuracy of specific factual claims',
    version: '1.0.0',
    category: 'analysis' as const,
    costEstimate: '~$0.01-0.02 per claim',
    path: '/tools/fact-checker',
    status: 'stable' as const
  };
  
  inputSchema = inputSchema;
  outputSchema = outputSchema;
  
  async execute(input: FactCheckerInput, context: ToolContext): Promise<FactCheckerOutput> {
    context.logger.info(`[FactChecker] Verifying claim: "${input.claim}"`);
    
    // Get session context if available
    const currentSession = sessionContext.getSession();
    const sessionConfig = currentSession ? 
      sessionContext.withPath('/plugins/fact-check/fact-checker-verify') : 
      undefined;
    const heliconeHeaders = sessionConfig ? 
      createHeliconeHeaders(sessionConfig) : 
      undefined;
    
    const systemPrompt = `You are an expert fact-checker. Your job is to verify the accuracy of specific factual claims.
    
Today's date is ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.

For each claim, you should:
1. Assess whether the claim is true, false, partially true, unverifiable, or outdated
2. Provide your confidence level (high, medium, low)
3. Explain your reasoning with specific evidence
4. If false or partially true, provide corrections
5. Note when the information was last verified if relevant

Verdict definitions:
- **true**: The claim is accurate and supported by reliable evidence
- **false**: The claim is demonstrably incorrect
- **partially-true**: Some aspects are true but important details are wrong or missing
- **unverifiable**: Cannot be verified with available information
- **outdated**: Was true at some point but is no longer current

Confidence levels:
- **high**: Multiple reliable sources confirm, or it's well-established fact
- **medium**: Good evidence but some uncertainty remains
- **low**: Limited evidence available or conflicting information

Be especially careful with:
- Numbers and statistics (check if they're current)
- Historical dates and events
- Scientific facts and consensus
- Claims about current events (note your knowledge cutoff)`;

    const userPrompt = `<task>
  <instruction>Fact-check this claim</instruction>
  
  <claim>
${input.claim}
  </claim>
  
  ${input.context ? `<context>\n${input.context}\n  </context>\n  ` : ''}
  <requirements>
    Verify the accuracy of this factual claim and provide a verdict with confidence level and evidence.
  </requirements>
</task>`;
    
    const result = await callClaudeWithTool<FactCheckResult>({
      system: systemPrompt,
      messages: [{
        role: "user",
        content: userPrompt
      }],
      max_tokens: 1000,
      temperature: 0,
      toolName: "fact_check",
      toolDescription: "Verify the accuracy of a factual claim",
      toolSchema: {
        type: "object",
        properties: {
          verdict: {
            type: "string",
            enum: ["true", "false", "partially-true", "unverifiable", "outdated"],
            description: "The fact-check verdict"
          },
          confidence: {
            type: "string",
            enum: ["high", "medium", "low"],
            description: "Confidence level in the verdict"
          },
          explanation: {
            type: "string",
            description: "Detailed explanation of the verdict with reasoning"
          },
          evidence: {
            type: "array",
            items: { type: "string" },
            description: "Key pieces of evidence supporting the verdict"
          },
          corrections: {
            type: "string",
            description: "Corrected version of the claim if false or partially true"
          },
          lastVerified: {
            type: "string",
            description: "When this information was last verified (if relevant)"
          }
        },
        required: ["verdict", "confidence", "explanation", "evidence"]
      },
      heliconeHeaders,
      enablePromptCaching: true
    });
    
    context.logger.info(`[FactChecker] Verdict: ${result.toolResult.verdict} (${result.toolResult.confidence} confidence)`);
    
    return {
      result: result.toolResult,
      llmInteraction: result.interaction
    };
  }
  
  override async beforeExecute(input: FactCheckerInput, context: ToolContext): Promise<void> {
    context.logger.info(`[FactChecker] Starting fact-check for claim: "${input.claim}"`);
  }
  
  override async afterExecute(output: FactCheckerOutput, context: ToolContext): Promise<void> {
    context.logger.info(`[FactChecker] Completed: ${output.result.verdict} verdict`);
  }
}

// Export singleton instance
export const factCheckerTool = new FactCheckerTool();
export default factCheckerTool;