import type { DocumentReview } from "../../types/documentReview";
import { sortCommentsByOffset } from "../commentUtils";

export async function polishReview(
  review: DocumentReview,
  documentContent: string
): Promise<DocumentReview> {
  // Deep clone the review
  const polishedReview = JSON.parse(JSON.stringify(review)) as DocumentReview;
  
  // Process comments
  if (polishedReview.comments) {
    // Sort comments by startOffset
    polishedReview.comments = sortCommentsByOffset(polishedReview.comments);
    
    // Process each comment
    polishedReview.comments = polishedReview.comments.map(comment => {
      // Verify highlight text
      if (comment.highlight) {
        // Ensure highlight matches document content
        const highlightText = documentContent.substring(
          comment.highlight.startOffset,
          comment.highlight.endOffset
        );
        
        // If highlight text doesn't match, update it
        if (highlightText !== comment.highlight.quotedText) {
          comment.highlight.quotedText = highlightText;
        }
        
        // Add a prefix to help with context (up to 30 chars before highlight)
        if (!comment.highlight.prefix) {
          const prefixStart = Math.max(0, comment.highlight.startOffset - 30);
          comment.highlight.prefix = documentContent.substring(
            prefixStart, 
            comment.highlight.startOffset
          );
        }
      }
      
      return comment;
    });
  }
  
  return polishedReview;
}