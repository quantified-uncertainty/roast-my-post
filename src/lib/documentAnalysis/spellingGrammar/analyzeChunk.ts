import { anthropic, ANALYSIS_MODEL, DEFAULT_TEMPERATURE } from "../../../types/openai";
import type { ChunkWithLineNumbers, SpellingGrammarHighlight, AgentContext } from "./types";
import { logger } from "@/lib/logger";

/**
 * Analyzes a chunk of text for spelling and grammar errors
 * Returns highlights with exact line numbers and text
 */
export async function analyzeChunk(
  chunk: ChunkWithLineNumbers,
  agentContext: AgentContext,
  maxRetries: number = 3
): Promise<SpellingGrammarHighlight[]> {
  // Don't process empty chunks
  if (!chunk.content.trim()) {
    return [];
  }

  // Format the chunk with line numbers for the LLM
  const numberedContent = chunk.lines
    .map((line, index) => `Line ${chunk.startLineNumber + index}: ${line}`)
    .join("\n");

  const systemPrompt = `You are a professional proofreader and grammar checker. Your task is to identify spelling and grammar errors in the provided text.

${agentContext.primaryInstructions}

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
- Common internet/tech conventions (e.g., "[...]" for truncation) are acceptable`;

  const userPrompt = `Please analyze the following text for spelling and grammar errors. The text is provided with line numbers.

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

  // Retry logic for handling intermittent LLM failures
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Add a small delay between retries to avoid rate limiting
      if (attempt > 1) {
        const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff: 2s, 4s, 8s
        logger.info(`Retrying chunk analysis (attempt ${attempt}/${maxRetries}) after ${delay}ms delay`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const response = await anthropic.messages.create({
        model: ANALYSIS_MODEL,
        max_tokens: 2000,
        temperature: DEFAULT_TEMPERATURE,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
        tools: [
          {
            name: "report_errors",
            description: "Report spelling and grammar errors found in the text",
            input_schema: {
              type: "object",
              properties: {
                errors: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      lineStart: {
                        type: "number",
                        description: "Starting line number where the error occurs (from the provided line numbers)",
                      },
                      lineEnd: {
                        type: "number",
                        description: "Ending line number where the error occurs (same as lineStart for single-line errors)",
                      },
                      highlightedText: {
                        type: "string",
                        description: "ONLY the problematic word(s). For spelling: just the misspelled word. For grammar: just the incorrect word(s). Be precise and minimal.",
                      },
                      description: {
                        type: "string",
                        description: "Clear explanation of the error and suggested correction. Format: 'Error type: [explanation]. Suggested correction: [correction]'",
                      },
                    },
                    required: ["lineStart", "lineEnd", "highlightedText", "description"],
                  },
                },
              },
              required: ["errors"],
            },
          },
        ],
        tool_choice: { type: "tool", name: "report_errors" },
      });

      const toolUse = response.content.find((c) => c.type === "tool_use");
      if (!toolUse || toolUse.name !== "report_errors") {
        logger.error(`No tool use response from Anthropic (attempt ${attempt}/${maxRetries})`);
        if (attempt === maxRetries) {
          return [];
        }
        continue;
      }

      const result = toolUse.input as { errors: SpellingGrammarHighlight[] };
      
      // Ensure result has errors array
      if (!result || !Array.isArray(result.errors)) {
        logger.error(`Invalid response structure from LLM (attempt ${attempt}/${maxRetries})`, {
          result,
          toolUseName: toolUse.name,
          toolUseInput: toolUse.input,
          responseId: response.id,
          attempt
        });
        if (attempt === maxRetries) {
          return [];
        }
        continue;
      }
      
      // Validate and clean the results
      const validatedHighlights = result.errors.filter(error => {
        // Ensure line numbers are within the chunk
        const minLine = chunk.startLineNumber;
        const maxLine = chunk.startLineNumber + chunk.lines.length - 1;
        
        if (error.lineStart < minLine || error.lineEnd > maxLine) {
          logger.warn(`Invalid line numbers: ${error.lineStart}-${error.lineEnd} not in range ${minLine}-${maxLine}`);
          return false;
        }
        
        // Ensure highlighted text is not empty
        if (!error.highlightedText.trim()) {
          logger.warn("Empty highlighted text in error");
          return false;
        }
        
        // Ensure description is meaningful
        if (!error.description || error.description.length < 10) {
          logger.warn("Invalid or too short description");
          return false;
        }
        
        return true;
      });

      // Success! Return the validated highlights
      if (attempt > 1) {
        logger.info(`Chunk analysis succeeded on attempt ${attempt}`);
      }
      return validatedHighlights;

    } catch (error) {
      logger.error(`Error analyzing chunk (attempt ${attempt}/${maxRetries}):`, error);
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }

  // This should never be reached, but just in case
  return [];
}