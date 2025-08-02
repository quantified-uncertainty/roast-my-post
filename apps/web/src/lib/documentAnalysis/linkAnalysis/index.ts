import type { Agent } from "@roast/ai";
import { logger } from "@/lib/logger";
import type { Document } from "@roast/ai";
import type { TaskResult, ThinkingOutputs } from "../shared/types";
import { extractUrls } from "./urlExtractor";
import { validateUrls, type UrlValidationInput, type LinkAnalysis } from "../../urlValidator";
import { getDocumentFullContent } from "../../../utils/documentContentHelpers";

export async function generateLinkAnalysis(
  document: Document,
  agentInfo: Agent
): Promise<{ task: TaskResult; outputs: ThinkingOutputs; linkAnalysisResults: LinkAnalysis[] }> {
  const startTime = Date.now();
  
  // Step 1: Extract URLs from document
  // Get the full content with prepend for URL extraction
  const { content: fullContent } = getDocumentFullContent(document);
  const urls = extractUrls(fullContent);
  if (urls.length === 0) {
    // If no URLs found, return a simple analysis
    const noLinksThinking = `# Link Analysis Report

**Document:** ${document.title}

## Summary

No URLs were found in this document. This analysis focuses on link validation, so there is nothing to validate.

*Note: This document may contain valuable content, but it does not include any external links that need verification.*`;
    
    return {
      task: {
        name: "generateLinkAnalysis",
        modelName: "none",
        priceInDollars: 0,
        timeInSeconds: 0,
        log: JSON.stringify({ message: "No URLs found" }, null, 2),
      },
      outputs: {
        thinking: noLinksThinking,
      },
      linkAnalysisResults: [],
    };
  }

  // Step 2: Validate all URLs (no LLM filtering)
  const validationInputs: UrlValidationInput[] = urls.map(url => ({ url }));

  let validationResults: LinkAnalysis[];
  try {
    validationResults = await validateUrls(validationInputs);
  } catch (error) {
    logger.error('❌ URL validation failed:', error);
    // Create fallback results
    validationResults = validationInputs.map(input => ({
      url: input.url,
      timestamp: new Date(),
      accessError: {
        type: "Unknown" as const,
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }));
  }

  // Step 3: Generate the final thinking document
  const thinkingDocument = generateLinkAnalysisReport(document, urls, validationResults);

  const endTime = Date.now();
  const timeInSeconds = Math.round((endTime - startTime) / 1000);

  return {
    task: {
      name: "generateLinkAnalysis",
      modelName: "none",
      priceInDollars: 0, // No LLM costs anymore
      timeInSeconds,
      log: JSON.stringify({
        message: `Validated ${urls.length} URLs`,
        urlsFound: urls.length,
        validationResults: validationResults.length
      }, null, 2),
    },
    outputs: {
      thinking: thinkingDocument,
    },
    linkAnalysisResults: validationResults,
  };
}

function generateLinkAnalysisReport(
  document: Document,
  urls: string[],
  validationResults: LinkAnalysis[]
): string {
  // Count different types of results
  const errorCounts: { [key: string]: number } = {};
  let workingLinks = 0;
  
  validationResults.forEach(result => {
    if (result.accessError) {
      const errorType = result.accessError.type;
      errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
    } else {
      workingLinks++;
    }
  });
  
  let report = `# Link Analysis Report

`;
  report += `**Document:** ${document.title}
`;
  report += `**Author:** ${document.author}
`;
  report += `**Analysis Date:** ${new Date().toLocaleDateString()}

`;

  report += `## Summary

`;
  report += `- **Total Links:** ${urls.length}
`;
  report += `- **Working Links:** ${workingLinks}
`;
  report += `- **Broken Links:** ${Object.values(errorCounts).reduce((a, b) => a + b, 0)}

`;
  
  // Add error breakdown
  Object.entries(errorCounts).forEach(([errorType, count]) => {
    report += `- **${errorType} Errors:** ${count}
`;
  });
  
  report += `
`;

  // Add status messages
  if (errorCounts.NotFound > 0) {
    report += `❌ **${errorCounts.NotFound} link(s) not found** - These may be broken or incorrect URLs.

`;
  }
  if (errorCounts.NetworkError > 0) {
    report += `🌐 **${errorCounts.NetworkError} network error(s)** - These domains may be unreachable.

`;
  }
  if (workingLinks > 0 && Object.keys(errorCounts).length === 0) {
    report += `✅ **All links are accessible and working.**

`;
  }

  // Show individual link results
  urls.forEach((url, index) => {
    const result = validationResults[index];
    let statusEmoji = "❌ Error";
    let statusText = "Unknown";
    
    if (result.accessError) {
      switch (result.accessError.type) {
        case "NotFound":
          statusEmoji = "❌ Not Found";
          statusText = "Link does not exist (HTTP 404)";
          break;
        case "Forbidden":
          statusEmoji = "🚫 Access Denied";
          statusText = "Access forbidden (HTTP 403)";
          break;
        case "Timeout":
          statusEmoji = "⏱️ Timeout";
          statusText = "Request timed out";
          break;
        case "NetworkError":
          statusEmoji = "🌐 Network Error";
          statusText = result.accessError.message || "Network error";
          break;
        default:
          statusEmoji = `❌ ${result.accessError.type}`;
          statusText = ('message' in result.accessError ? result.accessError.message : undefined) || result.accessError.type;
      }
    } else {
      statusEmoji = "✅ Working";
      statusText = "Link is accessible";
    }

    report += `## ${statusEmoji} - Link ${index + 1}

`;
    report += `**URL:** ${url}

`;
    
    if (result.finalUrl && result.finalUrl !== url) {
      report += `**Final URL:** ${result.finalUrl}

`;
    }
    
    if (result.linkDetails) {
      report += `**Content Type:** ${result.linkDetails.contentType}

`;
      report += `**Status Code:** ${result.linkDetails.statusCode}

`;
    }
    
    if (result.accessError) {
      let errorMsg = statusText;
      if ('message' in result.accessError) {
        errorMsg = result.accessError.message;
      }
      report += `**Error Details:** ${errorMsg}

`;
    }
    
    report += `**Validation Result:** ${result.accessError ? 'Failed' : 'Success'}

`;
  });

  return report;
}