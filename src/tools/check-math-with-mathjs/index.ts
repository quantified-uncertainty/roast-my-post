import { evaluate, format, parse } from 'mathjs';
import { Tool } from '../base/Tool';
import { logger } from '@/lib/logger';
import type { ToolContext } from '../base/Tool';
import { callClaude, MODEL_CONFIG } from '@/lib/claude/wrapper';
import { createAnthropicClient } from '@/types/openai';
import type { RichLLMInteraction } from '@/types/llm';
import type { 
  MathVerificationStatus, 
  MathErrorDetails, 
  MathVerificationDetails 
} from '@/tools/shared/math-schemas';
import { generateCacheSeed } from '@/tools/shared/cache-utils';
import { sessionContext } from '@/lib/helicone/sessionContext';
import { createHeliconeHeaders } from '@/lib/helicone/sessions';
import { Anthropic } from '@anthropic-ai/sdk';

// Import types and schemas
import { CheckMathAgenticInput, CheckMathAgenticOutput } from './types';
import { inputSchema, outputSchema } from './schemas';

// Helper function to build prompt string for logging
function buildPromptString(
  system: string | undefined,
  messages: Array<{ role: string; content: string }>
): string {
  let prompt = '';
  if (system) {
    prompt += `SYSTEM: ${system}\n\n`;
  }
  
  messages.forEach(msg => {
    prompt += `${msg.role.toUpperCase()}: ${msg.content}\n`;
  });
  
  return prompt.trim();
}

// Tool definitions for Claude - simplified to 2 tools
const MATH_AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'evaluate_expression',
    description: 'Evaluate a mathematical expression using MathJS. Supports arithmetic, functions (sqrt, factorial, etc.), comparisons, and unit conversions.',
    input_schema: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'The MathJS expression to evaluate (e.g., "2 + 2", "sqrt(16)", "5! == 120", "5 km + 3000 m in km")'
        }
      },
      required: ['expression']
    }
  },
  {
    name: 'provide_verdict',
    description: 'Provide the final verification result',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['verified_true', 'verified_false', 'cannot_verify'],
          description: 'The verification status'
        },
        explanation: {
          type: 'string',
          description: 'Clear explanation of why the statement is true, false, or cannot be verified'
        },
        mathjs_expression: {
          type: 'string',
          description: 'The MathJS expression that was evaluated (if any)'
        },
        computed_value: {
          type: 'string',
          description: 'The computed value from MathJS (if any)'
        },
        error_type: {
          type: 'string',
          enum: ['calculation', 'logic', 'unit', 'notation', 'conceptual'],
          description: 'Type of error (only if status is verified_false)'
        },
        severity: {
          type: 'string',
          enum: ['critical', 'major', 'minor'],
          description: 'Severity of error (only if status is verified_false)'
        },
        concise_correction: {
          type: 'string',
          description: 'Brief correction like "60 → 70" (only if status is verified_false)'
        },
        expected_value: {
          type: 'string',
          description: 'The expected/correct value (only if status is verified_false)'
        },
        actual_value: {
          type: 'string',
          description: 'The actual/incorrect value found in the statement (only if status is verified_false)'
        }
      },
      required: ['status', 'explanation']
    }
  }
];


export class CheckMathWithMathJsTool extends Tool<CheckMathAgenticInput, CheckMathAgenticOutput> {
  config = {
    id: 'check-math-with-mathjs',
    name: 'Check Math with MathJS',
    description: 'Verify mathematical statements using an agentic approach with Claude and MathJS',
    version: '2.0.0',
    category: 'analysis' as const,
    costEstimate: '~$0.02-0.05 per statement (uses Claude with multiple tool calls)',
    path: '/tools/check-math-with-mathjs',
    status: 'stable' as const
  };
  
  inputSchema = inputSchema;
  outputSchema = outputSchema as any;
  
