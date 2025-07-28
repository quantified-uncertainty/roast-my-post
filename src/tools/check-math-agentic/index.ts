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
import { getMathJsDocs, MATHJS_CONCISE_DOCS } from './mathjs-docs';

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

// Tool definitions for Claude
const MATH_AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'evaluate_mathjs',
    description: 'Evaluate a MathJS expression and get the result',
    input_schema: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'The MathJS expression to evaluate (e.g., "2 + 2", "sqrt(16)", "5! == 120")'
        }
      },
      required: ['expression']
    }
  },
  {
    name: 'get_mathjs_syntax',
    description: 'Get MathJS syntax documentation for a specific topic',
    input_schema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'The topic to get syntax for (e.g., "derivatives", "matrices", "units", "logarithms")'
        }
      },
      required: ['topic']
    }
  },
  {
    name: 'convert_to_mathjs',
    description: 'Get suggestions for converting natural language to MathJS syntax',
    input_schema: {
      type: 'object',
      properties: {
        phrase: {
          type: 'string',
          description: 'The natural language phrase to convert (e.g., "10 choose 3", "log base 2 of 8")'
        }
      },
      required: ['phrase']
    }
  },
  {
    name: 'compare_values',
    description: 'Compare two values with optional tolerance for floating point',
    input_schema: {
      type: 'object',
      properties: {
        value1: {
          type: 'string',
          description: 'First value to compare'
        },
        value2: {
          type: 'string',
          description: 'Second value to compare'
        },
        tolerance: {
          type: 'number',
          description: 'Tolerance for comparison (default: 0.0001)',
          default: 0.0001
        }
      },
      required: ['value1', 'value2']
    }
  },
  {
    name: 'respond',
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
          description: 'Clear explanation of the verification result'
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
        }
      },
      required: ['status', 'explanation']
    }
  }
];

// Natural language to MathJS conversion hints
const CONVERSION_HINTS: Record<string, string> = {
  'choose': 'Use combinations(n, k) for "n choose k"',
  'factorial': 'Use n! or factorial(n)',
  'log base': 'Use log(x, base) for logarithm with specific base',
  'square root': 'Use sqrt(x)',
  'cube root': 'Use cbrt(x)',
  'power': 'Use x^n for x to the power of n',
  'percent': 'Percentages like 30% automatically convert to 0.3',
  'pi': 'Use pi for π',
  'e': 'Use e for Euler\'s number',
  'infinity': 'Use Infinity',
  'derivative': 'MathJS has limited symbolic math - verify numerically',
  'integral': 'MathJS has limited symbolic math - verify numerically',
  'limit': 'MathJS cannot compute limits - verify the claimed value'
};

export class CheckMathAgenticTool extends Tool<CheckMathAgenticInput, CheckMathAgenticOutput> {
  config = {
    id: 'check-math-agentic',
    name: 'Check Math with Agent',
    description: 'Verify mathematical statements using an agentic approach with Claude and MathJS',
    version: '1.0.0',
    category: 'analysis' as const,
    costEstimate: '~$0.02-0.05 per statement (uses Claude with multiple tool calls)',
    path: '/tools/check-math-agentic',
    status: 'experimental' as const
  };
  
  inputSchema = inputSchema;
  outputSchema = outputSchema as any;
  
