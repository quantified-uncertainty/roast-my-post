/**
 * Math-specific prompt builder
 */

import { TextChunk } from '../../TextChunk';

export class MathPromptBuilder {
  private domain = "mathematical expressions and calculations";
  private taskDescription = "Extract all equations, calculations, and mathematical statements, then verify their correctness";
  private examples = [
    "Equations and formulas (2+2=4, E=mc²)",
    "Statistical calculations or percentages",
    "Numerical comparisons (X is 3x larger than Y)",
    "Unit conversions"
  ];

  /**
   * Build an extraction prompt for math content
   */
  buildExtractionPrompt(chunk: TextChunk, additionalInstructions?: string): string {
    let prompt = `Extract all ${this.domain} content from this text chunk.

TASK: ${this.taskDescription}`;

    if (this.examples.length > 0) {
      prompt += `

EXAMPLES OF WHAT TO LOOK FOR:
${this.examples.map(ex => `- ${ex}`).join('\n')}`;
    }

    if (additionalInstructions) {
      prompt += `

ADDITIONAL INSTRUCTIONS:
${additionalInstructions}`;
    }

    prompt += `

TEXT TO ANALYZE:
${chunk.text}

CRITICAL: You MUST use the extraction tool to report your findings. Do not respond with plain text.`;

    return prompt;
  }

  /**
   * Build a synthesis prompt for math analysis
   */
  buildSynthesisPrompt(
    items: Record<string, unknown>[],
    analysisType: string,
    additionalContext?: string
  ): string {
    let prompt = `You have identified ${items.length} ${this.domain} items. Now synthesize them into a comprehensive analysis.

TASK: ${analysisType}`;

    if (additionalContext) {
      prompt += `

CONTEXT:
${additionalContext}`;
    }

    prompt += `

ITEMS TO SYNTHESIZE:
${items.map((item, i) => `${i + 1}. ${this.formatItem(item)}`).join('\n')}

CRITICAL: You MUST use the synthesis tool to report your analysis. Provide insights, patterns, and recommendations.`;

    return prompt;
  }

  /**
   * Build a verification prompt for math content
   */
  buildVerificationPrompt(items: Record<string, unknown>[], verificationTask: string): string {
    return `Verify the following ${this.domain} items.

TASK: ${verificationTask}

ITEMS TO VERIFY:
${items.map((item, i) => `${i + 1}. ${this.formatItem(item)}`).join('\n')}

For each item, determine if it's valid/correct and explain your reasoning.`;
  }

  /**
   * Format an item for display in prompts
   */
  private formatItem(item: Record<string, unknown>): string {
    if (typeof item === 'string') {
      return item;
    }
    
    // Extract the most relevant fields for display
    const { text, context } = item;
    let formatted = (text as string) || JSON.stringify(item);
    
    // Add context if available and not too long  
    if (context && typeof context === 'string' && context.length < 100) {
      formatted += ` (context: ${context})`;
    }
    
    return formatted;
  }
}