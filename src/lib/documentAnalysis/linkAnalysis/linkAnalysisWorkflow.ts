import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";
import type { Comment } from "../../../types/documentSchema";
import { type LinkAnalysis } from "../../urlValidator";
import type { TaskResult } from "../shared/types";
import { generateLinkAnalysis } from "./index";
import { extractUrls } from "./urlExtractor";
import { getDocumentFullContent } from "../../../utils/documentContentHelpers";

/**
 * Truncate URL for display while keeping it clickable
 */
function formatUrlForDisplay(url: string, maxLength: number = 60): string {
  if (url.length <= maxLength) {
    return url;
  }
  
  // Try to keep the domain and some path
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const path = urlObj.pathname + urlObj.search;
    
    if (domain.length + 10 >= maxLength) {
      // Domain itself is too long, just truncate the whole URL
      return url.substring(0, maxLength - 3) + "...";
    }
    
    // Calculate how much path we can show
    const remainingLength = maxLength - domain.length - 10; // 10 for "https://" + "..."
    const truncatedPath = path.length > remainingLength 
      ? path.substring(0, remainingLength) + "..."
      : path;
    
    return `${urlObj.protocol}//${domain}${truncatedPath}`;
  } catch {
    // If URL parsing fails, just truncate normally
    return url.substring(0, maxLength - 3) + "...";
  }
}

/**
 * Complete link analysis workflow that produces thinking, analysis, summary, and comments
 * without additional LLM calls after the initial link analysis step
 */
export async function analyzeLinkDocument(
  document: Document,
  agentInfo: Agent,
  targetComments: number = 5
): Promise<{
  thinking: string;
  analysis: string;
  summary: string;
  grade?: number;
  selfCritique?: string;
  comments: Comment[];
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
    document,
    linkAnalysisResult.linkAnalysisResults
  );

  // Step 3: Generate comments from link issues (no LLM needed)
  // Get the full content with prepend for URL extraction
  const { content: fullContent } = getDocumentFullContent(document);
  const urls = extractUrls(fullContent);
  
  const comments = generateLinkComments(
    document,
    linkAnalysisResult.linkAnalysisResults,
    targetComments,
    urls,
    fullContent // Pass the full content for correct position finding
  );

  return {
    thinking: linkAnalysisResult.outputs.thinking,
    analysis,
    summary,
    grade,
    selfCritique: undefined, // Link analysis doesn't generate selfCritique
    comments,
    tasks,
  };
}

/**
 * Generates analysis and summary from link validation results without LLM
 */
function generateLinkAnalysisAndSummary(
  document: Document,
  linkAnalysisResults: LinkAnalysis[]
): { analysis: string; summary: string; grade: number } {
  // Calculate metrics from LinkAnalysis results
  const metrics = calculateLinkMetrics(linkAnalysisResults);

  const analysis = `## Link Quality Analysis

This document was analyzed specifically for link quality and accuracy. The analysis focused on identifying broken links, hallucinated URLs, and incorrectly cited sources.

### Overall Link Health
- **Total Links Found:** ${metrics.totalLinks}
- **Working Links:** ${metrics.workingLinks} (${metrics.totalLinks > 0 ? Math.round((metrics.workingLinks / metrics.totalLinks) * 100) : 0}%)
- **Broken Links:** ${metrics.brokenLinks}

### Key Findings

${
  metrics.brokenLinks > 0
    ? generateBrokenLinksMessage(metrics)
    : ""
}${
    metrics.workingLinks === metrics.totalLinks && metrics.totalLinks > 0
      ? `**✅ All Links Valid**
All links in the document are working and correctly cited. This demonstrates good research practices and attention to detail.

`
      : ""
  }### Document Reliability Score

Based on link analysis, this document has a **${calculateLinkGradeFromMetrics(metrics)}% reliability score** for external references.`;

  const summary =
    metrics.totalLinks === 0
      ? "No external links found in this document."
      : `Link analysis found ${metrics.workingLinks}/${metrics.totalLinks} working links${metrics.brokenLinks > 0 ? ` with ${metrics.brokenLinks} broken references` : ""}.`;

  return {
    analysis,
    summary,
    grade: calculateLinkGradeFromMetrics(metrics),
  };
}

/**
 * Generates comments from link analysis results without parsing reports
 */
