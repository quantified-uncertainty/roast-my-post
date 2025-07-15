/**
 * Math error checking for text chunks
 * Based on the spelling/grammar checker pattern but focused on mathematical correctness
 */

import { anthropic, ANALYSIS_MODEL } from '../../../types/openai';

// Types
export interface MathError {
  lineStart: number;
  lineEnd: number;
  highlightedText: string;
  description: string;
  errorType: 'calculation' | 'logic' | 'unit' | 'notation' | 'conceptual';
  severity: 'critical' | 'major' | 'minor';
}

export interface TextChunk {
  content: string;
  startLineNumber: number;
  endLineNumber: number;
  wordCount: number;
}

export interface AnalysisResult {
  errors: MathError[];
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

// No need to initialize Anthropic client - using shared instance from openai.ts

/**
 * Analyze a text chunk for mathematical errors
 */
export async function analyzeMathChunk(chunk: TextChunk): Promise<AnalysisResult> {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(chunk);

  try {
    const response = await anthropic.messages.create({
      model: ANALYSIS_MODEL,
      max_tokens: 4000,
      temperature: 0,
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" }
        }
      ],
      messages: [
        {
          role: "user",
          content: userPrompt,
        }
      ],
      tools: [getMathErrorReportingTool()],
      tool_choice: { type: "tool", name: "report_math_errors" },
    });

    // Extract tool use response
    const toolUse = response.content.find((c) => c.type === "tool_use") as any;
    if (!toolUse || toolUse.name !== "report_math_errors") {
      console.error('No tool use in response');
      return {
        errors: [],
        usage: {
          input_tokens: response.usage?.input_tokens || 0,
          output_tokens: response.usage?.output_tokens || 0
        }
      };
    }

    const result = toolUse.input as { errors: any[] };
    const errors = parseErrors(result.errors);

    return {
      errors,
      usage: {
        input_tokens: response.usage?.input_tokens || 0,
        output_tokens: response.usage?.output_tokens || 0
      }
    };

  } catch (error) {
    console.error('Error analyzing chunk:', error);
    throw error;
  }
}

/**
 * Build system prompt for math error detection
 */
function buildSystemPrompt(): string {
  return `You are a mathematical reviewer specializing in detecting mathematical errors in text. Your task is to identify calculation errors, logical fallacies, unit mismatches, incorrect mathematical notation, and conceptual misunderstandings.

CRITICAL: You MUST use the report_math_errors tool to provide your analysis. Do NOT provide explanatory text responses.

ANALYSIS INSTRUCTIONS:
For each mathematical error found:
1. Use the EXACT line number(s) from the text
2. For highlightedText, include ONLY the problematic mathematical expression or statement
3. Provide a clear explanation of the error and the correct calculation/reasoning

Types of errors to look for:
- Arithmetic errors (e.g., "2 + 2 = 5")
- Unit conversion errors (e.g., "1 km = 100 meters")
- Percentage calculations (e.g., "50% of 100 is 60")
- Statistical misinterpretations
- Logical fallacies in mathematical reasoning
- Incorrect formulas or equations
- Misuse of mathematical notation
- Order of operations errors
- Rounding or approximation errors that significantly affect conclusions

Important guidelines:
- Focus on objective mathematical errors, not stylistic choices
- Consider the context - approximations may be intentional
- Flag errors that would lead to incorrect conclusions
- Be precise about what the error is and how to fix it
- For calculations, show the correct work when relevant
- Consider significant figures and precision appropriately

REMINDER: Use the report_math_errors tool to report your findings.`;
}

/**
 * Build user prompt for chunk analysis
 */
function buildUserPrompt(chunk: TextChunk): string {
  // Add line numbers to content
  const lines = chunk.content.split('\n');
  const numberedContent = lines.map((line, index) => 
    `${chunk.startLineNumber + index}: ${line}`
  ).join('\n');

  return `Consider this text. Is the math correct? Think through the details and analyze for any mathematical errors:

${numberedContent}`;
}

