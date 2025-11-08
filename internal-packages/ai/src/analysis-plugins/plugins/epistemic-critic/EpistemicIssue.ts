import { logger } from "../../../shared/logger";
import type { DocumentLocation } from "../../../shared/types";
import type { ExtractedEpistemicIssue } from "../../../tools/epistemic-issues-extractor/types";
import fuzzyTextLocatorTool from "../../../tools/smart-text-searcher";
import type { ToolContext } from "../../../tools/base/Tool";
import { TextChunk } from "../../TextChunk";
import { THRESHOLDS, IssueType, ISSUE_TYPES } from "./constants";

/**
 * Domain model for an epistemic issue found in text
 */
export class EpistemicIssue {
  public issue: ExtractedEpistemicIssue;
  private chunk: TextChunk;
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

  getChunk(): TextChunk {
    return this.chunk;
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
   *
   * Uses importance score as primary factor, with severity for critical issues
   */
  getCommentLevel(): "error" | "warning" | "nitpick" | "info" | "success" | "debug" {
    const { issueType, importanceScore, severityScore } = this.issue;

    // Verified accurate claims get success
    if (issueType === ISSUE_TYPES.VERIFIED_ACCURATE) {
      return "success";
    }

    // Critical severity issues always get error (regardless of importance)
    if (severityScore >= THRESHOLDS.SEVERITY_CRITICAL) {
      return "error";
    }

    // High severity misinformation/deceptive issues get error
    if (severityScore >= THRESHOLDS.SEVERITY_HIGH) {
      if (
        issueType === ISSUE_TYPES.MISINFORMATION ||
        issueType === ISSUE_TYPES.DECEPTIVE_WORDING
      ) {
        return "error";
      }
    }

    // For everything else, use importance score:
    // importance < 30 → debug
    if (importanceScore < 30) {
      return "debug";
    }

    // 30 <= importance < 75 → nitpick
    if (importanceScore < 75) {
      return "nitpick";
    }

    // 75 <= importance < 90 → warning
    if (importanceScore < 90) {
      return "warning";
    }

    // importance >= 90 → error
    return "error";
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
          lineNumberHint: this.issue.approximateLineNumber,
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
   * Get a short header for this issue
   */
  getHeader(): string {
    const prefix = this.getConfidencePrefix();
    const adjustedSeverity = this.severityScore;

    switch (this.issueType) {
      case ISSUE_TYPES.MISINFORMATION:
        if (adjustedSeverity >= THRESHOLDS.SEVERITY_CRITICAL) {
          return "Critical misinformation detected";
        }
        return prefix ? `${prefix} misinformation` : "Misinformation";

      case ISSUE_TYPES.MISSING_CONTEXT:
        if (this.importanceScore < THRESHOLDS.IMPORTANCE_NITPICK) {
          return prefix ? `${prefix}: Context could be added` : "Context could be added";
        }
        return prefix ? `${prefix} missing context` : "Missing context";

      case ISSUE_TYPES.DECEPTIVE_WORDING:
        if (adjustedSeverity >= 70) {
          return "Deceptive presentation";
        }
        return prefix ? `${prefix} misleading wording` : "Misleading wording";

      case ISSUE_TYPES.LOGICAL_FALLACY:
        const fallacyName = this.extractFallacyName();
        if (fallacyName) {
          return prefix ? `${prefix} ${fallacyName}` : fallacyName;
        }
        return prefix ? `${prefix} logical fallacy` : "Logical fallacy";

      case ISSUE_TYPES.VERIFIED_ACCURATE:
        return "Claim verified";

      default:
        return "Epistemic issue";
    }
  }

  /**
   * Get confidence-based prefix for headers
   */
  private getConfidencePrefix(): string {
    const adjustedSeverity = this.severityScore;
    const { confidenceScore, importanceScore } = this.issue;

    // Very low importance = nitpick
    if (importanceScore < THRESHOLDS.IMPORTANCE_NITPICK) {
      return "Nitpick";
    }

    // Critical issues
    if (adjustedSeverity >= THRESHOLDS.SEVERITY_CRITICAL && confidenceScore >= 70) {
      return "Critical";
    }

    // Clear/high confidence - no prefix, just state the issue
    if (confidenceScore >= THRESHOLDS.CONFIDENCE_CLEAR) {
      return "";
    }

    // Likely/medium confidence
    if (confidenceScore >= THRESHOLDS.CONFIDENCE_LIKELY) {
      return "Likely";
    }

    // Possible/low confidence
    return "Possible";
  }

  /**
   * Extract specific fallacy name from reasoning text
   */
  private extractFallacyName(): string | null {
    const reasoning = this.issue.reasoning.toLowerCase();

    // Common fallacies to detect
    const fallacies: Record<string, string> = {
      "ad hominem": "Ad Hominem",
      "straw man": "Straw Man",
      "strawman": "Straw Man",
      "false dilemma": "False Dilemma",
      "false dichotomy": "False Dilemma",
      "slippery slope": "Slippery Slope",
      "appeal to authority": "Appeal to Authority",
      "appeal to emotion": "Appeal to Emotion",
      "hasty generalization": "Hasty Generalization",
      "circular reasoning": "Circular Reasoning",
      "begging the question": "Begging the Question",
      "post hoc": "Post Hoc",
      "correlation causation": "Correlation ≠ Causation",
      "texas sharpshooter": "Texas Sharpshooter",
      "no true scotsman": "No True Scotsman",
      "tu quoque": "Tu Quoque",
      "bandwagon": "Bandwagon",
      "appeal to nature": "Appeal to Nature",
      "genetic fallacy": "Genetic Fallacy",
      "cherry picking": "Cherry Picking",
      "survivorship bias": "Survivorship Bias",
      "confirmation bias": "Confirmation Bias",
      "motte-bailey": "Motte-and-Bailey",
      "motte and bailey": "Motte-and-Bailey",
      "gish gallop": "Gish Gallop",
      "equivocation": "Equivocation",
      "loaded question": "Loaded Question",
      "moving the goalposts": "Moving the Goalposts",
      "non sequitur": "Non Sequitur",
      "red herring": "Red Herring",
      "special pleading": "Special Pleading",
    };

    for (const [pattern, name] of Object.entries(fallacies)) {
      if (reasoning.includes(pattern)) {
        return name;
      }
    }

    return null;
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
