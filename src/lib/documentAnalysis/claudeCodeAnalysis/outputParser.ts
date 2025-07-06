import type { SDKMessage } from "@anthropic-ai/claude-code";
import type { Comment } from "../../../types/documentSchema";
import { logger } from "@/lib/logger";

interface ParsedOutput {
  analysis: string;
  summary: string;
  grade?: number;
  comments: Comment[];
}

export function parseSDKMessages(messages: SDKMessage[]): ParsedOutput {
  // Log message structure for debugging
  logger.info("Parsing SDK messages", {
    count: messages.length,
    types: messages.map(m => m.type),
  });

  // Collect all assistant messages - check different possible content locations
  const assistantMessages = messages
    .filter(msg => msg.type === "assistant")
    .map(msg => {
      const anyMsg = msg as any;
      
      // Claude Code SDK structure: message.message.content
      if (anyMsg.message?.content) {
        const content = anyMsg.message.content;
        // If content is an array (like Anthropic's format), extract text
        if (Array.isArray(content)) {
          return content
            .filter(block => block.type === "text")
            .map(block => block.text)
            .join("\n");
        }
        return content;
      }
      
      // Fallback to other possible locations
      const content = anyMsg.content || anyMsg.text || "";
      
      // If content is an array, extract text
      if (Array.isArray(content)) {
        return content
          .filter(block => block.type === "text")
          .map(block => block.text)
          .join("\n");
      }
      
      return content;
    })
    .filter(content => content.length > 0);

  if (assistantMessages.length === 0) {
    logger.warn("No assistant messages found in conversation", {
      messageStructure: messages.slice(0, 2).map(m => ({
        type: m.type,
        keys: Object.keys(m),
      }))
    });
    return {
      analysis: "",
      summary: "",
      comments: [],
    };
  }

  // The last message typically contains the most complete analysis
  const fullContent = assistantMessages.join("\n\n");
  const lastMessage = assistantMessages[assistantMessages.length - 1];

  // Parse the content to extract different sections
  const parsed = parseAnalysisContent(fullContent, lastMessage);

  return parsed;
}

export function parseAgentOutput(messages: any[]): ParsedOutput {
  // Legacy function for compatibility
  return parseSDKMessages(messages);
}