/**
 * Get the math error reporting tool definition
 */
function getMathErrorReportingTool() {
  return {
    name: "report_math_errors",
    description: "Report mathematical errors found in the text",
    input_schema: {
      type: "object" as const,
      properties: {
        errors: {
          type: "array",
          items: {
            type: "object",
            properties: {
              lineStart: {
                type: "number",
                description: "Starting line number where the error occurs",
              },
              lineEnd: {
                type: "number",
                description: "Ending line number where the error occurs",
              },
              highlightedText: {
                type: "string",
                description: "The mathematical expression or statement containing the error",
              },
              description: {
                type: "string",
                description: "Clear explanation of the mathematical error and the correct solution",
              },
            },
            required: ["lineStart", "lineEnd", "highlightedText", "description"],
          },
        },
      },
      required: ["errors"],
    },
  };
}

/**
 * Parse and categorize errors from LLM response
 */
function parseErrors(errors: any[]): MathError[] {
  return errors.map(error => {
    const errorType = categorizeError(error.description);
    const severity = determineSeverity(errorType, error.description);

    return {
      lineStart: error.lineStart,
      lineEnd: error.lineEnd,
      highlightedText: error.highlightedText,
      description: error.description,
      errorType,
      severity
    };
  });
}

/**
 * Categorize the type of mathematical error
 */
function categorizeError(description: string): MathError['errorType'] {
  const lowerDesc = description.toLowerCase();
  
  if (lowerDesc.includes('calculation') || lowerDesc.includes('arithmetic') || 
      lowerDesc.includes('sum') || lowerDesc.includes('product')) {
    return 'calculation';
  }
  if (lowerDesc.includes('unit') || lowerDesc.includes('conversion')) {
    return 'unit';
  }
  if (lowerDesc.includes('logic') || lowerDesc.includes('reasoning') || 
      lowerDesc.includes('fallacy')) {
    return 'logic';
  }
  if (lowerDesc.includes('notation') || lowerDesc.includes('symbol') || 
      lowerDesc.includes('formula')) {
    return 'notation';
  }
  return 'conceptual';
}

/**
 * Determine the severity of the error
 */
function determineSeverity(errorType: MathError['errorType'], description: string): MathError['severity'] {
  const lowerDesc = description.toLowerCase();
  
  // Critical: Errors that completely invalidate conclusions
  if (lowerDesc.includes('completely wrong') || lowerDesc.includes('fundamental') ||
      lowerDesc.includes('invalidates')) {
    return 'critical';
  }
  
  // Major: Significant errors that affect understanding
  if (errorType === 'calculation' || errorType === 'unit' || 
      lowerDesc.includes('incorrect') || lowerDesc.includes('significant')) {
    return 'major';
  }
  
  // Minor: Small errors or notation issues
  return 'minor';
}

/**
 * Split text into chunks (simplified version)
 */
export function splitIntoChunks(text: string, chunkSize: number = 300): TextChunk[] {
  const words = text.split(/\s+/);
  const chunks: TextChunk[] = [];
  let currentChunk: string[] = [];
  let currentLineNumber = 1;
  
  // Keep track of line numbers
  const lines = text.split('\n');
  let wordIndex = 0;
  let lineIndex = 0;
  
  for (let i = 0; i < words.length; i++) {
    currentChunk.push(words[i]);
    
    if (currentChunk.length >= chunkSize || i === words.length - 1) {
      const chunkContent = currentChunk.join(' ');
      const startLine = currentLineNumber;
      
      // Count lines in this chunk
      const chunkLines = chunkContent.split('\n').length - 1;
      const endLine = startLine + chunkLines;
      
      chunks.push({
        content: chunkContent,
        startLineNumber: startLine,
        endLineNumber: endLine,
        wordCount: currentChunk.length
      });
      
      currentLineNumber = endLine + 1;
      currentChunk = [];
    }
  }
  
  return chunks;
}