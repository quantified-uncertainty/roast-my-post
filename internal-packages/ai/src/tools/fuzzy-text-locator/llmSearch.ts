/**
 * LLM-based text search fallback
 * Uses Claude to find text when fuzzy matching fails
 * Uses line-based finding for more reliable results
 */

import {
  callClaudeWithTool,
} from "../../claude/wrapper";
import { MODEL_CONFIG } from "../../claude/wrapper";
import { logger } from "../../shared/logger";
import { LineBasedLocator } from "../../text-location/line-based";

import { TextLocation } from "./types";

export interface LLMSearchOptions {
  context?: string;
  pluginName?: string;
}

interface LineBasedMatch {
  found: boolean;
  startLineNumber: number;
  endLineNumber: number;
  startCharacters: string;
  endCharacters: string;
  confidence: number;
}

/**
 * Convert LLM line-based match result to character offsets
 * Extracted for better testability and separation of concerns
 */
export function convertLLMResultToLocation(
  llmResult: LineBasedMatch,
  locator: LineBasedLocator,
  searchText: string,
  documentText: string
): TextLocation | null {
  const { 
    found, 
    startLineNumber, 
    endLineNumber, 
    startCharacters, 
    endCharacters,
    confidence 
  } = llmResult;

  if (!found) {
    logger.debug("LLM: Text not found");
    return null;
  }

  // Additional validation for edge cases
  const isShortQuery = searchText.length <= 3;
  if (isShortQuery && !startCharacters.trim()) {
    logger.warn("LLM returned empty characters for short query");
    return null;
  }

  // Check line numbers are valid
  const stats = locator.getStats();
  if (
    startLineNumber < 1 ||
    endLineNumber < 1 ||
    startLineNumber > stats.totalLines ||
    endLineNumber > stats.totalLines
  ) {
    logger.warn("LLM returned invalid line numbers", {
      startLineNumber,
      endLineNumber,
      totalLines: stats.totalLines,
    });
    return null;
  }

  // Validate that character snippets can be found in the specified lines
  const startLine = locator.getLine(startLineNumber);
  const endLine = locator.getLine(endLineNumber);

  if (startCharacters.trim()) {
    // Check if the snippet can be found with fuzzy matching
    const testLocation = {
      startLineIndex: startLineNumber - 1,
      endLineIndex: startLineNumber - 1,
      startCharacters,
      endCharacters: startCharacters, // Use same for validation
    };

    const testResult = locator.lineLocationToOffset(testLocation);
    if (!testResult) {
      logger.warn(
        `LLM start characters "${startCharacters}" cannot be located in line ${startLineNumber}: "${startLine}"`
      );
      return null;
    }
  }

  if (endCharacters.trim() && endLineNumber !== startLineNumber) {
    // Only validate end characters if they're on a different line
    const testLocation = {
      startLineIndex: endLineNumber - 1,
      endLineIndex: endLineNumber - 1,
      startCharacters: endCharacters,
      endCharacters,
    };

    const testResult = locator.lineLocationToOffset(testLocation);
    if (!testResult) {
      logger.warn(
        `LLM end characters "${endCharacters}" cannot be located in line ${endLineNumber}: "${endLine}"`
      );
      return null;
    }
  }

  // Convert line-based location to character offsets
  const lineLocation = {
    startLineIndex: startLineNumber - 1, // Convert to 0-based
    endLineIndex: endLineNumber - 1,
    startCharacters,
    endCharacters,
  };

  const charLocation = locator.lineLocationToOffset(lineLocation);

  if (!charLocation) {
    logger.warn(
      "Failed to convert line location to character offsets, trying fallback",
      lineLocation
    );

    // Fallback: Create approximate location based on line boundaries
    // Calculate the character offset where the target line starts
    let startLineOffset = 0;
    for (let lineNum = 1; lineNum < startLineNumber; lineNum++) {
      const lineContent = locator.getLine(lineNum);
      startLineOffset += lineContent.length + 1; // +1 for newline character
    }

    const approximateStart = Math.max(0, startLineOffset);
    const approximateEnd = Math.min(
      stats.totalCharacters,
      approximateStart + Math.max(50, searchText.length * 1.5)
    );

    const fallbackText = documentText.substring(
      approximateStart,
      approximateEnd
    );

    logger.debug(
      `Using fallback location: [${approximateStart}, ${approximateEnd}] = "${fallbackText.substring(0, 50)}..."`
    );

    return {
      startOffset: approximateStart,
      endOffset: approximateEnd,
      quotedText: fallbackText,
      strategy: "llm",
      confidence: Math.max(0.5, confidence * 0.7), // Lower confidence for fallback
    };
  }

  logger.debug(
    `LLM found: "${charLocation.quotedText}" at [${charLocation.startOffset}, ${charLocation.endOffset}]`
  );

  return {
    startOffset: charLocation.startOffset,
    endOffset: charLocation.endOffset,
    quotedText: charLocation.quotedText,
    strategy: "llm",
    confidence: Math.max(0.7, confidence * 0.9), // Scale down LLM confidence
  };
}

