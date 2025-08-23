import type { Comment } from "../../shared/types";
import type { LinkAnalysis } from "./urlValidator";
import type { ExtractedUrl } from "./urlExtractor";

/**
 * Escape special Markdown characters in user-provided content
 */
function escapeMarkdown(text: string): string {
  return text
    .replace(/\\/g, '\\\\')  
    .replace(/\[/g, '\\[')    
    .replace(/\]/g, '\\]')    
    .replace(/\*/g, '\\*')    
    .replace(/_/g, '\\_')     
    .replace(/`/g, '\\`')     
    .replace(/>/g, '\\>')     
    .replace(/#/g, '\\#')     
    .replace(/\|/g, '\\|');   
}

/**
 * Truncate URL for display while keeping it clickable
 */
export function formatUrlForDisplay(url: string, maxLength: number = 60): string {
  if (url.length <= maxLength) {
    return url;
  }
  
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const path = urlObj.pathname + urlObj.search;
    
    if (domain.length + 10 >= maxLength) {
      return url.substring(0, maxLength - 3) + "...";
    }
    
    const remainingLength = maxLength - domain.length - 10;
    const truncatedPath = path.length > remainingLength 
      ? path.substring(0, remainingLength) + "..."
      : path;
    
    return `${urlObj.protocol}//${domain}${truncatedPath}`;
  } catch {
    return url.substring(0, maxLength - 3) + "...";
  }
}


/**
 * Legacy function for backward compatibility
 */
export function findUrlPosition(
  content: string,
  url: string
): {
  startOffset: number;
  endOffset: number;
  quotedText: string;
  isValid: boolean;
} | null {
  // Simple implementation for backward compatibility
  const index = content.indexOf(url);
  if (index === -1) return null;
  
  // Check if it's in a markdown link
  if (index >= 2 && content.substring(index - 2, index) === "](") {
    // Find the link text
    const beforeParen = content.substring(0, index - 2);
    const openBracket = beforeParen.lastIndexOf("[");
    if (openBracket !== -1) {
      return {
        startOffset: openBracket + 1,
        endOffset: index - 2,
        quotedText: content.substring(openBracket + 1, index - 2),
        isValid: true
      };
    }
  }
  
  return {
    startOffset: index,
    endOffset: index + url.length,
    quotedText: url,
    isValid: true
  };
}

/**
 * Generates highlights from link analysis results using pre-calculated positions
 */
export function generateLinkHighlights(
  linkAnalysisResults: LinkAnalysis[],
  extractedUrls: ExtractedUrl[],
  fullContent: string,
  targetHighlights?: number
): Comment[] {
  const highlights: Comment[] = [];
  
  // Create a map of URL to analysis result
  const linkResultMap = new Map<string, LinkAnalysis>();
  linkAnalysisResults.forEach((result) => {
    linkResultMap.set(result.url, result);
  });
  
  // Track processed positions to avoid duplicates
  const processedPositions = new Set<string>();
  
  // Process each extracted URL
  for (const extractedUrl of extractedUrls) {
    const linkResult = linkResultMap.get(extractedUrl.url);
    if (!linkResult) {
      continue;
    }
    
    // Use the positions directly from extractedUrl - they're already correct for the markdown
    const position = {
      startOffset: extractedUrl.highlightStartOffset,
      endOffset: extractedUrl.highlightEndOffset,
      quotedText: extractedUrl.highlightText
    };
    
    // Create a unique key for this position
    const positionKey = `${position.startOffset}-${position.endOffset}`;
    if (processedPositions.has(positionKey)) {
      continue;
    }
    
    let grade: number;
    let importance: number;
    let description: string;
    
    // Get validation method info
    const validationMethod = linkResult.validationMethod || "HTTP Request";
    const methodNote = validationMethod !== "HTTP Request" ? ` (verified via ${validationMethod})` : "";
    
    if (linkResult.accessError) {
      // Handle different error types
      switch (linkResult.accessError.type) {
        case "NotFound":
          grade = 0;
          importance = 100;
          description = `❌ Broken link\n\n[${formatUrlForDisplay(extractedUrl.url)}](${extractedUrl.url}) - Page not found (HTTP 404)${methodNote}`;
          break;
        case "Forbidden":
          grade = 50;
          importance = 50;
          description = `⚠️ Access restricted\n\n[${formatUrlForDisplay(extractedUrl.url)}](${extractedUrl.url}) - Site exists but blocks automated access (HTTP 403)${methodNote}`;
          break;
        case "RateLimited":
          grade = 50;
          importance = 50;
          description = `⚠️ Rate limited\n\n[${formatUrlForDisplay(extractedUrl.url)}](${extractedUrl.url}) - Site exists but temporarily rate limited${methodNote}`;
          break;
        case "Timeout":
          grade = 0;
          importance = 100;
          description = `⏱️ Link timeout\n\n[${formatUrlForDisplay(extractedUrl.url)}](${extractedUrl.url}) - Request timed out${methodNote}`;
          break;
        default:
          grade = 0;
          importance = 100;
          const errorMsg =
            "message" in linkResult.accessError
              ? escapeMarkdown(linkResult.accessError.message)
              : "Unknown error";
          description = `❌ Link error\n\n[${formatUrlForDisplay(extractedUrl.url)}](${extractedUrl.url}) - ${errorMsg}${methodNote}`;
      }
    } else {
      // URL is accessible
      grade = 90;
      importance = 10;
      const statusCode = linkResult.linkDetails?.statusCode || 200;
      description = `✅ Link verified\n\n[${formatUrlForDisplay(extractedUrl.url)}](${extractedUrl.url}) - Server responded successfully (HTTP ${statusCode})${methodNote}`;
    }
    
    highlights.push({
      description,
      highlight: {
        startOffset: position.startOffset,
        endOffset: position.endOffset,
        quotedText: position.quotedText,
        isValid: true
      },
      importance,
      grade,
      
      // Required fields for Comment interface  
      header: extractedUrl.url.length > 50 ? extractedUrl.url.substring(0, 47) + '...' : extractedUrl.url,
      level: grade > 70 ? 'success' : grade > 30 ? 'warning' : 'error',
      source: 'link-analysis',
      metadata: {
        pluginName: 'link-analysis',
        timestamp: new Date().toISOString(),
        chunkId: 'unknown',
        processingTimeMs: 0,
        toolChain: [],
        // Debugging information
        url: extractedUrl.url,
        isMarkdownLink: extractedUrl.isMarkdownLink,
        linkText: extractedUrl.linkText,
        originalPositions: {
          urlStart: extractedUrl.urlStartOffset,
          urlEnd: extractedUrl.urlEndOffset,
          linkTextStart: extractedUrl.linkTextStartOffset,
          linkTextEnd: extractedUrl.linkTextEndOffset,
          highlightStart: extractedUrl.highlightStartOffset,
          highlightEnd: extractedUrl.highlightEndOffset
        },
        validationResult: linkResult.accessError ? 'error' : 'success',
        validationMethod: linkResult.validationMethod || 'HTTP Request',
        statusCode: linkResult.linkDetails?.statusCode || linkResult.accessError?.statusCode,
        errorType: linkResult.accessError?.type
      }
    });
    
    processedPositions.add(positionKey);
  }
  
  // Sort by position in document
  highlights.sort((a, b) => (a.highlight?.startOffset || 0) - (b.highlight?.startOffset || 0));
  
  // Limit if requested
  if (targetHighlights && targetHighlights > 0) {
    return highlights.slice(0, targetHighlights);
  }
  
  return highlights;
}

/**
 * Overload for backward compatibility - accepts URL strings
 */
export function generateLinkHighlightsLegacy(
  linkAnalysisResults: LinkAnalysis[],
  originalUrls: string[],
  fullContent: string,
  targetHighlights?: number
): Comment[] {
  // Convert URL strings to ExtractedUrl format
  // This is a simplified conversion for backward compatibility
  const extractedUrls: ExtractedUrl[] = originalUrls.map(url => {
    const urlIndex = fullContent.indexOf(url);
    if (urlIndex === -1) {
      return null;
    }
    
    // Check if it's in a markdown link
    const beforeUrl = fullContent.substring(Math.max(0, urlIndex - 2), urlIndex);
    const isMarkdown = beforeUrl === "](";
    
    if (isMarkdown) {
      // Find the link text
      const beforeParen = fullContent.substring(0, urlIndex - 2);
      const openBracket = beforeParen.lastIndexOf("[");
      if (openBracket !== -1) {
        const linkText = fullContent.substring(openBracket + 1, urlIndex - 2);
        return {
          url,
          urlStartOffset: urlIndex,
          urlEndOffset: urlIndex + url.length,
          isMarkdownLink: true,
          linkText,
          linkTextStartOffset: openBracket + 1,
          linkTextEndOffset: urlIndex - 2,
          highlightStartOffset: openBracket + 1,
          highlightEndOffset: urlIndex - 2,
          highlightText: linkText
        };
      }
    }
    
    return {
      url,
      urlStartOffset: urlIndex,
      urlEndOffset: urlIndex + url.length,
      isMarkdownLink: false,
      highlightStartOffset: urlIndex,
      highlightEndOffset: urlIndex + url.length,
      highlightText: url
    };
  }).filter(item => item !== null) as ExtractedUrl[];
  
  return generateLinkHighlights(linkAnalysisResults, extractedUrls, fullContent, targetHighlights);
}