  async execute(input: CheckMathAgenticInput, context: ToolContext): Promise<CheckMathAgenticOutput> {
    const startTime = Date.now();
    context.logger.info(`[CheckMathAgenticTool] Analyzing statement: "${input.statement}"`);
    
    // Store the previous session to restore later
    const previousSession = sessionContext.getSession();
    
    try {
      // Always create a new session for each tool execution
      const sessionId = `math-agentic-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newSession = {
        sessionId,
        sessionName: `Math Agentic Tool - ${input.statement.substring(0, 50)}${input.statement.length > 50 ? '...' : ''}`,
        sessionPath: '/tools/check-math-agentic'
      };
      
      // Set our new session
      sessionContext.setSession(newSession);
      context.logger.info(`[CheckMathAgenticTool] Created new session: ${sessionId}`);
      
      const sessionConfig = sessionContext.withPath('/tools/check-math-agentic');
      const heliconeHeaders = sessionConfig ? createHeliconeHeaders(sessionConfig) : undefined;
      
      // System prompt for the agent
      const systemPrompt = `You are a mathematical verification agent with access to MathJS for computation.

Your task is to verify whether the given mathematical statement is true, false, or cannot be verified.

IMPORTANT: You MUST complete EVERY verification by calling the 'respond' tool with your final answer.

CRITICAL LIMITATION: MathJS is a NUMERICAL computation library, NOT a symbolic math system. It CANNOT:
- Verify symbolic equations (like "derivative of x³ is 3x²" or "integral of sin(x) is -cos(x)")
- Prove mathematical theorems or identities
- Perform algebraic manipulations or simplifications
- Compare symbolic expressions for equality

For symbolic math statements, you should immediately respond with 'cannot_verify' and explain that MathJS only handles numerical computations.

${MATHJS_CONCISE_DOCS}

Strategy:
1. First, determine if the statement requires symbolic or numerical verification
2. For NUMERICAL statements: use evaluate_mathjs to compute and verify
3. For SYMBOLIC statements: respond with 'cannot_verify' immediately
4. If you need syntax help, use get_mathjs_syntax or convert_to_mathjs
5. For comparing numerical values (with floating point tolerance), use compare_values
6. ALWAYS finish by calling 'respond' with your final verification result

Important:
- Focus on the complete mathematical relationship, not just isolated values
- For statements like "X equals Y" with numbers, verify if X == Y
- For contextual statements with "so", "therefore", extract the numerical conclusion
- Be precise about mathematical notation and units
- Incomplete statements (like "0.736 % ...") cannot be verified without full context
- ROUNDING: When a statement gives a rounded value (like "3.14" for pi or "1.41" for sqrt(2)), consider it TRUE if the rounding is reasonable and conventional. Don't mark statements false just because they show rounded values instead of infinite precision.

You MUST call the 'respond' tool with:
- status: 'verified_true' if the statement is mathematically correct
- status: 'verified_false' if the statement contains an error
- status: 'cannot_verify' if you cannot determine the truth value
- explanation: BRIEF reasoning (1-2 sentences max). Be concise!
- Include mathjs_expression and computed_value when applicable
- Include error details (error_type, severity, concise_correction) when status is 'verified_false'
- For unit errors, ALWAYS provide the correct answer with proper units in concise_correction

IMPORTANT: Keep explanations SHORT. Examples:
- "2+2 equals 4" → "Correct arithmetic."
- "10% of 50 is 10" → "Incorrect. 10% of 50 is 5, not 10."
- "derivative of x³ is 3x²" → "Cannot verify symbolic math."
- "100F = 37.78C" → "Correct with standard rounding."
- "5 km + 3 km = $8" → "Unit error. 5 km + 3 km = 8 km, not $8."

When units are incompatible (e.g., distance vs money), provide the mathematically correct answer with proper units.`;

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
          
          if (toolUse.name === 'respond') {
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
        agentReasoning,
        toolCalls,
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
          conciseCorrection: finalResponse.concise_correction
        };
      }
      
      return output;
      
    } catch (error) {
      context.logger.error('[CheckMathAgenticTool] Error:', error);
      return {
        statement: input.statement,
        status: 'cannot_verify',
        explanation: 'An error occurred during verification.',
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
        case 'evaluate_mathjs':
          return this.evaluateMathJS(toolUse.input as { expression: string }, context);
          
        case 'get_mathjs_syntax':
          return this.getMathJSSyntax(toolUse.input as { topic: string });
          
        case 'convert_to_mathjs':
          return this.convertToMathJS(toolUse.input as { phrase: string });
          
        case 'compare_values':
          return this.compareValues(
            toolUse.input as { value1: string; value2: string; tolerance?: number },
            context
          );
          
        case 'respond':
          // Just return success for the respond tool
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
  
  private evaluateMathJS(input: { expression: string }, context: ToolContext): any {
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
  
  private getMathJSSyntax(input: { topic: string }): any {
    const topic = input.topic.toLowerCase();
    
    // Get documentation from the imported module
    const documentation = getMathJsDocs(topic);
    
    return {
      topic,
      documentation,
      available_topics: [
        'arithmetic', 'numbers', 'functions', 'comparison', 'units',
        'matrices', 'percentages', 'calculus', 'expressions', 'statistics',
        'complex', 'limitations', 'common_patterns'
      ]
    };
  }
  
  private convertToMathJS(input: { phrase: string }): any {
    const phrase = input.phrase.toLowerCase();
    const hints: string[] = [];
    
    // Check for conversion hints
    for (const [key, hint] of Object.entries(CONVERSION_HINTS)) {
      if (phrase.includes(key)) {
        hints.push(hint);
      }
    }
    
    // Provide common conversions
    const conversions: Record<string, string> = {
      'equals': '==',
      'is equal to': '==',
      'is': '==',
      'multiplied by': '*',
      'times': '*',
      'divided by': '/',
      'plus': '+',
      'minus': '-',
      'to the power of': '^',
      'squared': '^2',
      'cubed': '^3',
      'percent': '/ 100',
      'percentage': '/ 100'
    };
    
    let suggestion = phrase;
    for (const [from, to] of Object.entries(conversions)) {
      suggestion = suggestion.replace(new RegExp(from, 'g'), to);
    }
    
    return {
      original: input.phrase,
      suggestion,
      hints,
      examples: [
        '"10 choose 3" → combinations(10, 3)',
        '"log base 2 of 8" → log(8, 2)',
        '"5 factorial" → 5! or factorial(5)',
        '"square root of 16" → sqrt(16)',
        '"30% of 150" → 30% * 150 or 0.3 * 150'
      ]
    };
  }
  
  private compareValues(
    input: { value1: string; value2: string; tolerance?: number },
    context: ToolContext
  ): any {
    try {
      const val1 = evaluate(input.value1);
      const val2 = evaluate(input.value2);
      const tolerance = input.tolerance || 0.0001;
      
      // Handle different types
      if (typeof val1 === 'boolean' || typeof val2 === 'boolean') {
        return {
          equal: val1 === val2,
          value1: val1,
          value2: val2,
          comparison: 'exact'
        };
      }
      
      if (typeof val1 === 'number' && typeof val2 === 'number') {
        const diff = Math.abs(val1 - val2);
        const equal = diff <= tolerance;
        
        return {
          equal,
          value1: val1,
          value2: val2,
          difference: diff,
          tolerance,
          comparison: 'numeric',
          note: diff > 0 && diff < 0.01 ? 'Values differ by less than 0.01' : undefined
        };
      }
      
      // For other types, use string comparison
      return {
        equal: String(val1) === String(val2),
        value1: String(val1),
        value2: String(val2),
        comparison: 'string'
      };
      
    } catch (error: any) {
      return {
        error: `Comparison failed: ${error.message}`,
        value1: input.value1,
        value2: input.value2
      };
    }
  }
}

// Export singleton instance
export const checkMathAgenticTool = new CheckMathAgenticTool();
export default checkMathAgenticTool;