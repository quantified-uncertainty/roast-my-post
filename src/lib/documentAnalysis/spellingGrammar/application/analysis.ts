/**
 * Pure functions for chunk analysis
 */

import type { DocumentChunk, AnalysisContext } from '../domain';
import { ErrorType, ErrorSeverity } from '../../shared/errorCategorization';
import { categorizeError as categorizeErrorShared, determineSeverity as determineSeverityShared } from '../../shared/errorCategorization';

/**
 * Build convention-aware context for LLM
 */
export function buildConventionContext(context: AnalysisContext): string {
  if (!context.conventions) return '';
  
  const { language, documentType, formality } = context.conventions;
  
  const languageRules = [];
  if (language === 'US') languageRules.push('- Use American spelling (color, organize, center)');
  if (language === 'UK') languageRules.push('- Use British spelling (colour, organise, centre)');
  if (language === 'mixed') languageRules.push('- Document uses mixed spelling conventions - only flag actual misspellings, not US/UK variations');
  
  const typeRules = [];
  if (documentType === 'academic') typeRules.push('- Apply formal academic writing standards');
  if (documentType === 'blog') typeRules.push('- Allow informal language and colloquialisms');
  if (documentType === 'technical') typeRules.push('- Expect technical terms and formal structure');
  if (documentType === 'casual') typeRules.push('- Be lenient with informal writing style');
  
  const allRules = [...languageRules, ...typeRules];
  
  if (allRules.length === 0) return '';
  
  return `Document conventions detected:
- Language: ${language} English
- Document type: ${documentType}
- Formality: ${formality}

Based on these conventions:
${allRules.join('\n')}`;
}

/**
 * Build system prompt for the LLM
 */
export function buildSystemPrompt(context: AnalysisContext): string {
  const conventionContext = buildConventionContext(context);
  
  // Clean up primaryInstructions to remove agent name repetition
  const cleanInstructions = context.primaryInstructions
    .replace(/\b\w+\s+Check\w*\s*/g, '') // Remove "Spell Check", "Grammar Check", etc.
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  const sections = [
    'You are a professional proofreader and grammar checker. Your task is to identify spelling and grammar errors in the provided text.',
    '',
    'CRITICAL: You MUST use the report_errors tool to provide your analysis. Do NOT provide explanatory text responses. Even if the content seems academic, scientific, or analytical, your job is simply to find errors and report them using the structured tool format.',
    ''
  ];
  
  if (cleanInstructions) {
    sections.push(cleanInstructions, '');
  }
  
  if (conventionContext) {
    sections.push(conventionContext, '');
  }
  
  sections.push(
    'ANALYSIS INSTRUCTIONS:',
    'For each error found:',
    '1. Use the EXACT line number(s) from the text',
    '2. For highlightedText, include ONLY the problematic word(s):',
    '   - Spelling errors: just the misspelled word (e.g., "recieve" not "I will recieve the package")',
    '   - Grammar errors: just the incorrect word(s) (e.g., "are" not "The team are playing well")',
    '   - Punctuation errors: the word with missing/wrong punctuation (e.g., "Hello,how" not the full sentence)',
    '   - Word confusion: just the confused word (e.g., "Your" not "Your the best!")',
    '   - IMPORTANT: Report each error separately, even if they are adjacent',
    '3. Provide a clear explanation and correction',
    '',
    'Examples of CORRECT highlighting:',
    '- highlightedText: "recieve" → description: "Spelling error: should be \'receive\'"',
    '- highlightedText: "are" → description: "Subject-verb disagreement: \'team\' is singular, use \'is\'"',
    '- highlightedText: "Its" → description: "Missing apostrophe: should be \'It\'s\' (contraction of \'it is\')"',
    '- highlightedText: "Hello,how" → description: "Punctuation error: missing space after comma"',
    '- highlightedText: "fine.Thanks" → description: "Punctuation error: missing space after period"',
    '',
    'Focus on objective errors like:',
    '- Spelling mistakes',
    '- Subject-verb disagreement',
    '- Incorrect verb tenses (especially when time markers like "yesterday" indicate past tense)',
    '- Missing or incorrect punctuation (including missing periods at end of sentences)',
    '- Capitalization errors (including proper nouns that should be capitalized)',
    '- Commonly confused words (their/there/they\'re, its/it\'s, etc.)',
    '- Mixed constructions (like "the reason is because" which should be "the reason is that")',
    '- Tense consistency within sentences',
    '',
    'Special cases to watch for:',
    '- "Yesterday I go" → highlight "go" (should be "went")',
    '- Missing period at end of sentence → highlight the last word without period',
    '- "The reason is because" → highlight "is because of" or "is because" (redundant)',
    '- For compound proper nouns, you may highlight them together if they form a single entity (e.g., "united states" as one error)',
    '',
    'Important guidelines:',
    '- Only highlight actual errors, not stylistic preferences',
    '- Provide clear, actionable corrections',
    '- Be specific about what should be changed',
    '- Focus on clarity and correctness',
    '- CRITICAL: For highlightedText, be PRECISE and highlight ONLY the problematic word(s), not entire sentences',
    '- ALWAYS use the report_errors tool - never respond with plain text explanations',
    '- Report each distinct error as a separate entry. Don\'t combine multiple errors into one highlight.',
    '',
    'Context awareness:',
    '- Accept colloquialisms and informal language (e.g., "jankily", "kinda", "gonna") unless they\'re clearly typos',
    '- Recognize that some documents may be informal (blog posts, forum posts) vs formal (academic papers)',
    '- Stylistic emphasis (e.g., "rational reason") should NOT be marked as errors',
    '- Common internet/tech conventions (e.g., "[...]" for truncation) are acceptable',
    '- If document conventions are detected, respect them and don\'t flag convention-consistent spelling as errors',
    '',
    'REMINDER: Use the report_errors tool to report your findings. Do not analyze, explain, or discuss the content - just find errors and report them using the tool.'
  );
  
  return sections.join('\n');
}

/**
 * Build user prompt for chunk analysis
 */
export function buildUserPrompt(chunk: DocumentChunk): string {
  const numberedContent = chunk.getNumberedContent();
  
  return `Analyze the following text for spelling and grammar errors using the report_errors tool:

${numberedContent}`;
}

/**
 * Validate an error returned by the LLM
 */
export function validateError(
  error: {
    lineStart: number;
    lineEnd: number;
    highlightedText?: string;
    description?: string;
  },
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
  return categorizeErrorShared(description) as ErrorType;
}

/**
 * Determine error severity based on type and description
 */
export function determineSeverity(errorType: ErrorType, description: string): ErrorSeverity {
  return determineSeverityShared(errorType, description) as ErrorSeverity;
}