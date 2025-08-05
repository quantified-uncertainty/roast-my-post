import type { Agent } from "@roast/ai";
import { linkValidator } from "@roast/ai/server";
import { logger } from "@/lib/logger";
import type { Document } from "@roast/ai";
import type { TaskResult, ThinkingOutputs } from "../shared/types";
import { getDocumentFullContent } from "@/utils/documentContentHelpers";
import type { LinkAnalysis } from "../../urlValidator";

export async function generateLinkAnalysis(
  document: Document,
  agentInfo: Agent
): Promise<{ task: TaskResult; outputs: ThinkingOutputs; linkAnalysisResults: LinkAnalysis[] }> {
  const startTime = Date.now();
  
  // Get the full content with prepend for URL extraction
  const { content: fullContent } = getDocumentFullContent(document);
  
  try {
    // Use the link-validator tool to extract and validate URLs
    const toolResult = await linkValidator.run({
      text: fullContent,
      maxUrls: 20,
    }, {
      logger,
    });
    
    // Convert tool results back to LinkAnalysis format for compatibility
    const linkAnalysisResults: LinkAnalysis[] = toolResult.validations.map((validation: any) => ({
      url: validation.url,
      finalUrl: validation.finalUrl,
      timestamp: validation.timestamp,
      accessError: validation.error ? {
        type: validation.error.type as any,
        ...(validation.error.message && { message: validation.error.message }),
        ...(validation.error.statusCode && { statusCode: validation.error.statusCode }),
      } : undefined,
      linkDetails: validation.details ? {
        contentType: validation.details.contentType,
        statusCode: validation.details.statusCode,
      } : undefined,
    }));
    
    // Generate the thinking document based on results
    const thinkingDocument = generateLinkAnalysisReport(
      document, 
      toolResult.urls, 
      linkAnalysisResults,
      toolResult.summary
    );
    
    const endTime = Date.now();
    const timeInSeconds = Math.round((endTime - startTime) / 1000);
    
    return {
      task: {
        name: "generateLinkAnalysis",
        modelName: "none",
        priceInDollars: 0,
        timeInSeconds,
        log: JSON.stringify({
          message: `Validated ${toolResult.urls.length} URLs using link-validator tool`,
          urlsFound: toolResult.urls.length,
          workingLinks: toolResult.summary.workingLinks,
          brokenLinks: toolResult.summary.brokenLinks
        }, null, 2),
      },
      outputs: {
        thinking: thinkingDocument,
      },
      linkAnalysisResults,
    };
  } catch (error) {
    logger.error('❌ Link analysis failed:', error);
    
    const noLinksThinking = `# Link Analysis Report

**Document:** ${document.title}

## Summary

An error occurred during link analysis: ${error instanceof Error ? error.message : 'Unknown error'}

*Note: This document may contain links, but they could not be analyzed due to the error.*`;
    
    return {
      task: {
        name: "generateLinkAnalysis",
        modelName: "none",
        priceInDollars: 0,
        timeInSeconds: Math.round((Date.now() - startTime) / 1000),
        log: JSON.stringify({ 
          message: "Link analysis failed", 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }, null, 2),
      },
      outputs: {
        thinking: noLinksThinking,
      },
      linkAnalysisResults: [],
    };
  }
}

function generateLinkAnalysisReport(
  document: Document,
  urls: string[],
  validationResults: LinkAnalysis[],
  summary: { totalLinks: number; workingLinks: number; brokenLinks: number; errorBreakdown: Record<string, number> }
): string {
  if (urls.length === 0) {
    return `# Link Analysis Report

**Document:** ${document.title}

## Summary

No URLs were found in this document. This analysis focuses on link validation, so there is nothing to validate.

*Note: This document may contain valuable content, but it does not include any external links that need verification.*`;
  }
  
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
  report += `- **Total Links:** ${summary.totalLinks}
`;
  report += `- **Working Links:** ${summary.workingLinks}
`;
  report += `- **Broken Links:** ${summary.brokenLinks}

`;
  
  // Add error breakdown
  Object.entries(summary.errorBreakdown).forEach(([errorType, count]) => {
    report += `- **${errorType} Errors:** ${count}
`;
  });
  
  report += `
`;

  // Add status messages
  if (summary.errorBreakdown.NotFound > 0) {
    report += `❌ **${summary.errorBreakdown.NotFound} link(s) not found** - These may be broken or incorrect URLs.

`;
  }
  if (summary.errorBreakdown.NetworkError > 0) {
    report += `🌐 **${summary.errorBreakdown.NetworkError} network error(s)** - These domains may be unreachable.

`;
  }
  if (summary.workingLinks > 0 && summary.brokenLinks === 0) {
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