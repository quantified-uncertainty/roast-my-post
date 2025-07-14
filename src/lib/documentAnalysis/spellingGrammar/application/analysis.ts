/**
 * Pure functions for chunk analysis
 */

import type { DocumentChunk, AnalysisContext, SpellingGrammarError } from '../domain';
import { ErrorType, ErrorSeverity } from '../domain';

/**
 * Build convention-aware context for LLM
 */
export function buildConventionContext(context: AnalysisContext): string {
  if (!context.conventions) return '';
  
  const { language, documentType, formality } = context.conventions;
  
  return `
Document conventions detected:
- Language: ${language} English
- Document type: ${documentType}
- Formality: ${formality}

Based on these conventions:
${language === 'US' ? '- Use American spelling (color, organize, center)' : ''}
${language === 'UK' ? '- Use British spelling (colour, organise, centre)' : ''}
${language === 'mixed' ? '- Document uses mixed spelling conventions - only flag actual misspellings, not US/UK variations' : ''}
${documentType === 'academic' ? '- Apply formal academic writing standards' : ''}
${documentType === 'blog' ? '- Allow informal language and colloquialisms' : ''}
${documentType === 'technical' ? '- Expect technical terms and formal structure' : ''}
${documentType === 'casual' ? '- Be lenient with informal writing style' : ''}
`;
}

/**
 * Build system prompt for the LLM
 */
export function buildSystemPrompt(context: AnalysisContext): string {
  const conventionContext = buildConventionContext(context);
  
  return `You are a professional proofreader and grammar checker. Your task is to identify spelling and grammar errors in the provided text.

${context.primaryInstructions}
${conventionContext}
Important guidelines:
- Only highlight actual errors, not stylistic preferences
- Provide clear, actionable corrections
- Be specific about what should be changed
- Focus on clarity and correctness
- CRITICAL: For highlightedText, be PRECISE and highlight ONLY the problematic word(s), not entire sentences

Context awareness:
- Accept colloquialisms and informal language (e.g., "jankily", "kinda", "gonna") unless they're clearly typos
- Recognize that some documents may be informal (blog posts, forum posts) vs formal (academic papers)
- Stylistic emphasis (e.g., "rational reason") should NOT be marked as errors
- Common internet/tech conventions (e.g., "[...]" for truncation) are acceptable
- If document conventions are detected, respect them and don't flag convention-consistent spelling as errors`;
}

/**
 * Build user prompt for chunk analysis
 */
export function buildUserPrompt(chunk: DocumentChunk): string {
  const numberedContent = chunk.getNumberedContent();
  
  return `Please analyze the following text for spelling and grammar errors. The text is provided with line numbers.

${numberedContent}

Identify all spelling and grammar errors. For each error:
1. Use the EXACT line number(s) from the text above
2. For highlightedText, include ONLY the problematic word(s):
   - Spelling errors: just the misspelled word (e.g., "recieve" not "I will recieve the package")
   - Grammar errors: just the incorrect word(s) (e.g., "are" not "The team are playing well")
   - Punctuation errors: the word with missing/wrong punctuation (e.g., "Hello,how" not the full sentence)
   - Word confusion: just the confused word (e.g., "Your" not "Your the best!")
   - IMPORTANT: Report each error separately, even if they are adjacent
3. Provide a clear explanation and correction

Examples of CORRECT highlighting:
- highlightedText: "recieve" → description: "Spelling error: should be 'receive'"
- highlightedText: "are" → description: "Subject-verb disagreement: 'team' is singular, use 'is'"
- highlightedText: "Its" → description: "Missing apostrophe: should be 'It's' (contraction of 'it is')"
- highlightedText: "Hello,how" → description: "Punctuation error: missing space after comma"
- highlightedText: "fine.Thanks" → description: "Punctuation error: missing space after period"

IMPORTANT: Report each distinct error as a separate entry. Don't combine multiple errors into one highlight.

Focus on objective errors like:
- Spelling mistakes
- Subject-verb disagreement
- Incorrect verb tenses (especially when time markers like "yesterday" indicate past tense)
- Missing or incorrect punctuation (including missing periods at end of sentences)
- Capitalization errors (including proper nouns that should be capitalized)
- Commonly confused words (their/there/they're, its/it's, etc.)
- Mixed constructions (like "the reason is because" which should be "the reason is that")
- Tense consistency within sentences

Special cases to watch for:
- "Yesterday I go" → highlight "go" (should be "went")
- Missing period at end of sentence → highlight the last word without period
- "The reason is because" → highlight "is because of" or "is because" (redundant)
- For compound proper nouns, you may highlight them together if they form a single entity (e.g., "united states" as one error)`;
}

/**
 * Validate an error returned by the LLM
 */
export function validateError(
  error: any,
  chunk: DocumentChunk
): { isValid: boolean; reason?: string } {
  // Ensure line numbers are within the chunk
  const minLine = chunk.startLineNumber;
  const maxLine = chunk.endLineNumber;
  
  if (error.lineStart < minLine || error.lineEnd > maxLine) {
    return {
      isValid: false,
      reason: `Invalid line numbers: ${error.lineStart}-${error.lineEnd} not in range ${minLine}-${maxLine}`
    };
  }
  
  // Ensure highlighted text is not empty
  if (!error.highlightedText?.trim()) {
    return {
      isValid: false,
      reason: 'Empty highlighted text'
    };
  }
  
  // Ensure description is meaningful
  if (!error.description || error.description.length < 10) {
    return {
      isValid: false,
      reason: `Invalid description: ${error.description}`
    };
  }
  
  return { isValid: true };
}

/**
 * Categorize error based on description
 */
export function categorizeError(description: string): ErrorType {
  const desc = description.toLowerCase();
  
  if (desc.includes('spelling') || desc.includes('misspell')) {
    return ErrorType.SPELLING;
  } else if (desc.includes('punctuation') || desc.includes('comma') || desc.includes('period') || desc.includes('space after')) {
    return ErrorType.PUNCTUATION;
  } else if (desc.includes('capital')) {
    return ErrorType.CAPITALIZATION;
  } else if (desc.includes('grammar') || desc.includes('verb') || desc.includes('subject')) {
    return ErrorType.GRAMMAR;
  } else if (desc.includes('word choice') || desc.includes('word confusion')) {
    return ErrorType.WORD_CHOICE;
  } else if (desc.includes('consistency') || desc.includes('american') || desc.includes('british')) {
    return ErrorType.CONSISTENCY;
  }
  
  return ErrorType.OTHER;
}

/**
 * Determine error severity based on type and description
 */
export function determineSeverity(errorType: ErrorType, description: string): ErrorSeverity {
  const desc = description.toLowerCase();
  
  // Low severity: citation formatting, spacing issues
  if (desc.includes('citation') || desc.includes('footnote') || 
      desc.includes('space after') || desc.includes('missing space') ||
      desc.includes('space before citation')) {
    return ErrorSeverity.LOW;
  }
  
  // High severity: actual misspellings, wrong words, significant grammar errors
  if (errorType === ErrorType.SPELLING && !desc.includes('consistency') && !desc.includes('correct')) {
    return ErrorSeverity.HIGH;
  }
  if (errorType === ErrorType.GRAMMAR && !desc.includes('style') && !desc.includes('preference')) {
    return ErrorSeverity.HIGH;
  }
  if (errorType === ErrorType.WORD_CHOICE) {
    return ErrorSeverity.HIGH;
  }
  
  // Everything else is medium
  return ErrorSeverity.MEDIUM;
}