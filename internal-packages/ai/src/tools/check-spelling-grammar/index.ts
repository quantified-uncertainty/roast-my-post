import { z } from 'zod';
import { Tool, ToolContext } from '../base/Tool';
import { callClaudeWithTool } from '../../claude/wrapper';
import { generateCacheSeed } from '../shared/cache-utils';
import { detectLanguageConventionTool } from '../detect-language-convention';
import type { LanguageConvention, LanguageConventionOption } from '../../shared/types';

export interface SpellingGrammarError {
  text: string;
  correction: string;
  displayCorrection: string;
  type: 'spelling' | 'grammar';
  context?: string;
  importance: number; // 0-100
  confidence: number; // 0-100
  description?: string; // 0 for obvious, 1-2 sentences for complex
  lineNumber?: number; // Approximate line number where error occurs
}

export interface CheckSpellingGrammarInput {
  text: string;
  context?: string;
  maxErrors?: number;
  convention?: LanguageConventionOption;
  strictness?: 'minimal' | 'standard' | 'thorough'; // New option
}

export interface CheckSpellingGrammarOutput {
  errors: SpellingGrammarError[];
  metadata?: {
    totalErrorsFound: number;
    convention: LanguageConvention | 'mixed';
    processingTime?: number;
  };
}

// Enhanced input schema
const inputSchema = z.object({
  text: z.string().min(1).max(500000).describe('The text to check for spelling and grammar errors'),
  context: z.string().max(1000).optional().describe('Additional context about the text (e.g., academic paper, casual email, technical documentation)'),
  maxErrors: z.number().min(1).max(100).optional().default(50).describe('Maximum number of errors to return'),
  convention: z.enum(['US', 'UK', 'auto']).optional().default('auto').describe('Which English convention to use'),
  strictness: z.enum(['minimal', 'standard', 'thorough']).optional().default('standard').describe('How strict the checking should be')
}) satisfies z.ZodType<CheckSpellingGrammarInput>;

// Enhanced output schema
const outputSchema = z.object({
  errors: z.array(z.object({
    text: z.string().describe('The EXACT incorrect text from the input'),
    correction: z.string().describe('Suggested correction'),
    displayCorrection: z.string().describe('XML markup for displaying correction (e.g., "<r:replace from=\"teh\" to=\"the\"/>\")' ),
    type: z.enum(['spelling', 'grammar']).describe('Type of error'),
    context: z.string().optional().describe('Surrounding context (20-30 chars each side)'),
    importance: z.number().min(0).max(100).describe('Importance score (0-100)'),
    confidence: z.number().min(0).max(100).describe('Confidence in this error (0-100)'),
    description: z.string().nullable().optional().describe('Explanation for complex cases (0 for obvious, 1-2 sentences otherwise)'),
    lineNumber: z.number().optional().describe('Approximate line number where error occurs')
  })).describe('List of errors found'),
  metadata: z.object({
    totalErrorsFound: z.number().describe('Total number of errors found (before limiting)'),
    convention: z.enum(['US', 'UK', 'mixed']).describe('Detected or applied convention'),
    processingTime: z.number().optional().describe('Processing time in milliseconds')
  }).optional()
});

export class CheckSpellingGrammarTool extends Tool<CheckSpellingGrammarInput, CheckSpellingGrammarOutput> {
  config = {
    id: 'check-spelling-grammar',
    name: 'Check Spelling & Grammar',
    description: 'Analyze text for spelling and grammar errors using Claude with advanced error detection',
    version: '2.0.0',
    category: 'analysis' as const,
    costEstimate: '~$0.01-0.02 per check',
    path: '/tools/check-spelling-grammar',
    status: 'stable' as const
  };
  
  inputSchema = inputSchema;
  outputSchema = outputSchema as any;
  
