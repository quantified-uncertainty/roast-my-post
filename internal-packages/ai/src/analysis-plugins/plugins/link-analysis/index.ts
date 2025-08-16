import { logger } from "../../../shared/logger";
import {
  generateLinkAnalysisAndSummary,
  generateLinkHighlights,
  linkValidator,
  validateUrls,
  extractUrls,
  type LinkAnalysis,
} from "../../../tools/link-validator";
import { TextChunk } from "../../TextChunk";
import { AnalysisResult, SimpleAnalysisPlugin } from "../../types";

/**
 * Link Analysis Plugin - Simple wrapper around the link-validator tool
 * Validates all URLs in a document and generates comments for issues
 */
export class LinkAnalysisPlugin implements SimpleAnalysisPlugin {
  // Bypass routing - link analysis should always run
  static readonly runOnAllChunks = true;
  readonly runOnAllChunks = true;

  private result?: AnalysisResult;

  name(): string {
    return "LINK_ANALYSIS";
  }

  promptForWhenToUse(): string {
    return "Link analysis automatically runs on all documents";
  }

  routingExamples(): never[] {
    return [];
  }

  async analyze(
    _chunks: TextChunk[],
    documentText: string
  ): Promise<AnalysisResult> {
    // Return cached result if already run
    if (this.result) {
      return this.result;
    }

    try {
      // Extract URLs from the text
      const urls = extractUrls(documentText, 50);
      
      // If no URLs found, return early with appropriate messaging
      if (urls.length === 0) {
        logger.info('LinkAnalysisPlugin: No URLs found in document');
        this.result = {
          summary: "No external links found in the document",
          analysis: "# Link Analysis Report\n\nNo external links were found in this document.",
          comments: [],
          cost: 0,
          grade: 100, // No broken links means perfect score
        };
        return this.result;
      }
      
      logger.info(`LinkAnalysisPlugin: Found ${urls.length} URLs, validating...`);
      
      // Validate URLs directly using the lower-level function
      const linkAnalysisResults = await validateUrls(
        urls.map(url => ({ url }))
      );

      // Generate comments using the tool's helper
      const comments = generateLinkHighlights(
        linkAnalysisResults,
        urls,
        documentText,
        50
      );

      // Generate summary and analysis using the tool's helper
      const { analysis, summary, grade } = generateLinkAnalysisAndSummary(
        linkAnalysisResults,
        "Document"
      );

      // Cache and return result
      this.result = {
        summary,
        analysis,
        comments,
        cost: 0,
        grade,
      };

      logger.info(`LinkAnalysisPlugin: Generated ${comments.length} comments`);
      return this.result;
      
    } catch (error) {
      logger.error("LinkAnalysisPlugin: Error during analysis", error);
      
      // Return error result
      this.result = {
        summary: "Link analysis failed",
        analysis: "The link analysis could not be completed due to an error.",
        comments: [],
        cost: 0,
      };
      
      return this.result;
    }
  }

  getCost(): number {
    return 0;
  }

  getDebugInfo(): Record<string, unknown> {
    return {
      hasRun: !!this.result,
      commentsCount: this.result?.comments.length || 0,
    };
  }
}

// Export as LinkPlugin for compatibility
export { LinkAnalysisPlugin as LinkPlugin };