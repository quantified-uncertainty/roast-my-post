import type { Comment, ToolChainResult } from "../../../shared/types";
import { logger } from "../../../shared/logger";
import { 
  linkValidator, 
  generateLinkAnalysisReport, 
  generateNoLinksReport, 
  generateLinkHighlights,
  generateLinkAnalysisAndSummary,
  type LinkAnalysis 
} from "../../../tools/link-validator";
import { TextChunk } from "../../TextChunk";
import {
  AnalysisResult,
  RoutingExample,
  SimpleAnalysisPlugin,
} from "../../types";
import { CommentBuilder } from "../../utils/CommentBuilder";

export class LinkAnalysisPlugin implements SimpleAnalysisPlugin {
  private documentText: string;
  private chunks: TextChunk[];
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
    return `Call this when there are links or URLs in the document. This includes:
- HTTP/HTTPS URLs
- References to external sources
- Citations with links
- Any web addresses or online resources`;
  }

  routingExamples(): RoutingExample[] {
    return [
      {
        chunkText: "According to [this study](https://example.com/study), the results show...",
        shouldProcess: true,
        reason: "Contains a URL that should be validated",
      },
      {
        chunkText: "The report can be found at https://www.example.org/report.pdf",
        shouldProcess: true,
        reason: "Contains a direct URL",
      },
      {
        chunkText: "The study found significant results in the population.",
        shouldProcess: false,
        reason: "No URLs or links present",
      },
    ];
  }

  constructor() {
    this.documentText = "";
    this.chunks = [];
  }

  async analyze(chunks: TextChunk[], documentText: string): Promise<AnalysisResult> {
    this.processingStartTime = Date.now();
    this.documentText = documentText;
    this.chunks = chunks;
    
    if (this.hasRun) {
      return this.getResults();
    }

    try {
      logger.info("LinkAnalysisPlugin: Starting analysis");
      
      // Extract and validate links
      await this.extractAndValidateLinks();
      
      // Create comments for ALL links (not just broken ones)
      await this.createCommentsForAllLinks();
      
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
      this.analysis = "The link analysis could not be completed due to a technical error.";
      return this.getResults();
    }
  }

  private async extractAndValidateLinks(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Use the link-validator tool to extract and validate URLs
      const toolResult = await linkValidator.run({
        text: this.documentText,
        maxUrls: 20,
      }, {
        logger,
      });
      
      // Store the results
      this.extractedUrls = toolResult?.urls || [];
      
      // Convert tool results to LinkAnalysis format
      this.linkAnalysisResults = toolResult?.validations?.map((validation: any) => ({
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
      })) || [];
      
      const endTime = Date.now();
      const timeInSeconds = Math.round((endTime - startTime) / 1000);
      
      logger.info(`LinkAnalysisPlugin: Validated ${this.extractedUrls.length} URLs in ${timeInSeconds}s`);
      
    } catch (error) {
      logger.error('LinkAnalysisPlugin: Link extraction failed:', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  private async createCommentsForAllLinks(): Promise<void> {
    // Use the generateLinkHighlights function to create standardized comments
    const highlights = generateLinkHighlights(
      this.linkAnalysisResults,
      this.extractedUrls,
      this.documentText,
      50 // Report up to 50 link issues
    );
    
    // Convert highlights to our comment format
    this.comments = highlights.map(highlight => this.convertHighlightToComment(highlight));
  }
  
  private convertHighlightToComment(highlight: Comment): Comment {
    // The highlight from generateLinkHighlights is already a proper Comment
    return highlight;
  }
  
  private async createComments(): Promise<void> {
    const commentPromises: Promise<Comment | null>[] = [];
    
    // Create comments for each link
    for (const linkResult of this.linkAnalysisResults) {
      commentPromises.push(this.createLinkComment(linkResult));
    }
    
    const comments = await Promise.all(commentPromises);
    this.comments = comments.filter((comment): comment is Comment => comment !== null);
    
    logger.debug(`LinkAnalysisPlugin: Created ${this.comments.length} comments`);
  }

  private async createLinkComment(linkResult: LinkAnalysis): Promise<Comment | null> {
    // Find the position of the URL in the document
    const startOffset = this.documentText.indexOf(linkResult.url);
    if (startOffset === -1) {
      logger.warn(`LinkAnalysisPlugin: URL not found in document: ${linkResult.url}`);
      return null;
    }
    
    const endOffset = startOffset + linkResult.url.length;
    
    // Determine the issue and message
    let header: string;
    let level: 'error' | 'warning' | 'info' | 'success';
    let description: string;
    let grade: number;
    
    if (linkResult.accessError) {
      header = `Broken link: ${linkResult.url}`;
      level = 'error';
      description = this.formatBrokenLinkMessage(linkResult);
      grade = 0;
    } else if (linkResult.finalUrl && linkResult.finalUrl !== linkResult.url) {
      header = `Link redirects`;
      level = 'warning';
      description = `This link redirects to: ${linkResult.finalUrl}`;
      grade = 75;
    } else {
      // Link is working fine
      header = `Link verified`;
      level = 'success';
      description = `✅ Link successfully verified: ${linkResult.url}`;
      grade = 100;
    }
    
    // Build tool chain
    const toolChain: ToolChainResult[] = [
      {
        toolName: 'link-validator',
        stage: 'verification',
        timestamp: linkResult.timestamp ? linkResult.timestamp.toISOString() : new Date().toISOString(),
        result: linkResult
      }
    ];
    
    // Find which chunk contains this URL
    const chunkId = this.findChunkContainingText(linkResult.url);
    
    const comment: Comment = {
      description,
      grade,
      highlight: {
        startOffset,
        endOffset,
        quotedText: linkResult.url,
        isValid: true
      }
    };
    
    return comment;
  }

  private findChunkContainingText(text: string): string | null {
    for (const chunk of this.chunks) {
      if (chunk.text.includes(text)) {
        return chunk.id;
      }
    }
    return null;
  }

  private formatBrokenLinkMessage(linkResult: LinkAnalysis): string {
    const error = linkResult.accessError;
    if (!error) return "Link appears to be broken";
    
    let message = `**Link Status:** Broken\n\n`;
    
    switch (error.type) {
      case 'NotFound':
        message += `The page was not found (404 error).`;
        break;
      case 'ServerError':
        message += `The server returned an error (${error.statusCode || '5xx'}).`;
        break;
      case 'Timeout':
        message += `The link timed out and could not be accessed.`;
        break;
      case 'NetworkError':
        message += `A network error occurred while trying to access this link.`;
        break;
      case 'Forbidden':
        message += `Access to this link is forbidden (403 error).`;
        break;
      case 'RateLimited':
        message += `The link is rate limited and cannot be accessed right now.`;
        break;
      case 'Unknown':
        message += error.message || `The link could not be accessed.`;
        break;
      default:
        message += `The link could not be accessed.`;
    }
    
    message += `\n\n**Recommendation:** Verify the URL is correct or find an alternative source.`;
    
    return message;
  }

  private buildObservation(linkResult: LinkAnalysis): string {
    if (linkResult.accessError) {
      return `Link verification failed: ${linkResult.accessError.type}`;
    } else if (linkResult.finalUrl && linkResult.finalUrl !== linkResult.url) {
      return `Link redirects to a different URL`;
    }
    return "Link verified";
  }

  private buildSignificance(linkResult: LinkAnalysis): string | undefined {
    if (linkResult.accessError) {
      return "Broken links reduce document credibility and prevent readers from accessing cited sources";
    } else if (linkResult.finalUrl && linkResult.finalUrl !== linkResult.url) {
      return "Redirected links may indicate outdated references that should be updated";
    }
    return undefined;
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
      grade: (this as any).grade
    };
  }

  getCost(): number {
    return this.totalCost;
  }

  getDebugInfo(): Record<string, unknown> {
    return {
      hasRun: this.hasRun,
      linksCount: this.extractedUrls.length,
      brokenLinksCount: this.linkAnalysisResults.filter(r => r.accessError).length,
      commentsCount: this.comments.length,
      totalCost: this.totalCost,
      linkAnalysisResults: this.linkAnalysisResults,  // Expose for compatibility with existing workflow
    };
  }
}

// Export as LinkPlugin for compatibility
export { LinkAnalysisPlugin as LinkPlugin };