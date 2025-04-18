import type { Comment } from "../../../types/documentReview";
import type { RawLLMHighlight } from "../../highlightUtils";
import { processRawComments } from "../../highlightUtils";

export async function validateComments(
  comments: any[],
  content: string
): Promise<Comment[]> {
  if (!Array.isArray(comments)) {
    throw new Error("Comments must be an array");
  }

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

    return {
      title: comment.title,
      description: comment.description,
      highlight: comment.highlight as RawLLMHighlight,
      importance: comment.importance,
      isValid: true,
    };
  });

  return processRawComments(content, rawComments);
}
