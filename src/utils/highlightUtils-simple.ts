// Simple position-based highlighting approach
// Split document into chunks with position markers, let LLM pick positions directly

import type { Comment } from "../types/documentSchema";

interface PositionHighlight {
  startPosition: number;
  endPosition: number;
}

interface PositionComment {
  title: string;
  description: string;
  importance: number;
  grade: number;
  highlight: PositionHighlight;
}

/**
 * Simple and elegant approach: Let the LLM pick character positions directly
 * by showing them a document with position markers every 100 characters
 */
export class SimplePositionHighlighter {
  private originalContent: string;
  private markedContent: string;
  private positionMap: number[] = [];

  constructor(content: string) {
    this.originalContent = content;
    this.markedContent = this.addPositionMarkers(content);
  }

  private addPositionMarkers(content: string): string {
    const chunkSize = 100;
    const chunks: string[] = [];
    this.positionMap = [];

    for (let i = 0; i < content.length; i += chunkSize) {
      const chunk = content.slice(i, i + chunkSize);
      chunks.push(`${i} | ${chunk}`);
      this.positionMap.push(i);
    }

    return chunks.join("\n");
  }

  getMarkedContent(): string {
    return this.markedContent;
  }

  /**
   * Convert LLM-provided positions back to actual highlights
   */
  createHighlight(
    startPosition: number,
    endPosition: number
  ): { startOffset: number; endOffset: number; text: string } | null {
    // Validate positions
    if (startPosition < 0 || endPosition < 0 || startPosition >= endPosition) {
      console.warn(
        `Invalid positions: start=${startPosition}, end=${endPosition}`
      );
      return null;
    }

    if (endPosition > this.originalContent.length) {
      console.warn(
        `End position ${endPosition} exceeds content length ${this.originalContent.length}`
      );
      return null;
    }

    const text = this.originalContent.slice(startPosition, endPosition);

    return {
      startOffset: startPosition,
      endOffset: endPosition,
      text,
    };
  }

  /**
   * Process comments with position-based highlights
   */
  processPositionComments(comments: PositionComment[]): Comment[] {
    return comments.map((comment) => {
      const highlight = this.createHighlight(
        comment.highlight.startPosition,
        comment.highlight.endPosition
      );

      if (!highlight) {
        // Return invalid comment if highlight creation failed
        return {
          title: comment.title,
          description: comment.description,
          importance: comment.importance,
          grade: comment.grade,
          isValid: false,
          highlight: {
            startOffset: -1,
            endOffset: -1,
            quotedText: "",
            isValid: false,
          },
        };
      }

      return {
        title: comment.title,
        description: comment.description,
        importance: comment.importance,
        grade: comment.grade,
        isValid: true,
        highlight: {
          startOffset: highlight.startOffset,
          endOffset: highlight.endOffset,
          quotedText: highlight.text,
          isValid: true,
        },
      };
    });
  }
}

/**
 * Generate the prompt for the LLM with position markers
 */
export function getPositionBasedPrompt(
  content: string,
  targetComments: number
): string {
  const highlighter = new SimplePositionHighlighter(content);
  const markedContent = highlighter.getMarkedContent();

  return `You are an expert document analyst. Analyze the following document and provide ${targetComments} insightful comments.

The document is shown with position markers every 100 characters (format: "position | text").
For each comment, specify the exact START and END character positions for highlighting.

DOCUMENT WITH POSITION MARKERS:
${markedContent}

Please provide your response in this JSON format:
{
  "comments": [
    {
      "title": "Comment title with optional emojis",
      "description": "Detailed description with Markdown formatting",
      "importance": 75,
      "grade": 85,
      "highlight": {
        "startPosition": 0,
        "endPosition": 150
      }
    }
  ]
}

IMPORTANT RULES:
1. Use the exact character positions shown in the markers
2. Make sure startPosition < endPosition
3. Keep highlights between 50-300 characters for readability
4. Choose positions that capture complete sentences or logical phrases
5. Importance: 0-100 (average around 50)
6. Grade: 0-100 (positive feedback = higher grades)`;
}

/**
 * Example usage function
 */
export async function generatePositionBasedComments(
  content: string,
  targetComments: number = 5
): Promise<Comment[]> {
  const highlighter = new SimplePositionHighlighter(content);
  const prompt = getPositionBasedPrompt(content, targetComments);

  // This would be called with your LLM
  console.log("Prompt to send to LLM:");
  console.log(prompt);

  // Mock response for demonstration
  const mockLLMResponse: { comments: PositionComment[] } = {
    comments: [
      {
        title: "🎯 Engaging Opening",
        description:
          "The opening immediately captures attention with a personal anecdote that sets up an unexpected story.",
        importance: 80,
        grade: 85,
        highlight: {
          startPosition: 0,
          endPosition: 120,
        },
      },
    ],
  };

  return highlighter.processPositionComments(mockLLMResponse.comments);
}
