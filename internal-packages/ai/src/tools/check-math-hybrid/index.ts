import { Tool, ToolContext } from '../base/Tool';
import { CheckMathHybridInput, CheckMathHybridOutput } from './types';
import { inputSchema, outputSchema } from './schemas';
import { checkMathWithMathJsTool } from '../check-math-with-mathjs';
import { checkMathTool } from '../check-math';
import { escapeXml } from '../../shared/utils/xml';

export class CheckMathHybridTool extends Tool<CheckMathHybridInput, CheckMathHybridOutput> {
  config = {
    id: 'check-math-hybrid',
    name: 'Hybrid Mathematical Checker',
    description: 'Simple wrapper: try MathJS first, then LLM as fallback',
    version: '1.0.0',
    category: 'analysis' as const,
    costEstimate: '~$0.01-0.03 per check (computational + optional LLM)',
    path: '/tools/check-math-hybrid',
    status: 'stable' as const
  };
  
  inputSchema = inputSchema as any;
  outputSchema = outputSchema as any;
  
  async execute(input: CheckMathHybridInput, context: ToolContext): Promise<CheckMathHybridOutput> {
    const startTime = Date.now();
    context.logger.info(`[CheckMathHybridTool] Analyzing statement: "${input.statement}"`);
    
    try {
      // Step 1: Try MathJS first
      const mathJsResult = await checkMathWithMathJsTool.execute({
        statement: input.statement,
        context: input.context
      }, context);
      
      let llmResult: any = null;
      let toolsUsed: Array<'mathjs' | 'llm'> = ['mathjs'];
      let finalStatus: 'verified_true' | 'verified_false' | 'verified_warning' | 'cannot_verify' = mathJsResult.status;
      let explanation = mathJsResult.explanation;
      let verifiedBy: 'mathjs' | 'llm' | 'both' = 'mathjs';
      
      // Step 2: If MathJS can't verify, fall back to LLM for conceptual analysis
      if (mathJsResult.status === 'cannot_verify') {
        context.logger.info('[CheckMathHybridTool] MathJS could not verify, trying LLM for conceptual analysis...');
        llmResult = await checkMathTool.execute({
          statement: input.statement,
          context: input.context
        }, context);
        
        toolsUsed.push('llm');
        finalStatus = llmResult.status;
        explanation = llmResult.explanation;
        verifiedBy = 'llm';
      }
      
      // Extract display correction from either tool
      let displayCorrection: string | undefined;
      if (mathJsResult.status === 'verified_false' && mathJsResult.errorDetails?.actualValue && mathJsResult.errorDetails?.expectedValue) {
        displayCorrection = `<r:replace from="${escapeXml(mathJsResult.errorDetails.actualValue)}" to="${escapeXml(mathJsResult.errorDetails.expectedValue)}"/>`;
      } else if (llmResult?.errorDetails?.displayCorrection) {
        displayCorrection = llmResult.errorDetails.displayCorrection;
      }

      return {
        statement: input.statement,
        status: finalStatus,
        explanation,
        verifiedBy,
        mathJsResult: mathJsResult.status !== 'cannot_verify' ? {
          status: mathJsResult.status,
          explanation: mathJsResult.explanation,
          mathJsExpression: mathJsResult.verificationDetails?.mathJsExpression,
          computedValue: mathJsResult.verificationDetails?.computedValue,
          steps: mathJsResult.verificationDetails?.steps,
          error: mathJsResult.error
        } : undefined,
        llmResult: llmResult ? {
          status: llmResult.status,
          explanation: llmResult.explanation,
          errorType: llmResult.errorDetails?.errorType,
          severity: llmResult.errorDetails?.severity,
          reasoning: llmResult.reasoning
        } : undefined,
        displayCorrection,
        toolsUsed
      };
      
    } catch (error) {
      context.logger.error('[CheckMathHybridTool] Error in hybrid math check:', error);
      return {
        statement: input.statement,
        status: 'cannot_verify',
        explanation: 'Failed to verify the mathematical statement due to a technical error.',
        verifiedBy: 'mathjs',
        toolsUsed: ['mathjs']
      };
    }
  }
  
  override async beforeExecute(input: CheckMathHybridInput, context: ToolContext): Promise<void> {
    context.logger.info(`[CheckMathHybridTool] Starting hybrid mathematical verification for statement: "${input.statement}"`);
  }
  
  override async afterExecute(output: CheckMathHybridOutput, context: ToolContext): Promise<void> {
    context.logger.info(`[CheckMathHybridTool] Verification result: ${output.status} (verified by: ${output.verifiedBy})`);
  }

  getToolDependencies() {
    return [checkMathWithMathJsTool, checkMathTool];
  }
}

// Export singleton instance
export const checkMathHybridTool = new CheckMathHybridTool();
export default checkMathHybridTool;