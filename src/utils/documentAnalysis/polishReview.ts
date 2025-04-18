import { ANALYSIS_MODEL, openai } from "@/types/openai";

//TODO: This is not functional yet.
import type { DocumentReview } from "../types/documentReview";
import { analyzeDocument } from "./documentAnalysis";

interface StyleGuideViolation {
  type: "title" | "description" | "grade" | "importance" | "highlight" | "json";
  message: string;
  commentIndex?: number;
}

export async function polishReviewWithStyleGuide(
  review: DocumentReview,
  documentContent: string
): Promise<{
  polishedReview: DocumentReview;
  violations: StyleGuideViolation[];
}> {
  const violations: StyleGuideViolation[] = [];
  const polishedReview = JSON.parse(JSON.stringify(review)) as DocumentReview;

  // Helper function to check if a string is entirely bold
  const isEntirelyBold = (text: string): boolean => {
    return (
      text.startsWith("**") &&
      text.endsWith("**") &&
      text.split("**").length === 3
    );
  };

  // Helper function to validate markdown usage
  const validateMarkdown = (text: string): boolean => {
    // Check for proper markdown formatting
    const hasProperBold = text.includes("**") && !isEntirelyBold(text);
    const hasProperItalics =
      text.includes("*") && !text.startsWith("*") && !text.endsWith("*");
    return hasProperBold || hasProperItalics;
  };

  // Helper function to validate highlight length
  const validateHighlight = (
    startOffset: number,
    endOffset: number
  ): boolean => {
    const highlightLength = endOffset - startOffset;
    return highlightLength > 0 && highlightLength <= 500; // Max 500 characters
  };

  // Process each comment
  polishedReview.comments.forEach((comment, index) => {
    // Check title formatting
    if (isEntirelyBold(comment.title)) {
      violations.push({
        type: "title",
        message:
          "Title should not be entirely bold. Use bold selectively for emphasis.",
        commentIndex: index,
      });
    }

    // Check markdown usage in description
    if (!validateMarkdown(comment.description)) {
      violations.push({
        type: "description",
        message:
          "Description should make better use of markdown formatting for emphasis and structure.",
        commentIndex: index,
      });
    }

    // Check highlight validity
    if (
      !validateHighlight(
        comment.highlight.startOffset,
        comment.highlight.endOffset
      )
    ) {
      violations.push({
        type: "highlight",
        message: "Highlight is either empty or too long (max 500 characters).",
        commentIndex: index,
      });
    }

    // Check if highlight text matches document content
    const highlightText = documentContent.substring(
      comment.highlight.startOffset,
      comment.highlight.endOffset
    );
    if (highlightText !== comment.highlight.quotedText) {
      violations.push({
        type: "highlight",
        message: "Highlight text does not match document content.",
        commentIndex: index,
      });
    }
  });

  // Validate JSON structure
  try {
    JSON.stringify(polishedReview);
  } catch (error) {
    violations.push({
      type: "json",
      message: "Review contains invalid JSON structure.",
    });
  }

  return {
    polishedReview,
    violations,
  };
}

export async function polishReviewWithLLM(
  review: DocumentReview,
  documentContent: string,
  agentInfo: any
): Promise<DocumentReview> {
  // Reuse the exact same prompt from analyzeDocument
  const { finalPrompt } = await analyzeDocument(
    { content: documentContent },
    agentInfo.id
  );

  // Just change the task description at the top
  const polishPrompt = finalPrompt.replace(
    "# AGENT CONTEXT",
    `# POLISHING TASK
You are a professional editor reviewing an AI-generated document analysis. Your task is to polish and refine the review while maintaining its core insights. Focus on these specific improvements:

1. Title Formatting:
   - Remove bold from entire titles, only use for key terms
   - Ensure titles are concise and focused
   - Fix any markdown formatting issues

   Examples of good titles:
   - The Agency Problem in AI Development
   - Dangerous Analogy: AGI as *'Just Another Tool'*

   Examples of bad titles:
   - **The Agency Problem in AI Development** (entirely bold)
   - The Agency Problem in AI Development (no emphasis)
   - *The Agency Problem in AI Development* (entirely italic)
   - The Agency Problem in AI Development: A Critical Analysis of Current Trends and Future Implications (too long)

2. Description Enhancement:
   - Add more markdown formatting where appropriate
   - Improve use of bold or italics for key terms
   - Add relevant links to external sources and niche terminology
   - Use blockquotes for important references

3. Highlight Precision:
   - Verify highlights match document content exactly. Sometimes, highlights can be much longer than necessary.
   - Ensure highlights are focused (max 500 chars)

4. Scoring Consistency:
   - Verify importance scores align with descriptions
   - Check grade scores make sense for the content
   - Ensure scores follow the guidelines

5. JSON Structure:
   - Fix any JSON formatting issues
   - Ensure all required fields are present
   - Verify proper escaping of quotes and newlines

Here is the review to polish:
${JSON.stringify(review, null, 2)}

# AGENT CONTEXT`
  );

  const completion = await openai.chat.completions.create({
    model: ANALYSIS_MODEL,
    messages: [{ role: "user", content: polishPrompt }],
    temperature: 0.3, // Lower temperature for more consistent editing
  });

  if (!completion.choices?.[0]?.message?.content) {
    throw new Error("LLM response contained no content");
  }

  try {
    const polishedReview = JSON.parse(completion.choices[0].message.content);
    console.log("Polished review:", JSON.stringify(polishedReview, null, 2));
    return polishedReview;
  } catch (error) {
    console.error("Failed to parse polished review:", error);
    throw new Error("Failed to parse polished review from LLM response");
  }
}
