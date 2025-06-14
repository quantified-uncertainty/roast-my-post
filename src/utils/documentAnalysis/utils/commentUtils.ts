import type { Comment } from "../../../types/documentSchema";
import type { RawLLMHighlight } from "../../highlightUtils";
import {
  processRawComments as processRawCommentsFromHighlightUtils,
} from "../../highlightUtils";

// Re-export the more thorough implementation but wrap it to preserve logging
async function processRawComments(
  document: string,
  comments: Array<Omit<Comment, "highlight"> & { highlight: RawLLMHighlight }>
): Promise<Comment[]> {
  console.log("Processing raw comments with enhanced implementation");
  const processed = await processRawCommentsFromHighlightUtils(
    document,
    comments
  );
  console.log(`Processed ${processed.length} comments`);
  return processed;
}

export async function validateComments(
  comments: any[],
  content: string
): Promise<Comment[]> {
  if (!Array.isArray(comments)) {
    throw new Error("Comments must be an array");
  }

  console.log("Starting comment validation");
  const rawComments = comments.map((comment, index) => {
    if (!comment.title || typeof comment.title !== "string") {
      throw new Error(`Comment ${index} missing or invalid title`);
    }
    if (!comment.description || typeof comment.description !== "string") {
      throw new Error(`Comment ${index} missing or invalid description`);
    }
    if (!comment.highlight || typeof comment.highlight !== "object") {
      throw new Error(`Comment ${index} missing or invalid highlight`);
    }
    if (
      !comment.highlight.start ||
      typeof comment.highlight.start !== "string"
    ) {
      throw new Error(`Comment ${index} missing or invalid highlight start`);
    }
    if (!comment.highlight.end || typeof comment.highlight.end !== "string") {
      throw new Error(`Comment ${index} missing or invalid highlight end`);
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
      highlight: comment.highlight as RawLLMHighlight,
      importance: comment.importance,
      grade: comment.grade,
      isValid: true,
    };
  });

  console.log("Raw comments validated, processing highlights");
  const processed = await processRawComments(content, rawComments);

  // Check for invalid highlight offsets and throw if found
  processed.forEach((comment, index) => {
    console.log(`Validating highlight for comment ${index}: ${comment.title}`);
    if (!comment.highlight) {
      throw new Error(`Comment ${index} is missing highlight data`);
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
    if (
      comment.highlight.quotedText.length < 10 ||
      comment.highlight.quotedText.length > 200
    ) {
      throw new Error(
        `Comment ${index} has invalid highlight length: ${comment.highlight.quotedText.length} characters (must be between 10-200)`
      );
    }
  });
  console.log("All highlights validated successfully");
  return processed;
}
