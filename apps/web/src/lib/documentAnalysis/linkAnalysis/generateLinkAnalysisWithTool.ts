import type { Agent } from "@roast/ai";
import { linkValidator, generateLinkAnalysisReport, type LinkAnalysis } from "@roast/ai/server";
import { logger } from "@/lib/logger";
import type { Document } from "@roast/ai";
import type { TaskResult, ThinkingOutputs } from "../shared/types";
import { getDocumentFullContent } from "@/utils/documentContentHelpers";

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
    const thinkingDocument = toolResult.urls.length === 0
      ? generateNoLinksReport(document.title)
      : generateLinkAnalysisReport(
          toolResult.urls, 
          linkAnalysisResults,
          document.title,
          document.author
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
    
    const errorThinking = `# Link Analysis Report

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
        thinking: errorThinking,
      },
      linkAnalysisResults: [],
    };
  }
}

function generateNoLinksReport(documentTitle?: string): string {
  return `# Link Analysis Report

${documentTitle ? `**Document:** ${documentTitle}\n\n` : ''}## Summary

No URLs were found in this document. This analysis focuses on link validation, so there is nothing to validate.

*Note: This document may contain valuable content, but it does not include any external links that need verification.*`;
}