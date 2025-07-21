/**
 * Spelling-specific prompt builder
 */

import { TextChunk } from '../../TextChunk';

export class SpellingPromptBuilder {
  private domain = "spelling, grammar, and style issues";
  private taskDescription = "Identify spelling errors, grammatical mistakes, and style improvements";

  /**
   * Build an extraction prompt for spelling/grammar checking
   */
  buildExtractionPrompt(chunk: TextChunk, additionalInstructions?: string): string {
    let prompt = `Check the following text for spelling, grammar, and style issues.

TASK: ${this.taskDescription}

WHAT TO LOOK FOR:
- Misspelled words
- Grammar errors (subject-verb agreement, tense consistency, etc.)
- Punctuation issues
- Style improvements (clarity, conciseness, word choice)
- Commonly confused words (their/there, its/it's, etc.)

GUIDELINES:
- Focus on clear errors, not stylistic preferences
- Consider context when suggesting corrections
- Ignore technical terms, proper nouns, and specialized vocabulary unless clearly misspelled
- For style issues, only report those that significantly impact clarity`;

    if (additionalInstructions) {
      prompt += `

ADDITIONAL INSTRUCTIONS:
${additionalInstructions}`;
    }

    prompt += `

TEXT TO ANALYZE:
${chunk.text}

CRITICAL: You MUST use the report_spelling_errors tool to report your findings. Include the erroneous text, suggested correction, and error type for each issue found.`;

    return prompt;
  }

  /**
   * Build a synthesis prompt for summarizing spelling/grammar issues
   */
  buildSynthesisPrompt(
    errorCount: number,
    errorsByType: Map<string, number>,
    commonPatterns: string[]
  ): string {
    return `Summarize the spelling and grammar check results:

STATISTICS:
- Total errors found: ${errorCount}
- Breakdown by type: ${Array.from(errorsByType.entries()).map(([type, count]) => `${type}: ${count}`).join(', ')}

${commonPatterns.length > 0 ? `COMMON PATTERNS:
${commonPatterns.map(p => `- ${p}`).join('\n')}` : ''}

Provide a brief analysis of the document's writing quality and any systematic issues that should be addressed.`;
  }
}