function generateLinkComments(
  document: Document,
  linkAnalysisResults: LinkAnalysis[],
  targetComments: number,
  originalUrls: string[],
  fullContent: string
): Comment[] {
  const comments: Comment[] = [];

  // Create a map of URL to analysis result for faster lookup
  const linkResultMap = new Map<string, LinkAnalysis>();
  linkAnalysisResults.forEach((result) => {
    linkResultMap.set(result.url, result);
  });

  // Track positions we've already commented on to avoid duplicates
  const processedPositions = new Set<string>();

  // Process all URLs in the order they appear in the document
  for (const url of originalUrls) {
    const urlPosition = findUrlPosition(fullContent, url);

    if (urlPosition) {
      // Create a unique key for this position to prevent duplicates
      const positionKey = `${urlPosition.startOffset}-${urlPosition.endOffset}`;

      // Skip if we've already processed this exact position
      if (processedPositions.has(positionKey)) {
        continue;
      }

      const linkResult = linkResultMap.get(url);

      if (linkResult) {
        let grade: number;
        let importance: number;
        let description: string;

        if (linkResult.accessError) {
          // Handle different error types
          switch (linkResult.accessError.type) {
            case "NotFound":
              grade = 0;
              importance = 100;
              description = `❌ Broken link\n\n${formatUrlForDisplay(url)} - Page not found (HTTP 404)`;
              break;
            case "Forbidden":
              grade = 0;
              importance = 100;
              description = `🚫 Access denied\n\n${formatUrlForDisplay(url)} - Access forbidden (HTTP 403)`;
              break;
            case "Timeout":
              grade = 0;
              importance = 100;
              description = `⏱️ Link timeout\n\n${formatUrlForDisplay(url)} - Request timed out`;
              break;
            default:
              grade = 0;
              importance = 100;
              const errorMsg =
                "message" in linkResult.accessError
                  ? linkResult.accessError.message
                  : "Unknown error";
              description = `❌ Link error\n\n${formatUrlForDisplay(url)} - ${errorMsg}`;
          }
        } else {
          // URL is accessible - simple verification
          grade = 90;
          importance = 10;
          description = `✅ Link verified\n\n${formatUrlForDisplay(url)} - Server responded successfully (HTTP 200)`;
        }

        comments.push({
          description,
          highlight: urlPosition,
          importance,
          grade,
          isValid: true,
        });

        // Mark this position as processed
        processedPositions.add(positionKey);
      }
    }
  }

  // Sort comments by their position in the document to ensure top-to-bottom order
  comments.sort((a, b) => a.highlight.startOffset - b.highlight.startOffset);

  // Don't limit comments - generate one for each analyzed link
  return comments;
}




function calculateLinkMetrics(linkAnalysisResults: LinkAnalysis[]) {
  const totalLinks = linkAnalysisResults.length;
  let workingLinks = 0;
  let brokenLinks = 0;
  let accessDeniedLinks = 0;
  let notFoundLinks = 0;
  let timeoutLinks = 0;
  let networkErrorLinks = 0;
  let otherErrorLinks = 0;

  linkAnalysisResults.forEach((result) => {
    if (result.accessError) {
      brokenLinks++;
      switch (result.accessError.type) {
        case "Forbidden":
          accessDeniedLinks++;
          break;
        case "NotFound":
          notFoundLinks++;
          break;
        case "Timeout":
          timeoutLinks++;
          break;
        case "NetworkError":
          networkErrorLinks++;
          break;
        default:
          otherErrorLinks++;
      }
    } else {
      workingLinks++;
    }
  });

  return {
    totalLinks,
    workingLinks,
    brokenLinks,
    accessDeniedLinks,
    notFoundLinks,
    timeoutLinks,
    networkErrorLinks,
    otherErrorLinks,
  };
}

