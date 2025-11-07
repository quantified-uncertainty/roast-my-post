import { logger } from "../../../shared/logger";
import type { DocumentLocation } from "../../../shared/types";
import type { ExtractedEpistemicIssue } from "../../../tools/epistemic-issues-extractor/types";
import fuzzyTextLocatorTool from "../../../tools/smart-text-searcher";
import type { ToolContext } from "../../../tools/base/Tool";
import { TextChunk } from "../../TextChunk";
import { THRESHOLDS, IssueType, ISSUE_TYPES } from "./constants";

// Research findings from Perplexity (if research was conducted)
export interface ResearchFindings {
  summary: string;
  sources: string[];
  [key: string]: unknown; // Allow additional properties for ToolResult compatibility
}

/**
 * Domain model for an epistemic issue found in text
 */
export class EpistemicIssue {
  public issue: ExtractedEpistemicIssue;
  private chunk: TextChunk;
  public researchFindings?: ResearchFindings;
  private processingStartTime: number;

  constructor(
    issue: ExtractedEpistemicIssue,
    chunk: TextChunk,
    processingStartTime: number
  ) {
    this.issue = issue;
    this.chunk = chunk;
    this.processingStartTime = processingStartTime;
  }

  get text(): string {
    return this.issue.exactText;
  }

  get issueType(): IssueType {
    return this.issue.issueType;
  }

  get severityScore(): number {
    return this.issue.severityScore;
  }

  get confidenceScore(): number {
    return this.issue.confidenceScore;
  }

  get importanceScore(): number {
    return this.issue.importanceScore;
  }

  get researchableScore(): number {
    return this.issue.researchableScore;
  }

  getChunk(): TextChunk {
    return this.chunk;
  }

  /**
   * Determines if this issue should be researched using Perplexity
   */
  shouldResearch(): boolean {
    // Research high-severity issues that are researchable
    const isHighSeverity =
      this.severityScore >= THRESHOLDS.MIN_SEVERITY_FOR_RESEARCH;
    const isResearchable =
      this.researchableScore >= THRESHOLDS.MIN_RESEARCHABILITY_FOR_RESEARCH;

    return isHighSeverity && isResearchable;
  }

  /**
   * Determines if this issue is high value (should be prioritized)
   */
  isHighValue(): boolean {
    const isCritical = this.severityScore >= THRESHOLDS.SEVERITY_CRITICAL;
    const isHighSeverity = this.severityScore >= THRESHOLDS.SEVERITY_HIGH;
    const isImportant = this.importanceScore >= 60;

    return isCritical || (isHighSeverity && isImportant);
  }

  /**
   * Get the comment level for this issue
   */
  getCommentLevel(): "error" | "warning" | "info" | "success" {
    const { issueType, severityScore } = this.issue;

    // Verified accurate claims get success
    if (issueType === ISSUE_TYPES.VERIFIED_ACCURATE) {
      return "success";
    }

    // Critical severity (80+)
    if (severityScore >= THRESHOLDS.SEVERITY_CRITICAL) {
      return "error";
    }

    // High severity (60+)
    if (severityScore >= THRESHOLDS.SEVERITY_HIGH) {
      if (
        issueType === ISSUE_TYPES.MISINFORMATION ||
        issueType === ISSUE_TYPES.DECEPTIVE_WORDING
      ) {
        return "error";
      }
      return "warning";
    }

    // Medium severity (40+)
    if (severityScore >= THRESHOLDS.SEVERITY_MEDIUM) {
      return "warning";
    }

    // Low severity
    return "info";
  }

  /**
   * Find the location of this issue in the full document
   */
  async findLocation(
    documentText: string,
    context: ToolContext
  ): Promise<DocumentLocation | null> {
    try {
      const locationResult = await fuzzyTextLocatorTool.execute(
        {
          documentText,
          searchText: this.issue.exactText,
          options: {
            normalizeQuotes: true,
            partialMatch: false,
            useLLMFallback: true,
          },
        },
        context
      );

      if (locationResult.found && locationResult.location) {
        return {
          startOffset: locationResult.location.startOffset,
          endOffset: locationResult.location.endOffset,
          quotedText: locationResult.location.quotedText,
        };
      }
    } catch (error) {
      logger.warn(
        `[EpistemicCritic] Failed to find location for issue: "${this.text.substring(0, 50)}..."`,
        { error: error instanceof Error ? error.message : String(error) }
      );
    }

    return null;
  }

  /**
   * Get processing time in milliseconds
   */
  getProcessingTime(): number {
    return Date.now() - this.processingStartTime;
  }

  /**
   * Get processing start time
   */
  getProcessingStartTime(): number {
    return this.processingStartTime;
  }

  /**
   * Check if research was conducted
   */
  hasResearch(): boolean {
    return this.researchFindings !== undefined;
  }

  /**
   * Get a short header for this issue
   */
  getHeader(): string {
    switch (this.issueType) {
      case ISSUE_TYPES.MISINFORMATION:
        return this.severityScore >= 80
          ? "Critical misinformation detected"
          : "Potential misinformation";
      case ISSUE_TYPES.MISSING_CONTEXT:
        return "Important context missing";
      case ISSUE_TYPES.DECEPTIVE_WORDING:
        return this.severityScore >= 60
          ? "Deceptive presentation"
          : "Potentially misleading wording";
      case ISSUE_TYPES.LOGICAL_FALLACY:
        return "Logical fallacy detected";
      case ISSUE_TYPES.VERIFIED_ACCURATE:
        return "Claim verified";
      default:
        return "Epistemic issue";
    }
  }

  /**
   * Gather surrounding context for research or analysis
   */
  async gatherContext(
    documentText: string,
    context: ToolContext,
    windowSize: number = 300
  ): Promise<string> {
    const location = await this.findLocation(documentText, context);

    if (
      location &&
      location.startOffset !== undefined &&
      location.endOffset !== undefined
    ) {
      const start = Math.max(0, location.startOffset - windowSize);
      const end = Math.min(documentText.length, location.endOffset + windowSize);
      let contextText = documentText.substring(start, end);

      // Add ellipsis if truncated
      if (start > 0) contextText = "..." + contextText;
      if (end < documentText.length) contextText += "...";

      return `<surrounding_context>
${contextText}
</surrounding_context>`;
    }

    // Fallback: use chunk if we can't locate in document
    return `<surrounding_context>
${this.chunk.text}
</surrounding_context>`;
  }
}