  async execute(input: CheckMathAgenticInput, context: ToolContext): Promise<CheckMathAgenticOutput> {
    const startTime = Date.now();
    context.logger.info(`[CheckMathWithMathJsTool] Analyzing statement: "${input.statement}"`);
    
    // Store the previous session to restore later
    const previousSession = sessionContext.getSession();
    
    try {
      // Always create a new session for each tool execution
      const sessionId = `math-agentic-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newSession = {
        sessionId,
        sessionName: `Math Agentic Tool - ${input.statement.substring(0, 50)}${input.statement.length > 50 ? '...' : ''}`,
        sessionPath: '/tools/check-math-with-mathjs'
      };
      
      // Set our new session
      sessionContext.setSession(newSession);
      context.logger.info(`[CheckMathWithMathJsTool] Created new session: ${sessionId}`);
      
      const sessionConfig = sessionContext.withPath('/tools/check-math-with-mathjs');
      const heliconeHeaders = sessionConfig ? createHeliconeHeaders(sessionConfig) : undefined;
      
      // Simplified system prompt
      const systemPrompt = `You are a mathematical verification agent. Verify if mathematical statements are true, false, or cannot be verified.

TOOLS:
- evaluate_expression: Use this to compute numerical expressions with MathJS
- provide_verdict: Use this to give your final answer

APPROACH:
1. ALWAYS start by calling evaluate_expression to check any numerical claims
2. For symbolic/theoretical statements: return 'cannot_verify' (MathJS only does numerical computation)
3. For unit mismatches: compute the correct value and note the error

MATHJS SYNTAX EXAMPLES:
- Arithmetic: 2 + 2, 5 * 7, 10 / 2
- Functions: sqrt(16), factorial(5) or 5!, combinations(10, 3)
- Comparisons: 5 == 5, 10 > 8
- Units: 5 km + 3000 m, (5 km + 3000 m) in km
- Percentages: 30% * 150 or 0.3 * 150
- Constants: pi, e

IMPORTANT:
- Keep explanations clear and concise 
- Always include mathjs_expression and computed_value when using MathJS
- For rounding (e.g., π ≈ 3.14), accept if reasonable
- For unit errors, provide the correct value with proper units`;

      const userPrompt = `Verify this mathematical statement: "${input.statement}"${input.context ? `\nContext: ${input.context}` : ''}`;
      
      // Early detection of symbolic math to save tokens
      const symbolicKeywords = [
        'derivative', 'integral', 'limit', 'lim', 'd/dx', '∫', '∂',
        'prove', 'theorem', 'identity', 'simplify', 'expand', 'factor'
      ];
      
      const statementLower = input.statement.toLowerCase();
      const isLikelySymbolic = symbolicKeywords.some(keyword => 
        statementLower.includes(keyword)
      );
      
      // Pre-written responses for common cases
      if (isLikelySymbolic) {
        return {
          statement: input.statement,
          status: 'cannot_verify',
          explanation: 'Cannot verify symbolic math. MathJS only handles numerical computations.',
          llmInteraction: {
            model: MODEL_CONFIG.analysis,
            prompt: userPrompt,
            response: 'Detected symbolic mathematics - early return',
            tokensUsed: { prompt: 0, completion: 0, total: 0 },
            timestamp: new Date(),
            duration: Date.now() - startTime
          }
        };
      }
      
      // Track tool calls for debugging
      const toolCalls: Array<{ tool: string; input: any; output: any }> = [];
      let finalResponse: any = null;
      let agentReasoning = '';
      
      // Build conversation messages
      const messages: Anthropic.MessageParam[] = [
        { role: 'user', content: userPrompt }
      ];
      
      // Create Anthropic client
      const anthropic = createAnthropicClient();
      
      // Allow up to 5 rounds of tool calls
      let lastResponse: Anthropic.Message | null = null;
      let totalTokens = { prompt: 0, completion: 0, total: 0 };
      
      for (let round = 0; round < 5; round++) {
        // Call Claude with tools using the Anthropic client directly
        const response = await anthropic.messages.create({
          model: MODEL_CONFIG.analysis,
          system: systemPrompt,
          messages,
          tools: MATH_AGENT_TOOLS,
          tool_choice: { type: 'auto' },
          max_tokens: 2000,
          temperature: 0
        }, {
          headers: heliconeHeaders
        });
        
        lastResponse = response;
        
        // Update token count
        if (response.usage) {
          totalTokens.prompt += response.usage.input_tokens;
          totalTokens.completion += response.usage.output_tokens;
          totalTokens.total = totalTokens.prompt + totalTokens.completion;
        }
        
        // Extract text reasoning
        const textBlocks = response.content.filter(
          (block): block is Anthropic.TextBlock => block.type === 'text'
        );
        if (textBlocks.length > 0) {
          agentReasoning += (agentReasoning ? '\n' : '') + textBlocks.map(block => block.text).join('\n');
        }
        
        // Process tool calls
        const toolUses = response.content.filter(
          (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
        );
        
        if (toolUses.length === 0) {
          // No more tool calls, we're done
          break;
        }
        
        // Add Claude's response to messages
        messages.push({ role: 'assistant', content: response.content });
        
        // Process each tool call and collect results
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        
        for (const toolUse of toolUses) {
          const toolResult = await this.executeToolCall(toolUse, context);
          toolCalls.push({
            tool: toolUse.name,
            input: toolUse.input,
            output: toolResult
          });
          
          if (toolUse.name === 'provide_verdict') {
            finalResponse = toolUse.input;
          }
          
          // Format tool result for Claude
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(toolResult)
          });
        }
        
        // Add tool results to messages
        messages.push({ role: 'user', content: toolResults });
        
        // If we got a final response, we can stop
        if (finalResponse) {
          break;
        }
      }
      
      // If no final response was provided, create a default one
      if (!finalResponse) {
        finalResponse = {
          status: 'cannot_verify',
          explanation: 'The agent did not provide a final response.'
        };
      }
      
      // Build the output
      const output: CheckMathAgenticOutput = {
        statement: input.statement,
        status: finalResponse.status,
        explanation: finalResponse.explanation,
        llmInteraction: {
          model: MODEL_CONFIG.analysis,
          prompt: buildPromptString(systemPrompt, [{ role: 'user', content: userPrompt }]),
          response: lastResponse ? lastResponse.content.map(block => {
            if (block.type === 'text') return block.text;
            if (block.type === 'tool_use') return `[Tool call: ${block.name}]`;
            return '';
          }).join('\n') : '',
          tokensUsed: totalTokens,
          timestamp: new Date(),
          duration: Date.now() - startTime
        }
      };
      
      // Add verification details if available
      if (finalResponse.mathjs_expression || finalResponse.computed_value) {
        output.verificationDetails = {
          mathJsExpression: finalResponse.mathjs_expression || '',
          computedValue: finalResponse.computed_value || '',
          steps: []
        };
      }
      
      // Add error details if status is false
      if (finalResponse.status === 'verified_false' && finalResponse.error_type) {
        output.errorDetails = {
          errorType: finalResponse.error_type,
          severity: finalResponse.severity || 'major',
          conciseCorrection: finalResponse.concise_correction || '',
          expectedValue: finalResponse.expected_value,
          actualValue: finalResponse.actual_value
        };
      }
      
      return output;
      
    } catch (error) {
      context.logger.error('[CheckMathWithMathJsTool] Error:', error);
      return {
        statement: input.statement,
        status: 'cannot_verify',
        explanation: 'An error occurred during verification.',
        error: error instanceof Error ? error.message : 'Unknown error occurred.',
        llmInteraction: {
          model: 'error',
          prompt: '',
          response: '',
          tokensUsed: { prompt: 0, completion: 0, total: 0 },
          timestamp: new Date(),
          duration: 0
        }
      };
    } finally {
      // Restore the previous session context
      if (previousSession) {
        sessionContext.setSession(previousSession);
      } else {
        // Clear the session if there was no previous one
        sessionContext.setSession(undefined);
      }
    }
  }
  
  private async executeToolCall(toolUse: Anthropic.ToolUseBlock, context: ToolContext): Promise<any> {
    try {
      switch (toolUse.name) {
        case 'evaluate_expression':
          return this.evaluateExpression(toolUse.input as { expression: string }, context);
          
        case 'provide_verdict':
          // Just return success for the verdict tool
          return { success: true };
          
        default:
          return { error: `Unknown tool: ${toolUse.name}` };
      }
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Tool execution failed',
        details: String(error)
      };
    }
  }
  
  private evaluateExpression(input: { expression: string }, context: ToolContext): any {
    try {
      const result = evaluate(input.expression);
      
      // Format the result nicely
      let formatted: string;
      if (typeof result === 'boolean') {
        formatted = result.toString();
      } else if (typeof result === 'number') {
        formatted = result.toString();
      } else {
        formatted = format(result);
      }
      
      return {
        success: true,
        result: formatted,
        type: typeof result,
        raw: result
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        type: 'error'
      };
    }
  }
}

// Export singleton instance
export const checkMathWithMathJsTool = new CheckMathWithMathJsTool();
export default checkMathWithMathJsTool;