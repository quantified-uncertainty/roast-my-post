import { logger } from "../../../shared/logger";
import type { Comment } from "../../../shared/types";
import {
  generateLinkAnalysisAndSummary,
  generateLinkHighlights,
  type LinkAnalysis,
  linkValidator,
} from "../../../tools/link-validator";
import { TextChunk } from "../../TextChunk";
import {
  AnalysisResult,
  SimpleAnalysisPlugin,
} from "../../types";

export class LinkAnalysisPlugin implements SimpleAnalysisPlugin {
  // Static property to bypass routing - link analysis should always run
  static readonly runOnAllChunks = true;
  // Instance property for PluginManager to check
  readonly runOnAllChunks = true;

  private documentText: string;
  private hasRun = false;
  private comments: Comment[] = [];
  private summary: string = "";
  private analysis: string = "";
  private totalCost: number = 0;
  private linkAnalysisResults: LinkAnalysis[] = [];
  private extractedUrls: string[] = [];
  private processingStartTime: number = 0;

  name(): string {
    return "LINK_ANALYSIS";
  }

  promptForWhenToUse(): string {
    // This plugin always runs on all chunks
    return "Link analysis automatically runs on all documents";
  }

  routingExamples(): never[] {
    // Not used for always-run plugins
    return [];
  }

  constructor() {
    this.documentText = "";
  }

  async analyze(
    _chunks: TextChunk[],
    documentText: string
  ): Promise<AnalysisResult> {
    this.processingStartTime = Date.now();
    this.documentText = documentText;

    if (this.hasRun) {
      return this.getResults();
    }

    try {
      logger.info("LinkAnalysisPlugin: Starting analysis", {
        documentLength: documentText?.length || 0,
        hasDocument: !!documentText,
      });

      // Extract, validate links and create comments in one step
      await this.extractValidateAndComment();

      // Generate analysis summary with grade
      this.generateAnalysisWithGrade();

      this.hasRun = true;
      logger.info(
        `LinkAnalysisPlugin: Analysis complete - ${this.comments.length} comments generated`
      );

      return this.getResults();
    } catch (error) {
      logger.error("LinkAnalysisPlugin: Fatal error during analysis", error);
      this.hasRun = true;
      this.summary = "Link analysis failed due to an error";
      this.analysis =
        "The link analysis could not be completed due to a technical error.";
      return this.getResults();
    }
  }

  private async extractValidateAndComment(): Promise<void> {
    const startTime = Date.now();

    try {
      // Use the link-validator tool to extract and validate URLs
      const toolResult = await linkValidator.run(
        {
          text: this.documentText,
          maxUrls: 50,
        },
        {
          logger,
        }
      );

      // Store the results
      this.extractedUrls = toolResult?.urls || [];

      // Convert tool results to LinkAnalysis format
      this.linkAnalysisResults =
        toolResult?.validations?.map((validation: any) => ({
          url: validation.url,
          finalUrl: validation.finalUrl,
          timestamp: validation.timestamp,
          accessError: validation.error
            ? {
                type: validation.error.type as any,
                ...(validation.error.message && {
                  message: validation.error.message,
                }),
                ...(validation.error.statusCode && {
                  statusCode: validation.error.statusCode,
                }),
              }
            : undefined,
          linkDetails: validation.details
            ? {
                contentType: validation.details.contentType,
                statusCode: validation.details.statusCode,
              }
            : undefined,
        })) || [];

      const endTime = Date.now();
      const timeInSeconds = Math.round((endTime - startTime) / 1000);

      logger.info(
        `LinkAnalysisPlugin: Validated ${this.extractedUrls.length} URLs in ${timeInSeconds}s`
      );

      // Create comments for all links
      // Use the generateLinkHighlights function to create standardized comments
      const highlights = generateLinkHighlights(
        this.linkAnalysisResults,
        this.extractedUrls,
        this.documentText,
        50 // Report up to 50 link issues
      );

      // Convert highlights to our comment format
      this.comments = highlights.map((highlight) =>
        this.convertHighlightToComment(highlight)
      );
    } catch (error) {
      logger.error("LinkAnalysisPlugin: Link extraction failed:", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private convertHighlightToComment(highlight: Comment): Comment {
    // The highlight from generateLinkHighlights is already a proper Comment
    return highlight;
  }

  private generateAnalysisWithGrade(): void {
    // Use the generateLinkAnalysisAndSummary function for consistency
    const { analysis, summary, grade } = generateLinkAnalysisAndSummary(
      this.linkAnalysisResults,
      "Document"
    );

    this.summary = summary;
    this.analysis = analysis;
    // Store grade in the results
    (this as any).grade = grade;
  }

  public getResults(): AnalysisResult {
    if (!this.hasRun) {
      throw new Error("Analysis has not been run yet. Call analyze() first.");
    }

    return {
      summary: this.summary,
      analysis: this.analysis,
      comments: this.comments,
      cost: this.totalCost,
      grade: (this as any).grade,
    };
  }

  getCost(): number {
    return this.totalCost;
  }

  getDebugInfo(): Record<string, unknown> {
    return {
      hasRun: this.hasRun,
      linksCount: this.extractedUrls.length,
      brokenLinksCount: this.linkAnalysisResults.filter((r) => r.accessError)
        .length,
      commentsCount: this.comments.length,
      totalCost: this.totalCost,
      linkAnalysisResults: this.linkAnalysisResults, // Expose for compatibility with existing workflow
    };
  }
}

// Export as LinkPlugin for compatibility
export { LinkAnalysisPlugin as LinkPlugin };
