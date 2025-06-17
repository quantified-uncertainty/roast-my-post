import type { Document } from "../../../types/documents";
import type { Comment } from "../../../types/documentSchema";
import { LineBasedHighlighter, type LineBasedComment } from "./lineBasedHighlighter";

/**
 * Converts comments with offset-based highlights to line-based format
 * Used to prepare existing comments for the LLM prompt
 */
export function convertCommentsToLineBased(
  comments: Comment[],
  document: Document
): LineBasedComment[] {
  const highlighter = new LineBasedHighlighter(document.content);
  
  return comments.map((comment) => ({
    title: comment.title,
    description: comment.description,
    highlight: highlighter.convertOffsetToLineBased({
      startOffset: comment.highlight.startOffset,
      endOffset: comment.highlight.endOffset,
      quotedText: comment.highlight.quotedText,
    }),
    importance: comment.importance ?? 50,
    grade: comment.grade,
  }));
}