  async execute(input: CheckSpellingGrammarInput, context: ToolContext): Promise<CheckSpellingGrammarOutput> {
    const startTime = Date.now();
    context.logger.info(`[CheckSpellingGrammarTool] Checking text (${input.text.length} chars, strictness: ${input.strictness || 'standard'})`);
    
    try {
      // Detect convention if set to auto
      let convention = input.convention || 'auto';
      let detectedConvention: 'US' | 'UK' | 'mixed' = 'US';
      
      if (convention === 'auto') {
        context.logger.info('[CheckSpellingGrammarTool] Auto-detecting language convention');
        const detectionResult = await detectLanguageConventionTool.execute(
          { text: input.text },
          context
        );
        
        if (detectionResult.confidence > 0.5) {
          convention = detectionResult.convention;
          detectedConvention = detectionResult.convention;
          context.logger.info(`[CheckSpellingGrammarTool] Detected ${convention} English (${Math.round(detectionResult.confidence * 100)}% confidence)`);
        } else if (detectionResult.consistency < 0.3) {
          detectedConvention = 'mixed';
          context.logger.info('[CheckSpellingGrammarTool] Mixed conventions detected');
        }
      } else {
        detectedConvention = convention as 'US' | 'UK';
      }
      
      const result = await this.checkSpellingGrammar({ ...input, convention }, detectedConvention);
      
      // Note: For accurate position finding, use the fuzzy-text-locator tool
      // with the lineNumber hint from the errors
      
      return {
        errors: result.errors,
        metadata: {
          totalErrorsFound: result.totalFound,
          convention: detectedConvention,
          processingTime: Date.now() - startTime
        }
      };
    } catch (error) {
      context.logger.error('[CheckSpellingGrammarTool] Error checking spelling/grammar:', error);
      throw error;
    }
  }
  
