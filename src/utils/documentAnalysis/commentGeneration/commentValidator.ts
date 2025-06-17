import type { Comment } from "../../../types/documentSchema";
import {
  type LineBasedComment,
  LineBasedHighlighter,
  type LineSnippetHighlight,
} from "./lineBasedHighlighter";
import type { RawLLMComment } from "./types";

/**
 * Normalizes raw LLM comments by adding default values
 */
export function normalizeComments(
  rawComments: RawLLMComment[]
): LineBasedComment[] {
  return rawComments.map((comment) => ({
    title: comment.title,
    description: comment.description,
    highlight: comment.highlight,
    importance: comment.importance ?? 50,
    grade: comment.grade,
  }));
}

/**
 * Validates and converts line-based comments to offset-based format
 */
export async function validateAndConvertComments(
  comments: LineBasedComment[],
  documentContent: string
): Promise<Comment[]> {
  if (!Array.isArray(comments)) {
    throw new Error("Comments must be an array");
  }

  // Validate the raw comment structure
  const rawComments: LineBasedComment[] = comments.map((comment, index) => {
    if (!comment.title || typeof comment.title !== "string") {
      throw new Error(`Comment ${index} missing or invalid title`);
    }
    if (!comment.description || typeof comment.description !== "string") {
      throw new Error(`Comment ${index} missing or invalid description`);
    }
    if (!comment.highlight || typeof comment.highlight !== "object") {
      throw new Error(`Comment ${index} missing or invalid highlight`);
    }

    // Validate line-based highlight structure
    const highlight = comment.highlight;
    if (
      typeof highlight.startLineIndex !== "number" ||
      highlight.startLineIndex < 0
    ) {
      throw new Error(`Comment ${index} missing or invalid startLineIndex`);
    }
    if (
      typeof highlight.endLineIndex !== "number" ||
      highlight.endLineIndex < 0
    ) {
      throw new Error(`Comment ${index} missing or invalid endLineIndex`);
    }
    if (
      !highlight.startCharacters ||
      typeof highlight.startCharacters !== "string"
    ) {
      throw new Error(`Comment ${index} missing or invalid startCharacters`);
    }
    if (
      !highlight.endCharacters ||
      typeof highlight.endCharacters !== "string"
    ) {
      throw new Error(`Comment ${index} missing or invalid endCharacters`);
    }
    if (highlight.startLineIndex > highlight.endLineIndex) {
      throw new Error(
        `Comment ${index} has startLineIndex (${highlight.startLineIndex}) after endLineIndex (${highlight.endLineIndex})`
      );
    }

    if (
      typeof comment.importance !== "number" ||
      comment.importance < 0 ||
      comment.importance > 100
    ) {
      throw new Error(`Comment ${index} missing or invalid importance`);
    }

    // Validate optional grade field
    if (
      comment.grade !== undefined &&
      (typeof comment.grade !== "number" ||
        comment.grade < 0 ||
        comment.grade > 100)
    ) {
      throw new Error(`Comment ${index} invalid grade`);
    }

    return {
      title: comment.title,
      description: comment.description,
      highlight: highlight as LineSnippetHighlight,
      importance: comment.importance,
      grade: comment.grade,
    };
  });

  // Use the line-based highlighter to process comments
  const highlighter = new LineBasedHighlighter(documentContent);
  const processed = highlighter.processLineComments(rawComments);

  // Additional validation for the processed comments
  const validComments: Comment[] = [];
  const errors: string[] = [];

  processed.forEach((comment, index) => {
    try {
      if (!comment.highlight) {
        throw new Error(`Comment ${index} is missing highlight data`);
      }

      if (!comment.isValid) {
        throw new Error(
          `Comment ${index} failed highlight processing: ${comment.title}`
        );
      }

      if (
        comment.highlight.startOffset === undefined ||
        comment.highlight.endOffset === undefined
      ) {
        throw new Error(`Comment ${index} has missing highlight offsets`);
      }

      if (comment.highlight.startOffset < 0) {
        throw new Error(
          `Comment ${index} has negative start offset: ${comment.highlight.startOffset}`
        );
      }

      if (comment.highlight.endOffset <= comment.highlight.startOffset) {
        throw new Error(
          `Comment ${index} has invalid highlight range: start (${comment.highlight.startOffset}) must be before end (${comment.highlight.endOffset})`
        );
      }

      if (
        !comment.highlight.quotedText ||
        comment.highlight.quotedText.length === 0
      ) {
        throw new Error(`Comment ${index} has empty quoted text`);
      }

      if (comment.highlight.quotedText.length > 1500) {
        throw new Error(
          `Comment ${index} has highlight too long: ${comment.highlight.quotedText.length} characters (maximum 1500)`
        );
      }

      // If we get here, the comment is valid
      validComments.push(comment);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  });

  if (errors.length > 0) {
    console.warn(`⚠️ Found ${errors.length} invalid comments:`, errors);
    // Create a detailed error message for debugging
    const detailedError = `Validation failed for ${errors.length} comments:\n${errors.map((error, index) => `  ${index + 1}. ${error}`).join("\n")}`;
    throw new Error(detailedError);
  }

  console.log(`✅ Validated ${validComments.length} comments successfully`);
  return validComments;
}

/**
 * Creates error feedback for failed comments
 */
export function createValidationErrorFeedback(
  error: unknown,
  failedComments: any[],
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
6. NO DUPLICATES: Don't create comments for sections already covered by existing comments
7. REASONABLE LENGTH: Keep highlights between 5-1000 characters

FAILED COMMENTS DEBUG INFO:
${JSON.stringify(failedComments, null, 2)}

Please carefully review the line numbers and text snippets above, then create new highlights that exactly match the document content.`;
}
