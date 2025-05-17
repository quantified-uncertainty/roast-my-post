import { mkdir, writeFile } from "fs/promises";
import path from "path";

import type { Comment } from "../../types/oldDocumentReview";
import type { RawLLMHighlight } from "../highlightUtils";

export async function writeLogFile(content: string, filename: string) {
  const logsDir = path.join(process.cwd(), "logs");
  try {
    await mkdir(logsDir, { recursive: true });
    await writeFile(path.join(logsDir, filename), content, "utf-8");
    console.log(`📝 Log written to ${filename}`);
  } catch (err) {
    console.error("❌ Error writing log file:", err);
  }
}

export function calculateTargetWordCount(content: string): number {
  const baseWords = 50;
  const contentLength = content.length;
  // More aggressive logarithmic scaling
  // 500 chars -> ~50 words
  // 1000 chars -> ~100 words
  // 10000 chars -> ~200 words
  const additionalWords = Math.log10(contentLength / 500) * 100;
  return Math.round(baseWords + Math.max(0, additionalWords));
}

export function calculateTargetComments(content: string): number {
  const baseComments = 3;
  const contentLength = content.length;
  // Roughly 1 comment per 1000 characters
  const additionalComments = Math.floor(contentLength / 1000);
  return Math.max(baseComments, Math.min(additionalComments, 10)); // Cap at 10 comments
}

export async function processRawComments(
  document: string,
  comments: Array<Omit<Comment, "highlight"> & { highlight: RawLLMHighlight }>
): Promise<Comment[]> {
  const processedComments: Comment[] = [];
  const usedRanges: Array<{ start: number; end: number }> = [];

  for (const comment of comments) {
    const startOffset = document.indexOf(comment.highlight.start);
    const endOffset =
      document.indexOf(comment.highlight.end) + comment.highlight.end.length;

    // Validate highlight length (max 1000 characters)
    const highlightLength = endOffset - startOffset;
    if (highlightLength > 1000) {
      console.warn(
        `⚠️ Highlight too long (${highlightLength} chars) for comment: ${comment.title}`
      );
      continue;
    }

    // Check for overlap with existing comments
    const hasOverlap = usedRanges.some(
      (range) =>
        (startOffset >= range.start && startOffset <= range.end) ||
        (endOffset >= range.start && endOffset <= range.end)
    );

    if (hasOverlap) {
      console.warn(
        `⚠️ Highlight overlaps with previous comment: ${comment.title}`
      );
      continue;
    }

    usedRanges.push({ start: startOffset, end: endOffset });

    processedComments.push({
      ...comment,
      highlight: {
        startOffset,
        endOffset,
        quotedText: document.substring(startOffset, endOffset),
      },
      isValid: true,
    });
  }

  return processedComments;
}