/**
 * Generate prompts for the LLM text search
 */
export function generateLLMSearchPrompts(
  searchText: string,
  numberedLines: string,
  context?: string
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are a precise text locator. Find the MINIMAL text segment that semantically matches the search text.

KEY RULE: Return only the portion that matches - NOT entire lines or surrounding context.

CRITICAL EDGE CASE HANDLING:
1. Short queries (1-3 chars): Match the FIRST occurrence exactly - don't include surrounding words
2. Case differences: "united states" matches "United States" but exclude preceding "The"
3. Whitespace: Treat \\n as spaces, \\u00A0 as regular spaces, multiple spaces as single
4. Word order: "big red house" can match "red big house" but return only matching portion
5. Punctuation: "?" matches just "?" not "What?"
6. MULTIPLE OCCURRENCES: If similar text appears multiple times in a line, choose the occurrence that best matches the FULL search text, not just the beginning

Output Format:
- found: true if match found with confidence >= 0.5
- startLineNumber/endLineNumber: 1-based line numbers (0 if not found)
- startCharacters: EXACT first 6-10 chars of THE MATCH (must be unique enough to identify the correct occurrence)
- endCharacters: EXACT last 6-10 chars of THE MATCH (not the line!)
- confidence: 1.0=exact, 0.8-0.9=minor typos, 0.6-0.8=paraphrased, 0.5-0.6=loose semantic

Examples:

Search: "IP"
Line 1: The IP address is 192.168.1.1
→ Match: "IP" (exclude "The")
→ Output: startCharacters="IP", endCharacters="IP", confidence=1.0

Search: "?"
Line 1: What? Yes! No...
→ Match: "?" (first occurrence only)
→ Output: startCharacters="?", endCharacters="?", confidence=1.0

Search: "united states of america"
Line 1: The United States Of America Is A Country.
→ Match: "United States Of America" (exclude "The")
→ Output: startCharacters="United Sta", endCharacters="f America", confidence=0.95

Search: "machine learning paradigms"
Line 1: The area of machine learning has grown. Machine learning paradigms include supervised learning.
→ Match: "machine learning paradigms" (the SECOND occurrence, which matches the full phrase)
→ Output: startCharacters="machine lea", endCharacters="paradigms", confidence=1.0
→ Note: Use "machine lea" (with 'a') to distinguish from first "machine le" occurrence

Search: "quick brown fox jumps"
Line 1: The quick
Line 2: brown fox
Line 3: jumps over the lazy dog.
→ Match: "quick\\nbrown fox\\njumps" (preserve newlines)
→ Output: startCharacters="quick\\nbrow", endCharacters="fox\\njumps", confidence=1.0

WARNING: When multiple similar phrases exist, ensure startCharacters uniquely identifies the correct match.`;

  const userPrompt = `<task>
Find precisely where the following search text appears in the document. It may be paraphrased or contain variations.
</task>

<search_text>
${searchText}
</search_text>

${
  context
    ? `<context>
This text was highlighted in the context of: ${context}
</context>`
    : ""
}

<document>
${numberedLines}
</document>`;

  return { systemPrompt, userPrompt };
}

export async function llmSearch(
  searchText: string,
  documentText: string,
  options: LLMSearchOptions = {}
): Promise<TextLocation | null> {
  logger.debug(`LLM search for: "${searchText.slice(0, 50)}..."`, {
    plugin: options.pluginName,
  });

  try {
    // Use shared line-based locator
    const locator = new LineBasedLocator(documentText);
    const numberedLines = locator.getNumberedLines();

    const { systemPrompt, userPrompt } = generateLLMSearchPrompts(
      searchText,
      numberedLines,
      options.context
    );

    // Session tracking is now handled globally by the session manager

    const result = await callClaudeWithTool<LineBasedMatch>(
      {
        model: MODEL_CONFIG.analysis,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        max_tokens: 500,
        temperature: 0,
        toolName: "locate_text",
        toolDescription:
          "Locate text in a document using line numbers and character snippets for precise positioning",
        toolSchema: {
          type: "object",
          properties: {
            found: {
              type: "boolean",
              description: "Whether text was found",
            },
            startLineNumber: {
              type: "number",
              description: "Start line (1-based)",
              minimum: 0,
            },
            endLineNumber: {
              type: "number",
              description: "End line (1-based)",
              minimum: 0,
            },
            startCharacters: {
              type: "string",
              description: "First 6-10 chars",
              maxLength: 10,
            },
            endCharacters: {
              type: "string",
              description: "Last 6-10 chars",
              maxLength: 10,
            },
            confidence: {
              type: "number",
              description: "Match confidence 0-1",
              minimum: 0,
              maximum: 1,
            },
          },
          required: [
            "found",
            "startLineNumber",
            "endLineNumber",
            "startCharacters",
            "endCharacters",
            "confidence",
          ],
        },
      },
      []
    );

    return convertLLMResultToLocation(result.toolResult, locator, searchText, documentText);
  } catch (error) {
    logger.error("LLM search failed:", error);
    return null;
  }
}