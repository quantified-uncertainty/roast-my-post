import type { Comment } from "../../shared/types";
import type { LinkAnalysis } from "./urlValidator";

/**
 * Truncate URL for display while keeping it clickable
 */
export function formatUrlForDisplay(url: string, maxLength: number = 60): string {
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
 * Finds the position of a URL in content, including markdown link boundaries
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

/**
 * Generates highlights (comments) from link analysis results
 */
export function generateLinkHighlights(
  linkAnalysisResults: LinkAnalysis[],
  originalUrls: string[],
  fullContent: string,
  targetHighlights?: number
): Comment[] {
  const highlights: Comment[] = [];

  // Create a map of URL to analysis result for faster lookup
  const linkResultMap = new Map<string, LinkAnalysis>();
  linkAnalysisResults.forEach((result) => {
    linkResultMap.set(result.url, result);
  });

  // Track positions we've already highlighted to avoid duplicates
  const processedPositions = new Set<string>();

  // Process all URLs in the order they appear in the document
  for (const url of originalUrls) {
    const urlPosition = findUrlPosition(fullContent, url);

    if (!urlPosition) {
      console.debug(`Could not find position for URL: ${url.substring(0, 50)}...`);
      continue;
    }

    // Validate the position
    if (urlPosition.startOffset < 0 || urlPosition.endOffset <= urlPosition.startOffset) {
      console.warn(`Invalid position for URL ${url.substring(0, 50)}:`, {
        startOffset: urlPosition.startOffset,
        endOffset: urlPosition.endOffset
      });
      continue;
    }

    // Additional validation: ensure offsets are within content bounds
    if (urlPosition.endOffset > fullContent.length) {
      console.warn(`URL position exceeds content length for ${url.substring(0, 50)}:`, {
        endOffset: urlPosition.endOffset,
        contentLength: fullContent.length
      });
      continue;
    }

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

      highlights.push({
        description,
        highlight: urlPosition,
        importance,
        grade,
        
        // Required fields for new Comment interface  
        header: url.length > 50 ? url.substring(0, 47) + '...' : url,
        level: grade > 0.7 ? 'success' : grade > 0.3 ? 'warning' : 'error',
        source: 'link-analysis',
        metadata: {
          pluginName: 'link-analysis',
          timestamp: new Date().toISOString(),
          chunkId: 'unknown',
          processingTimeMs: 0,
          toolChain: []
        }
      });

      // Mark this position as processed
      processedPositions.add(positionKey);
    }
  }

  // Sort highlights by their position in the document to ensure top-to-bottom order
  highlights.sort((a, b) => (a.highlight?.startOffset || 0) - (b.highlight?.startOffset || 0));

  // Limit highlights if requested
  if (targetHighlights && targetHighlights > 0) {
    return highlights.slice(0, targetHighlights);
  }

  return highlights;
}