function parseAnalysisContent(fullContent: string, lastMessage: string): ParsedOutput {
  const result: ParsedOutput = {
    analysis: fullContent, // Use full conversation as analysis
    summary: "",
    comments: [],
  };

  // Extract summary (looking for summary section in the last message)
  const summaryMatch = lastMessage.match(/summary[:\s]*\n([\s\S]*?)(?=\n\n|\n#{1,3}|$)/i);
  if (summaryMatch) {
    result.summary = summaryMatch[1].trim();
  }

  // Extract grade from anywhere in the conversation
  const gradeMatch = fullContent.match(/grade[:\s]*(\d+)/i);
  if (gradeMatch) {
    result.grade = parseInt(gradeMatch[1], 10);
  }

  // Extract comments from the full conversation
  const comments = extractComments(fullContent);
  result.comments = comments;

  // If no summary was explicitly found, create one from the last message
  if (!result.summary && lastMessage.length > 0) {
    const firstParagraph = lastMessage.split("\n\n")[0];
    result.summary = firstParagraph.substring(0, 300) + (firstParagraph.length > 300 ? "..." : "");
  }

  return result;
}

function extractComments(content: string): Comment[] {
  const comments: Comment[] = [];
  
  // Look for patterns like:
  // - "Quote" (line X)
  // - > Quote
  // - Line X: "Quote"
  // - Comment: "Quote" - feedback
  const commentPatterns = [
    /[""]([^""]+)[""].*?(?:line|l\.)\s*(\d+)/gi,
    /(?:line|l\.)\s*(\d+).*?[""]([^""]+)[""]/gi,
    />\s*(.+?)(?:\n|$).*?(?:line|l\.)\s*(\d+)/gi,
    /comment\s*\d*[:\s]+[""]([^""]+)[""].*?(?:line|l\.)\s*(\d+)/gi,
  ];

  const foundQuotes = new Set<string>();

  for (const pattern of commentPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const quote = match[1] || match[2];
      const lineStr = match[2] || match[1];
      const lineNum = parseInt(lineStr, 10);

      if (!isNaN(lineNum) && quote && !foundQuotes.has(quote)) {
        foundQuotes.add(quote);
        
        // Find the context around this quote
        const quoteIndex = content.indexOf(quote);
        const contextStart = Math.max(0, content.lastIndexOf("\n", quoteIndex - 100));
        const contextEnd = Math.min(content.length, content.indexOf("\n", quoteIndex + quote.length + 100));
        const context = content.substring(contextStart, contextEnd).trim();

        // Extract just the feedback part if possible
        const feedbackMatch = context.match(/(?:comment|feedback|issue|note)[^:]*:\s*(.+)/i);
        const comment = feedbackMatch ? feedbackMatch[1].trim() : context;

        comments.push({
          description: comment,
          highlight: {
            startOffset: 0, // These would need to be calculated from line numbers
            endOffset: quote.length,
            quotedText: quote.trim(),
            isValid: true,
            prefix: `Line ${lineNum}: `,
          },
          isValid: true,
          importance: 5, // Default medium importance
        });
      }
    }
  }

  // Also look for structured comment sections
  const structuredCommentRegex = /(?:comment|feedback|issue)\s*\d*[:\s]+[\s\S]*?(?=\n(?:comment|feedback|issue)|$)/gi;
  let structuredMatch;
  while ((structuredMatch = structuredCommentRegex.exec(content)) !== null) {
    const commentText = structuredMatch[0];
    const quoteMatch = commentText.match(/[""]([^""]+)[""]/);
    const lineMatch = commentText.match(/(?:line|l\.)\s*(\d+)/i);
    
    if (quoteMatch && lineMatch && !foundQuotes.has(quoteMatch[1])) {
      foundQuotes.add(quoteMatch[1]);
      const feedbackMatch = commentText.match(/(?:comment|feedback|issue)[^:]*:\s*(.+)/i);
      const comment = feedbackMatch ? feedbackMatch[1].trim() : commentText.trim();
      
      comments.push({
        description: comment,
        highlight: {
          startOffset: 0, // These would need to be calculated from line numbers
          endOffset: quoteMatch[1].length,
          quotedText: quoteMatch[1].trim(),
          isValid: true,
          prefix: `Line ${lineMatch[1]}: `,
        },
        isValid: true,
        importance: 5, // Default medium importance
      });
    }
  }

  return comments.slice(0, 10); // Limit to 10 comments
}

export function parseIterativeOutput(content: string): ParsedOutput {
  const result: ParsedOutput = {
    analysis: "",
    summary: "",
    comments: [],
  };

  // Extract summary section
  const summaryMatch = content.match(/## Summary\s*\n([\s\S]*?)(?=\n##|$)/i);
  if (summaryMatch) {
    result.summary = summaryMatch[1].trim().replace(/\[To be completed\]/g, "");
  }

  // Extract grade
  const gradeMatch = content.match(/## Grade\s*\n.*?(\d+)/i);
  if (gradeMatch) {
    result.grade = parseInt(gradeMatch[1], 10);
  }

  // Extract main analysis section
  const analysisMatch = content.match(/## Main Analysis\s*\n([\s\S]*?)(?=\n##|$)/i);
  if (analysisMatch) {
    result.analysis = analysisMatch[1].trim().replace(/\[To be completed\]/g, "");
  }

  // Extract comments section
  const commentsMatch = content.match(/## Comments\s*\n([\s\S]*?)(?=\n---|$)/i);
  if (commentsMatch) {
    const commentsText = commentsMatch[1];
    result.comments = extractComments(commentsText);
  }

  // If analysis is empty, use the full content
  if (!result.analysis) {
    result.analysis = content;
  }

  return result;
}