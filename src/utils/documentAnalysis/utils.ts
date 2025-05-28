import { mkdir, writeFile } from "fs/promises";
import path from "path";

import type { Comment } from "../../types/documentSchema";
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
        isValid: true,
      },
    });
  }

  return processedComments;
}
