import type { Agent } from "@roast/ai";
import type { Document } from "@roast/ai";
import type { Comment } from "@roast/ai";
import { 
  linkValidator,
  generateLinkHighlights,
  generateLinkAnalysisAndSummary
} from "@roast/ai/server";
import type { TaskResult } from "../shared/types";
import { generateLinkAnalysis } from "./";
import { generateMarkdownPrepend } from "@/utils/documentMetadata";

/**
 * Complete link analysis workflow that produces thinking, analysis, summary, and highlights
 * without additional LLM calls after the initial link analysis step
 */
export async function analyzeLinkDocument(
  document: Document,
  agentInfo: Agent,
  targetHighlights: number = 5
): Promise<{
  thinking: string;
  analysis: string;
  summary: string;
  grade?: number;
  selfCritique?: string;
  highlights: Comment[];
  tasks: TaskResult[];
}> {
  const tasks: TaskResult[] = [];

  // Step 1: Generate link analysis (this includes the thinking output)
  const linkAnalysisResult = await generateLinkAnalysis(
    document,
    agentInfo
  );
  tasks.push(linkAnalysisResult.task);

  // Step 2: Generate analysis and summary from link data (no LLM needed)
  const { analysis, summary, grade } = generateLinkAnalysisAndSummary(
    linkAnalysisResult.linkAnalysisResults,
    document.title
  );

  // Step 3: Generate highlights from link issues (no LLM needed)
  // Get the full content with prepend for URL extraction
  const prepend = generateMarkdownPrepend({
    title: document.title,
    author: document.author,
    platforms: document.platforms,
    publishedDate: document.publishedDate
  });
  const fullContent = prepend + document.content;
  
  // Use the link-validator tool to get URLs
  const toolResult = await linkValidator.run({
    text: fullContent,
    maxUrls: targetHighlights * 4, // Get more URLs than highlights needed
  }, {
    logger: console, // Use console as logger
  });
  const urls = toolResult.urls;
  
  const highlights = generateLinkHighlights(
    linkAnalysisResult.linkAnalysisResults,
    urls,
    fullContent, // Pass the full content for correct position finding
    targetHighlights
  );
  
  // Only adjust highlight offsets if the document content doesn't already include prepend
  // Check if document.content starts with the same content as fullContent (indicating prepend is already included)
  const needsOffsetAdjustment = prepend.length > 0 && !document.content.startsWith(prepend);
  
  const adjustedHighlights = needsOffsetAdjustment ? highlights.map(highlight => ({
    ...highlight,
    highlight: highlight.highlight ? {
      ...highlight.highlight,
      startOffset: highlight.highlight.startOffset - prepend.length,
      endOffset: highlight.highlight.endOffset - prepend.length
    } : undefined
  })) : highlights;

  return {
    thinking: linkAnalysisResult.outputs.thinking,
    analysis,
    summary,
    grade,
    selfCritique: undefined, // Link analysis doesn't generate selfCritique
    highlights: adjustedHighlights,
    tasks,
  };
}