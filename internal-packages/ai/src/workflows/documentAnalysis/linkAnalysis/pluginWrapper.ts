/**
 * Plugin-based implementation of link analysis workflow
 * This replaces the old implementation with the new plugin architecture
 */

import type { Agent, Document, Comment } from "@roast/ai";
import type { TaskResult } from "../shared/types";
import { LinkAnalysisPlugin } from "../../../analysis-plugins/plugins/link-analysis";
import { TextChunk } from "../../../analysis-plugins/TextChunk";
import { generateMarkdownPrepend } from "@roast/domain";

/**
 * Complete link analysis workflow that produces thinking, analysis, summary, and highlights
 * using the plugin architecture
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
  const startTime = Date.now();
  
  // Get the full content with prepend for URL extraction
  const prepend = generateMarkdownPrepend({
    title: document.title,
    author: document.author,
    platforms: document.platforms,
    publishedDate: document.publishedDate
  });
  const fullContent = prepend + document.content;
  
  // Create the plugin
  const plugin = new LinkAnalysisPlugin();
  
  // Create a single chunk with the full document (link analysis doesn't need chunking)
  const chunks = [
    new TextChunk(
      "full-doc",
      fullContent,
      {
        position: {
          start: 0,
          end: fullContent.length
        }
      }
    )
  ];
  
  // Run the analysis
  const result = await plugin.analyze(chunks, fullContent, {
    title: document.title,
    author: document.author,
    platforms: document.platforms,
    publishedDate: document.publishedDate
  });
  
  // Get the thinking document from the plugin's analysis
  const thinking = result.analysis || "# Link Analysis Report\n\nNo links found in the document.";
  
  // Adjust comment offsets if prepend was added
  const needsOffsetAdjustment = prepend.length > 0 && !document.content.startsWith(prepend);
  
  const adjustedComments = needsOffsetAdjustment 
    ? result.comments
        .filter(comment => comment.highlight) // Only keep comments with valid highlight data
        .map(comment => ({
          ...comment,
          highlight: comment.highlight ? {
            ...comment.highlight,
            startOffset: comment.highlight.startOffset - prepend.length,
            endOffset: comment.highlight.endOffset - prepend.length
          } : undefined
        }))
    : result.comments.filter(comment => comment.highlight);
  
  const endTime = Date.now();
  const timeInSeconds = Math.round((endTime - startTime) / 1000);
  
  const task: TaskResult = {
    name: "generateLinkAnalysis",
    modelName: "none",
    priceInDollars: result.cost,
    timeInSeconds,
    log: JSON.stringify({
      message: `Validated ${result.comments.length} URLs using link analysis plugin`,
      commentsGenerated: result.comments.length,
    }, null, 2),
  };
  
  return {
    thinking,
    analysis: result.analysis,
    summary: result.summary,
    grade: result.grade,
    selfCritique: undefined, // Link analysis doesn't generate selfCritique
    highlights: adjustedComments as Comment[],
    tasks: [task],
  };
}

/**
 * Generate link analysis results for compatibility with existing code
 * This is a thin wrapper around the plugin
 */
export async function generateLinkAnalysis(
  document: Document,
  agentInfo: Agent
): Promise<{ 
  task: TaskResult; 
  outputs: { thinking: string }; 
  linkAnalysisResults: any[] 
}> {
  const startTime = Date.now();
  
  // Get the full content with prepend
  const prepend = generateMarkdownPrepend({
    title: document.title,
    author: document.author,
    platforms: document.platforms,
    publishedDate: document.publishedDate
  });
  const fullContent = prepend + document.content;
  
  // Create and run the plugin
  const plugin = new LinkAnalysisPlugin();
  const chunks = [
    new TextChunk(
      "full-doc",
      fullContent,
      {
        position: {
          start: 0,
          end: fullContent.length
        }
      }
    )
  ];
  
  await plugin.analyze(chunks, fullContent, {
    title: document.title,
    author: document.author,
    platforms: document.platforms,
    publishedDate: document.publishedDate
  });
  
  // Get the link analysis results from the plugin's debug info
  const debugInfo = plugin.getDebugInfo();
  const linkAnalysisResults = (debugInfo.linkAnalysisResults as any[]) || [];
  
  const endTime = Date.now();
  const timeInSeconds = Math.round((endTime - startTime) / 1000);
  
  return {
    task: {
      name: "generateLinkAnalysis",
      modelName: "none",
      priceInDollars: plugin.getCost(),
      timeInSeconds,
      log: JSON.stringify({
        message: `Validated ${linkAnalysisResults.length} URLs using link analysis plugin`,
      }, null, 2),
    },
    outputs: {
      thinking: plugin.getResults().analysis || "# Link Analysis Report\n\nNo analysis performed.",
    },
    linkAnalysisResults,
  };
}