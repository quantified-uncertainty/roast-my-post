/**
 * Simplified prompt builder for consistent prompt generation
 */

import { TextChunk } from '../TextChunk';

export class PromptBuilder {
  private domain: string;
  private taskDescription: string;
  private examples: string[];

  constructor(domain: string, taskDescription: string, examples: string[] = []) {
    this.domain = domain;
    this.taskDescription = taskDescription;
    this.examples = examples;
  }

  /**
   * Build an extraction prompt
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
   * Build a synthesis prompt
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
   * Build a verification prompt
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
    const { text, id, context, ...rest } = item;
    let formatted = (text as string) || JSON.stringify(item);
    
    // Add context if available and not too long
    if (context && typeof context === 'string' && context.length < 100) {
      formatted += ` (context: ${context})`;
    }
    
    return formatted;
  }

  /**
   * Factory methods for common domains
   */
  static forDomain(
    domain: string,
    taskDescription: string,
    examples?: string[]
  ): PromptBuilder {
    return new PromptBuilder(domain, taskDescription, examples || []);
  }


  static forSpelling(): PromptBuilder {
    return new PromptBuilder(
      "spelling, grammar, and style issues",
      "Identify spelling errors, grammatical mistakes, and style improvements",
      [
        "Misspelled words",
        "Grammar errors",
        "Punctuation issues",
        "Style and clarity improvements"
      ]
    );
  }

  static forFactChecking(): PromptBuilder {
    return new PromptBuilder(
      "factual claims",
      "Extract factual claims that can be verified, including statistics, dates, and statements about real entities",
      [
        "Statistical claims (GDP was $21T in 2023)",
        "Historical facts (The Berlin Wall fell in 1989)",
        "Scientific claims (Water boils at 100°C)",
        "Statements about organizations, people, or places"
      ]
    );
  }
}