import type { LinkAnalysis } from "./urlValidator";

export interface LinkMetrics {
  totalLinks: number;
  workingLinks: number;
  brokenLinks: number;
  accessDeniedLinks: number;
  notFoundLinks: number;
  timeoutLinks: number;
  networkErrorLinks: number;
  otherErrorLinks: number;
}

/**
 * Calculates metrics from link analysis results
 */
export function calculateLinkMetrics(linkAnalysisResults: LinkAnalysis[]): LinkMetrics {
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

/**
 * Generates a message about broken links based on the error types
 */
export function generateBrokenLinksMessage(metrics: LinkMetrics): string {
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

/**
 * Calculates a grade based on link metrics
 */
export function calculateLinkGradeFromMetrics(metrics: LinkMetrics): number {
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

/**
 * Generates a detailed link analysis report
 */
export function generateLinkAnalysisReport(
  urls: string[],
  validationResults: LinkAnalysis[],
  documentTitle?: string,
  documentAuthor?: string
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
  
  let report = `# Link Analysis Report\n\n`;
  
  if (documentTitle) {
    report += `**Document:** ${documentTitle}\n`;
  }
  if (documentAuthor) {
    report += `**Author:** ${documentAuthor}\n`;
  }
  report += `**Analysis Date:** ${new Date().toLocaleDateString()}\n\n`;

  report += `## Summary\n\n`;
  report += `- **Total Links:** ${urls.length}\n`;
  report += `- **Working Links:** ${workingLinks}\n`;
  report += `- **Broken Links:** ${Object.values(errorCounts).reduce((a, b) => a + b, 0)}\n\n`;
  
  // Add error breakdown
  Object.entries(errorCounts).forEach(([errorType, count]) => {
    report += `- **${errorType} Errors:** ${count}\n`;
  });
  
  report += `\n`;

  // Add status messages
  if (errorCounts.NotFound > 0) {
    report += `❌ **${errorCounts.NotFound} link(s) not found** - These may be broken or incorrect URLs.\n\n`;
  }
  if (errorCounts.NetworkError > 0) {
    report += `🌐 **${errorCounts.NetworkError} network error(s)** - These domains may be unreachable.\n\n`;
  }
  if (workingLinks > 0 && Object.keys(errorCounts).length === 0) {
    report += `✅ **All links are accessible and working.**\n\n`;
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

    report += `## ${statusEmoji} - Link ${index + 1}\n\n`;
    report += `**URL:** ${url}\n\n`;
    
    if (result.finalUrl && result.finalUrl !== url) {
      report += `**Final URL:** ${result.finalUrl}\n\n`;
    }
    
    if (result.linkDetails) {
      report += `**Content Type:** ${result.linkDetails.contentType}\n\n`;
      report += `**Status Code:** ${result.linkDetails.statusCode}\n\n`;
    }
    
    if (result.accessError) {
      let errorMsg = statusText;
      if ('message' in result.accessError) {
        errorMsg = result.accessError.message;
      }
      report += `**Error Details:** ${errorMsg}\n\n`;
    }
    
    report += `**Validation Result:** ${result.accessError ? 'Failed' : 'Success'}\n\n`;
  });

  return report;
}

/**
 * Generates a report when no links are found in the document
 */
export function generateNoLinksReport(documentTitle?: string): string {
  return `# Link Analysis Report

${documentTitle ? `**Document:** ${documentTitle}\n\n` : ''}## Summary

No URLs were found in this document. This analysis focuses on link validation, so there is nothing to validate.

*Note: This document may contain valuable content, but it does not include any external links that need verification.*`;
}

/**
 * Generates analysis and summary from link validation results
 */
export function generateLinkAnalysisAndSummary(
  linkAnalysisResults: LinkAnalysis[],
  documentTitle?: string
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