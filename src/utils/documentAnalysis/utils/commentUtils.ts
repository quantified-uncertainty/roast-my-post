import type { Comment } from "../../../types/documentSchema";
import {
  LineBasedHighlighter,
  type LineCharacterComment,
  type LineCharacterHighlight,
} from "../../highlightUtils";

export async function validateComments(
  comments: any[],
  content: string
): Promise<Comment[]> {
  if (!Array.isArray(comments)) {
    throw new Error("Comments must be an array");
  }

  console.log("Starting line-based comment validation");

  // Validate the raw comment structure
  const rawComments: LineCharacterComment[] = comments.map((comment, index) => {
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
      highlight: highlight as LineCharacterHighlight,
      importance: comment.importance,
      grade: comment.grade,
    };
  });

  console.log("Raw comments validated, processing line-based highlights");

  // Use the line-based highlighter to process comments
  const highlighter = new LineBasedHighlighter(content);
  const processed = highlighter.processLineComments(rawComments);

  // Additional validation for the processed comments
  const validComments: Comment[] = [];
  const errors: string[] = [];

  processed.forEach((comment, index) => {
    console.log(`Validating processed comment ${index}: ${comment.title}`);

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

      // More lenient length validation for line-based approach
      if (comment.highlight.quotedText.length < 5) {
        throw new Error(
          `Comment ${index} has highlight too short: ${comment.highlight.quotedText.length} characters (minimum 5)`
        );
      }

      if (comment.highlight.quotedText.length > 1000) {
        throw new Error(
          `Comment ${index} has highlight too long: ${comment.highlight.quotedText.length} characters (maximum 1000)`
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
  }

  console.log(`✅ Validated ${validComments.length} comments successfully`);
  return validComments;
}