function generateBrokenLinksMessage(metrics: {
  brokenLinks: number;
  accessDeniedLinks: number;
  notFoundLinks: number;
  timeoutLinks: number;
  networkErrorLinks: number;
  otherErrorLinks: number;
}): string {
  let message = "";
  const issues: string[] = [];

  // Create specific messages based on error types
  if (metrics.accessDeniedLinks > 0) {
    issues.push(`${metrics.accessDeniedLinks} blocked by access restrictions (403 Forbidden)`);
  }
  if (metrics.notFoundLinks > 0) {
    issues.push(`${metrics.notFoundLinks} not found (404)`);
  }
  if (metrics.timeoutLinks > 0) {
    issues.push(`${metrics.timeoutLinks} timed out`);
  }
  if (metrics.networkErrorLinks > 0) {
    issues.push(`${metrics.networkErrorLinks} network connection failed`);
  }
  if (metrics.otherErrorLinks > 0) {
    issues.push(`${metrics.otherErrorLinks} other errors`);
  }

  // Choose appropriate header based on predominant issue type
  if (metrics.accessDeniedLinks > metrics.brokenLinks / 2) {
    message += `**🚫 Links Blocked by Access Restrictions**\n`;
    message += `Found ${metrics.brokenLinks} inaccessible URLs, primarily due to access restrictions. `;
    message += `Many websites block automated access, even though the content exists.\n\n`;
  } else if (metrics.notFoundLinks > metrics.brokenLinks / 2) {
    message += `**❌ Broken Links Detected**\n`;
    message += `Found ${metrics.brokenLinks} broken or non-existent URLs. These may be hallucinated links or references to content that has moved or been deleted.\n\n`;
  } else {
    message += `**⚠️ Link Issues Detected**\n`;
    message += `Found ${metrics.brokenLinks} problematic URLs with various access issues.\n\n`;
  }

  // Add breakdown of issue types
  message += `**Issue breakdown:** ${issues.join(", ")}\n\n`;

  return message;
}

function calculateLinkGradeFromMetrics(metrics: {
  totalLinks: number;
  workingLinks: number;
  brokenLinks: number;
  accessDeniedLinks?: number;
  notFoundLinks?: number;
  timeoutLinks?: number;
  networkErrorLinks?: number;
  otherErrorLinks?: number;
}): number {
  if (metrics.totalLinks === 0) return 80; // No links is neutral

  const workingRatio = metrics.workingLinks / metrics.totalLinks;
  const brokenPenalty = (metrics.brokenLinks / metrics.totalLinks) * 40; // Heavy penalty for broken links

  const baseScore = workingRatio * 100;
  const finalScore = Math.max(
    0,
    Math.min(100, baseScore - brokenPenalty)
  );

  return Math.round(finalScore);
}



export function findUrlPosition(
  content: string,
  url: string
): {
  startOffset: number;
  endOffset: number;
  quotedText: string;
  isValid: boolean;
} | null {
  // First, find the URL in the content
  let urlIndex = content.indexOf(url);

  if (urlIndex === -1) {
    console.warn(`Could not find URL in content: ${url.substring(0, 50)}...`);
    return null;
  }

  // Check if this URL is part of a markdown link [text](url)
  // Look backwards from the URL to find if it's in markdown format
  let startOffset = urlIndex;
  let endOffset = urlIndex + url.length;
  let quotedText = url;

  // Check if URL is preceded by ]( - indicating it's part of a markdown link
  if (urlIndex >= 2 && content.substring(urlIndex - 2, urlIndex) === "](") {
    // Find the opening bracket of the markdown link
    const beforeParens = content.substring(0, urlIndex - 2);
    const openBracketIndex = beforeParens.lastIndexOf("[");

    if (openBracketIndex !== -1) {
      // Find the matching closing parenthesis for the markdown link
      // We need to account for any parentheses that might be part of the URL itself
      const afterUrlStart = urlIndex + url.length;
      let parenCount = 0;
      let closeParenIndex = -1;

      // Count any unmatched opening parens in the URL
      for (let i = 0; i < url.length; i++) {
        if (url[i] === "(") parenCount++;
        else if (url[i] === ")") parenCount--;
      }

      // Now look for the closing paren that matches the markdown syntax
      // We need to find a closing paren when parenCount reaches -1
      for (let i = afterUrlStart; i < content.length; i++) {
        if (content[i] === ")") {
          parenCount--;
          if (parenCount === -1) {
            closeParenIndex = i - afterUrlStart;
            break;
          }
        } else if (content[i] === "(") {
          parenCount++;
        }
      }

      if (closeParenIndex !== -1) {
        // This is a complete markdown link [text](url)
        startOffset = openBracketIndex;
        endOffset = afterUrlStart + closeParenIndex + 1;
        quotedText = content.substring(startOffset, endOffset);
      }
    }
  }

  return {
    startOffset,
    endOffset,
    quotedText,
    isValid: true,
  };
}
