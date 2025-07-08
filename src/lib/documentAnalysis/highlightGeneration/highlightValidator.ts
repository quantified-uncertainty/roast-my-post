import type { Comment } from "../../../types/documentSchema";
import { logger } from "@/lib/logger";
import {
  type LineBasedHighlight,
  LineBasedHighlighter,
  type LineSnippetHighlight,
} from "./lineBasedHighlighter";
import type { RawLLMHighlight } from "./types";

/**
 * Normalizes raw LLM highlights by adding default values
 */
export function normalizeHighlights(
  rawHighlights: RawLLMHighlight[]
): LineBasedHighlight[] {
  return rawHighlights.map((highlight) => ({
    description: highlight.description,
    highlight: highlight.highlight,
    importance: highlight.importance ?? 50,
    grade: highlight.grade,
  }));
}

/**
 * Validates and converts line-based highlights to offset-based format
 */
export async function validateAndConvertHighlights(
  highlights: LineBasedHighlight[],
  documentContent: string
): Promise<Comment[]> {
  if (!Array.isArray(highlights)) {
    throw new Error("Highlights must be an array");
  }

  // Validate the raw highlight structure
  const rawHighlights: LineBasedHighlight[] = highlights.map((highlight, index) => {
    if (!highlight.description || typeof highlight.description !== "string") {
      throw new Error(`Highlight ${index} missing or invalid description`);
    }
    if (!highlight.highlight || typeof highlight.highlight !== "object") {
      throw new Error(`Highlight ${index} missing or invalid highlight`);
    }

    // Validate line-based highlight structure
    const highlightData = highlight.highlight;
    if (
      typeof highlightData.startLineIndex !== "number" ||
      highlightData.startLineIndex < 0
    ) {
      throw new Error(`Highlight ${index} missing or invalid startLineIndex`);
    }
    if (
      typeof highlightData.endLineIndex !== "number" ||
      highlightData.endLineIndex < 0
    ) {
      throw new Error(`Highlight ${index} missing or invalid endLineIndex`);
    }
    if (
      !highlightData.startCharacters ||
      typeof highlightData.startCharacters !== "string"
    ) {
      throw new Error(`Highlight ${index} missing or invalid startCharacters`);
    }
    if (
      !highlightData.endCharacters ||
      typeof highlightData.endCharacters !== "string"
    ) {
      throw new Error(`Highlight ${index} missing or invalid endCharacters`);
    }
    if (highlightData.startLineIndex > highlightData.endLineIndex) {
      throw new Error(
        `Highlight ${index} has startLineIndex (${highlightData.startLineIndex}) after endLineIndex (${highlightData.endLineIndex})`
      );
    }

    if (
      typeof highlight.importance !== "number" ||
      highlight.importance < 0 ||
      highlight.importance > 100
    ) {
      throw new Error(`Highlight ${index} missing or invalid importance`);
    }

    // Validate optional grade field
    if (
      highlight.grade !== undefined &&
      (typeof highlight.grade !== "number" ||
        highlight.grade < 0 ||
        highlight.grade > 100)
    ) {
      throw new Error(`Highlight ${index} invalid grade`);
    }

    return {
      description: highlight.description,
      highlight: highlightData as LineSnippetHighlight,
      importance: highlight.importance,
      grade: highlight.grade,
    };
  });

  // Use the line-based highlighter to process highlights
  const highlighter = new LineBasedHighlighter(documentContent);
  const processed = highlighter.processLineHighlights(rawHighlights);

  // Additional validation for the processed highlights
  const validHighlights: Comment[] = [];
  const errors: string[] = [];

  processed.forEach((highlight, index) => {
    try {
      if (!highlight.highlight) {
        throw new Error(`Highlight ${index} is missing highlight data`);
      }

      if (!highlight.isValid) {
        throw new Error(
          `Highlight ${index} failed highlight processing`
        );
      }

      if (
        highlight.highlight.startOffset === undefined ||
        highlight.highlight.endOffset === undefined
      ) {
        throw new Error(`Highlight ${index} has missing highlight offsets`);
      }

      if (highlight.highlight.startOffset < 0) {
        throw new Error(
          `Highlight ${index} has negative start offset: ${highlight.highlight.startOffset}`
        );
      }

      if (highlight.highlight.endOffset <= highlight.highlight.startOffset) {
        throw new Error(
          `Highlight ${index} has invalid highlight range: start (${highlight.highlight.startOffset}) must be before end (${highlight.highlight.endOffset})`
        );
      }

      if (
        !highlight.highlight.quotedText ||
        highlight.highlight.quotedText.length === 0
      ) {
        throw new Error(`Highlight ${index} has empty quoted text`);
      }

      if (highlight.highlight.quotedText.length > 1500) {
        throw new Error(
          `Highlight ${index} has highlight too long: ${highlight.highlight.quotedText.length} characters (maximum 1500)`
        );
      }

      // If we get here, the highlight is valid
      validHighlights.push(highlight);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  });

  if (errors.length > 0) {
    console.warn(`⚠️ Skipped ${errors.length} invalid highlights:`, errors);
    // Log details for debugging but don't fail
    errors.forEach((error, index) => {
      console.warn(`  - Highlight ${index + 1}: ${error}`);
    });
  }

  console.log(`✅ Validated ${validHighlights.length} highlights successfully${errors.length > 0 ? ` (${errors.length} skipped due to errors)` : ''}`);
  return validHighlights;
}

/**
 * Creates error feedback for failed highlights
 */
export function createValidationErrorFeedback(
  error: unknown,
  failedHighlights: any[],
  documentContent: string
): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const documentLines = documentContent.split("\n").length;

  return `
VALIDATION ERROR FROM PREVIOUS ATTEMPT:
${errorMessage}

DEBUGGING TIPS FOR FIXING HIGHLIGHTS:
1. VERIFY LINE NUMBERS: Check that your startLineIndex and endLineIndex match the "Line X:" numbers in the document above
2. COPY TEXT EXACTLY: Your startCharacters and endCharacters must be copied EXACTLY from the specified lines
3. CHECK DOCUMENT BOUNDS: The document has ${documentLines} lines (0-${documentLines - 1})
4. USE PROPER SNIPPETS: Character snippets should be 3-8 characters from the actual line content
5. SINGLE-LINE RULE: If highlighting within one line, startLineIndex must equal endLineIndex
6. NO DUPLICATES: Don't create highlights for sections already covered by existing highlights
7. REASONABLE LENGTH: Keep highlights between 5-1000 characters

FAILED COMMENTS DEBUG INFO:
${JSON.stringify(failedHighlights, null, 2)}

Please carefully review the line numbers and text snippets above, then create new highlights that exactly match the document content.`;
}