  private async checkSpellingGrammar(
    input: CheckSpellingGrammarInput, 
    detectedConvention: 'US' | 'UK' | 'mixed'
  ): Promise<{
    errors: SpellingGrammarError[];
    totalFound: number;
  }> {
    const strictnessSettings = {
      minimal: {
        description: 'only clear spelling errors and major grammar mistakes',
        threshold: 51
      },
      standard: {
        description: 'spelling errors, grammar mistakes, and clarity issues',
        threshold: 26
      },
      thorough: {
        description: 'all errors including minor style issues and word choice',
        threshold: 0
      }
    };
    
    const settings = strictnessSettings[input.strictness || 'standard'];
    
    const systemPrompt = `<role>You are a professional proofreading assistant specializing in error detection.</role>

<task>Identify spelling and grammar errors in the provided text with high precision.</task>

<critical_requirements>
  <requirement priority="1">
    The "text" field MUST contain the EXACT text from the input, character-for-character.
    - Copy the error text directly from the input
    - DO NOT paraphrase, summarize, or modify the error text
    - Include complete phrases if the error spans multiple words
  </requirement>
  
  <requirement priority="2">
    NEVER report errors that don't exist in the input text.
    - Every error must be verifiable in the original text
    - If uncertain, do not report it
  </requirement>
  
  <requirement priority="3">
    Minimize false positives - be conservative with error detection.
    - Focus on ${settings.description}
    - Only report errors with importance ≥ ${settings.threshold}
  </requirement>
</critical_requirements>

<convention_handling>
  ${input.convention && input.convention !== 'auto' ? 
    `<strict_mode>
      Use ${input.convention} English conventions EXCLUSIVELY.
      Flag ANY words using ${input.convention === 'US' ? 'UK' : 'US'} spelling as errors.
      
      Common differences to check:
      - ${input.convention === 'US' ? 'organize/organization (not organise/organisation)' : 'organise/organisation (not organize/organization)'}
      - ${input.convention === 'US' ? 'color/honor/favor (not colour/honour/favour)' : 'colour/honour/favour (not color/honor/favor)'}
      - ${input.convention === 'US' ? 'center/theater (not centre/theatre)' : 'centre/theatre (not center/theater)'}
      - ${input.convention === 'US' ? 'traveled/canceled (single L)' : 'travelled/cancelled (double L)'}
      - ${input.convention === 'US' ? 'analyze/paralyze (not analyse/paralyse)' : 'analyse/paralyse (not analyze/paralyze)'}
    </strict_mode>` : 
    `<flexible_mode>
      ${detectedConvention === 'mixed' ? 
        'Mixed conventions detected. Do NOT flag consistent use of either US or UK spelling within the same word family.' :
        `Predominant convention appears to be ${detectedConvention} English. Accept consistent use of this convention.`}
    </flexible_mode>`}
</convention_handling>

<error_types>
  <do_flag>
    - Clear misspellings (e.g., "teh", "recieve", "occured")
    - Grammar errors affecting clarity (subject-verb disagreement, tense inconsistency)
    - Wrong word usage (their/there/they're, its/it's)
    - Missing or incorrect punctuation that changes meaning
    ${input.convention && input.convention !== 'auto' ? 
      `- Words using ${input.convention === 'US' ? 'UK' : 'US'} spelling conventions` : ''}
    ${input.strictness === 'thorough' ? 
      '- Style issues (wordiness, passive voice in formal contexts)\n    - Inconsistent capitalization or formatting' : ''}
  </do_flag>
  
  <do_not_flag>
    - Informal/colloquial language in appropriate contexts
    - Technical jargon or domain-specific terms
    - Proper nouns, names, or acronyms
    - Creative/intentional language use
    - Valid alternative spellings (if not in strict convention mode)
    ${input.strictness === 'minimal' ? 
      '- Minor style preferences\n    - Oxford comma usage\n    - Sentence fragments in informal contexts' : ''}
  </do_not_flag>
</error_types>

<importance_scoring>
  0-25: Minor typos with minimal impact (e.g., "teh" → "the", "recieve" → "receive")
  26-50: Noticeable errors affecting readability (e.g., their/there confusion, its/it's)
  51-75: Clarity/credibility issues (e.g., subject-verb disagreement, tense inconsistency)
  76-100: Severe grammar errors or misspellings in key terms (e.g., technical/domain terms, proper nouns in formal contexts)
</importance_scoring>

<confidence_scoring>
  90-100: Certain this is an error (obvious typos, clear grammar violations)
  70-89: High confidence (standard errors, well-established rules)
  50-69: Moderate confidence (style preferences, context-dependent)
  0-49: Low confidence (ambiguous cases, could be intentional)
</confidence_scoring>

<description_guidelines>
  - For obvious errors (confidence 90+): Leave description empty or null
  - For complex cases: 1-2 sentences explaining why it's an error
  - Focus on WHY it's wrong, not just restating the correction
  - Examples:
    - Empty for: "teh" → "the" 
    - "The subject 'team' is collective and takes singular verb 'has'" for subject-verb disagreement
    - "Ambiguous pronoun reference - unclear whether 'he' refers to John or Mark"
</description_guidelines>

<examples>
  <example>
    Input: "I recieved teh package yesterday."
    Error 1:
    {
      "text": "recieved",
      "correction": "received",
      "displayCorrection": "<r:replace from=\"recieved\" to=\"received\"/>",
      "type": "spelling",
      "context": "I recieved teh package",
      "importance": 30,
      "confidence": 100,
      "description": null,
      "lineNumber": 1
    }
    Error 2:
    {
      "text": "teh",
      "correction": "the",
      "displayCorrection": "<r:replace from=\"teh\" to=\"the\"/>",
      "type": "spelling",
      "context": "recieved teh package yesterday",
      "importance": 15,
      "confidence": 100,
      "description": null,
      "lineNumber": 1
    }
  </example>
  
  <example>
    Input: "The team of engineers are working on the project."
    Error:
    {
      "text": "are",
      "correction": "is",
      "displayCorrection": "<r:replace from=\"are\" to=\"is\"/>",
      "type": "grammar",
      "context": "engineers are working on",
      "importance": 45,
      "confidence": 85,
      "description": "The subject 'team' is singular and requires the singular verb 'is', not the plural 'are'.",
      "lineNumber": 1
    }
  </example>
  
  <example>
    Input: "Its a beautiful day, but the cat licked it's paws."
    Error 1:
    {
      "text": "Its",
      "correction": "It's",
      "displayCorrection": "<r:replace from=\"Its\" to=\"It&apos;s\"/>",
      "type": "grammar",
      "context": "Its a beautiful",
      "importance": 40,
      "confidence": 95,
      "description": null,
      "lineNumber": 1
    }
    Error 2:
    {
      "text": "it's",
      "correction": "its",
      "displayCorrection": "<r:replace from=\"it&apos;s\" to=\"its\"/>",
      "type": "grammar",
      "context": "cat licked it's paws",
      "importance": 40,
      "confidence": 95,
      "description": null,
      "lineNumber": 1
    }
  </example>
  
  <example>
    Input: "The data is compelling." (in academic context)
    Error:
    {
      "text": "data is",
      "correction": "data are",
      "displayCorrection": "<r:replace from=\"data is\" to=\"data are\"/>",
      "type": "grammar",
      "context": "The data is compelling",
      "importance": 25,
      "confidence": 65,
      "description": "In formal academic writing, 'data' is traditionally treated as plural, though singular usage is increasingly accepted.",
      "lineNumber": 1
    }
  </example>
</examples>

<line_number_guidance>
  To help with location finding:
  - The input text has line numbers prepended in format "N: text"
  - Extract the line number from the prepended format
  - The "text" field should contain the EXACT error text WITHOUT the line number prefix
  - The "lineNumber" field should contain the extracted line number
  - If an error spans multiple lines, give the first line number
</line_number_guidance>

<output_format>
  For each error, provide:
  1. text: The EXACT error text from input
  2. correction: The corrected version
  3. displayCorrection: XML markup for display (e.g., "<r:replace from=\"teh\" to=\"the\"/>")
  4. type: "spelling" or "grammar"
  5. context: ~20-30 characters on each side of the error
  6. importance: Score from 0-100
  7. confidence: Score from 0-100
  8. description: null for obvious errors, 1-2 sentences for complex cases
  9. lineNumber: The line number where the error appears (starting from 1)
</output_format>`;

    // Add line numbers to help LLM identify locations
    const addLineNumbers = (text: string): string => {
      return text.split('\n').map((line, index) => `${index + 1}: ${line}`).join('\n');
    };
    
    const textWithLineNumbers = addLineNumbers(input.text);

    const userPrompt = `<context>
  ${input.context ? `<document_type>${input.context}</document_type>` : ''}
  <strictness>${input.strictness || 'standard'}</strictness>
  <max_errors>${input.maxErrors || 50}</max_errors>
</context>

<text_to_check>
${textWithLineNumbers}
</text_to_check>

<instructions>
  1. Carefully read the entire text
  2. Identify errors based on the requirements and convention settings
  3. For each error, extract the EXACT text that contains the error
  4. Provide corrections and importance scores
  5. Return up to ${input.maxErrors || 50} errors, prioritized by importance
  6. Remember: ONLY report text that actually exists in the input
</instructions>`;

    
    // Generate cache seed
    const cacheSeed = generateCacheSeed('spelling-v2', [
      input.text,
      input.context || '',
      input.maxErrors || 50,
      input.convention || 'auto',
      input.strictness || 'standard'
    ]);
    
    const result = await callClaudeWithTool<{ 
      errors: SpellingGrammarError[]; 
      totalErrorsFound?: number;
    }>({
      system: systemPrompt,
      messages: [{
        role: "user",
        content: userPrompt
      }],
      max_tokens: 2000,
      temperature: 0,
      toolName: "report_errors",
      toolDescription: "Report spelling and grammar errors found in the text",
      toolSchema: {
        type: "object",
        properties: {
          errors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: { 
                  type: "string", 
                  description: "The EXACT incorrect text from the input - must be character-for-character identical" 
                },
                correction: { 
                  type: "string", 
                  description: "Suggested correction" 
                },
                displayCorrection: { 
                  type: "string", 
                  description: "XML markup for displaying correction (e.g., '<r:replace from=\"teh\" to=\"the\"/>')" 
                },
                type: {
                  type: "string",
                  enum: ["spelling", "grammar"],
                  description: "Type of error"
                },
                context: { 
                  type: "string", 
                  description: "~20-30 characters of context on each side of the error" 
                },
                importance: { 
                  type: "number", 
                  description: "Importance score (0-100)",
                  minimum: 0,
                  maximum: 100
                },
                confidence: {
                  type: "number",
                  description: "Confidence in this error (0-100)",
                  minimum: 0,
                  maximum: 100
                },
                description: {
                  type: ["string", "null"],
                  description: "Explanation for complex cases (null for obvious errors, 1-2 sentences otherwise)"
                },
                lineNumber: {
                  type: "number",
                  description: "The line number where the error appears (starting from 1)"
                }
              },
              required: ["text", "correction", "displayCorrection", "type", "importance", "confidence"]
            }
          },
          totalErrorsFound: {
            type: "number",
            description: "Total number of errors found before limiting"
          }
        },
        required: ["errors"]
      },
      enablePromptCaching: true,
      cacheSeed
    });

    const rawErrors = result.toolResult.errors || [];
    const totalFound = result.toolResult.totalErrorsFound || rawErrors.length;
    
    // Enhanced validation - only keep errors that exist exactly in the input
    const validationResults = rawErrors.map(error => {
      if (!error.text || typeof error.text !== 'string') {
        return { error, valid: false, reason: 'missing or invalid text field' };
      }
      
      // Check if the error text exists EXACTLY in the input
      const exists = input.text.includes(error.text);
      
      if (!exists) {
        return { error, valid: false, reason: 'text not found in input' };
      }
      
      return { error, valid: true, reason: 'valid' };
    });
    
    // Log validation stats
    const invalidCount = validationResults.filter(r => !r.valid).length;
    if (invalidCount > 0) {
      console.warn(
        `[CheckSpellingGrammarTool] Filtered ${invalidCount} invalid errors out of ${rawErrors.length} total`
      );
      
      // Log a sample of invalid errors for debugging
      validationResults
        .filter(r => !r.valid)
        .slice(0, 3)
        .forEach(({ error, reason }) => {
          console.debug(
            `[CheckSpellingGrammarTool] Invalid error: "${error.text?.slice(0, 50)}..." - ${reason}`
          );
        });
    }
    
    const errors = validationResults
      .filter(r => r.valid)
      .map(r => ({
        ...r.error,
        // Convert null description to undefined for cleaner output
        description: r.error.description === null ? undefined : r.error.description
      }));

    return { errors, totalFound };
  }
  
  
  override async beforeExecute(input: CheckSpellingGrammarInput, context: ToolContext): Promise<void> {
    context.logger.info(
      `[CheckSpellingGrammarTool] Starting check for ${input.text.length} characters ` +
      `(mode: ${input.strictness || 'standard'}, convention: ${input.convention || 'auto'})`
    );
  }
  
  override async afterExecute(output: CheckSpellingGrammarOutput, context: ToolContext): Promise<void> {
    const errorBreakdown = output.errors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    context.logger.info(
      `[CheckSpellingGrammarTool] Found ${output.errors.length} errors ` +
      `(${JSON.stringify(errorBreakdown)}) in ${output.metadata?.processingTime || 0}ms`
    );
  }
}

// Export singleton instance
export const checkSpellingGrammarTool = new CheckSpellingGrammarTool();
export default checkSpellingGrammarTool;