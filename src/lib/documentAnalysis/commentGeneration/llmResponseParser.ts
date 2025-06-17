import type { 
  AnthropicResponse, 
  CommentToolResponse, 
  RawLLMComment 
} from "./types";

/**
 * Parses the Anthropic API response to extract comments
 */
export function parseAnthropicResponse(response: AnthropicResponse): CommentToolResponse {
  const toolUse = response.content.find((c) => c.type === "tool_use");
  
  if (!toolUse || toolUse.name !== "provide_comments") {
    throw new Error("No tool use response from Anthropic for comments");
  }

  const result = toolUse.input as CommentToolResponse;
  
  // Validate basic structure
  if (!result.comments || !Array.isArray(result.comments)) {
    throw new Error("Anthropic response missing or invalid 'comments' field");
  }

  // Validate each comment
  result.comments.forEach((comment, index) => {
    validateCommentStructure(comment, index);
  });

  // Fix formatting issues from JSON tool use
  result.comments = result.comments.map(fixCommentFormatting);

  return result;
}

/**
 * Validates that a comment has all required fields
 */
function validateCommentStructure(comment: any, index: number): void {
  if (!comment.title || comment.title.trim().length === 0) {
    throw new Error(`Comment ${index + 1} missing or empty 'title' field`);
  }
  
  if (!comment.description || comment.description.trim().length === 0) {
    throw new Error(`Comment ${index + 1} missing or empty 'description' field`);
  }
  
  if (
    !comment.highlight ||
    typeof comment.highlight.startLineIndex !== 'number' ||
    typeof comment.highlight.endLineIndex !== 'number' ||
    !comment.highlight.startCharacters ||
    !comment.highlight.endCharacters
  ) {
    throw new Error(`Comment ${index + 1} missing or invalid 'highlight' field`);
  }
}

/**
 * Fixes formatting issues from JSON tool use
 */
function fixCommentFormatting(comment: RawLLMComment): RawLLMComment {
  const fixFormatting = (text: string): string => {
    return text
      .replace(/\\n/g, "\n")     // Convert escaped newlines
      .replace(/\\"/g, '"')      // Convert escaped quotes
      .replace(/\\\\/g, "\\")    // Convert escaped backslashes
      .trim();
  };

  return {
    title: fixFormatting(comment.title),
    description: fixFormatting(comment.description),
    highlight: {
      startLineIndex: comment.highlight.startLineIndex,
      startCharacters: fixFormatting(comment.highlight.startCharacters),
      endLineIndex: comment.highlight.endLineIndex,
      endCharacters: fixFormatting(comment.highlight.endCharacters),
    },
    importance: comment.importance,
    grade: comment.grade,
  };
}