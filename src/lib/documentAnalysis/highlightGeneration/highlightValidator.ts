import type { Comment } from "../../../types/documentSchema";
import { logger } from "@/lib/logger";
import {
  LineBasedLocator,
  type LineSnippetHighlight,
} from "@/lib/text-location/line-based";
import type { LineBasedHighlight, RawLLMHighlight } from "./types";

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

  // Use the line-based locator to process highlights
  const locator = new LineBasedLocator(documentContent);
  const validHighlights: Comment[] = [];
  let invalidCount = 0;

  for (const highlight of highlights) {
    try {
      // Basic validation
      if (!highlight.description || typeof highlight.description !== "string") {
        logger.warn("Skipping highlight with invalid description");
        invalidCount++;
        continue;
      }

      if (!highlight.highlight || typeof highlight.highlight !== "object") {
        logger.warn("Skipping highlight with missing highlight data");
        invalidCount++;
        continue;
      }

      // Let LineBasedLocator handle the conversion
      const highlightResult = locator.createHighlight(highlight.highlight);

      if (highlightResult && highlightResult.quotedText && highlightResult.quotedText.length > 0) {
        const processedComment: Comment = {
          description: highlight.description,
          importance: highlight.importance || 5,
          grade: highlight.grade,
          highlight: {
            startOffset: highlightResult.startOffset,
            endOffset: highlightResult.endOffset,
            quotedText: highlightResult.quotedText,
            isValid: true,
            prefix: highlightResult.prefix,
          },
          isValid: true,
        };
        validHighlights.push(processedComment);
      } else {
        logger.warn(`Could not convert highlight to offsets: "${highlight.description.slice(0, 50)}..."`);
        invalidCount++;
      }
    } catch (error) {
      logger.warn(`Error processing highlight: ${error instanceof Error ? error.message : String(error)}`);
      invalidCount++;
    }
  }

  if (invalidCount > 0) {
    logger.info(`Processed ${validHighlights.length} valid highlights, skipped ${invalidCount} invalid ones`);
  }

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
Error: ${errorMessage}
Document has ${documentLines} lines. 
Failed highlights: ${failedHighlights.length}
Please verify line numbers and text snippets match the document exactly.`;
}
