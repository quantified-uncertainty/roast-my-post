import { logger } from "../../../shared/logger";
import type { DocumentLocation } from "../../../shared/types";
import type {
  ExtractedFactualClaim,
} from "../../../tools/factual-claims-extractor";
import type {
  FactCheckerOutput,
  FactCheckResult,
} from "../../../tools/fact-checker";
import fuzzyTextLocatorTool from "../../../tools/smart-text-searcher";
import type { ToolContext } from "../../../tools/base/Tool";
import { TextChunk } from "../../TextChunk";
import { THRESHOLDS } from "./constants";

// Domain model for fact with verification
export class VerifiedFact {
  public claim: ExtractedFactualClaim;
  private chunk: TextChunk;
  public verification?: FactCheckResult;
  public factCheckerOutput?: FactCheckerOutput; // Store full fact-checker output including Perplexity data
  private processingStartTime: number;

  constructor(
    claim: ExtractedFactualClaim,
    chunk: TextChunk,
    processingStartTime: number
  ) {
    this.claim = claim;
    this.chunk = chunk;
    this.processingStartTime = processingStartTime;
  }

  get text(): string {
    // Use the normalized claim text for fact-checking
    return this.claim.claim;
  }

  get originalText(): string {
    // Keep exactText for display purposes
    return this.claim.exactText;
  }

  getChunk(): TextChunk {
    return this.chunk;
  }

  get averageScore(): number {
    return (this.claim.importanceScore + this.claim.checkabilityScore) / 2;
  }

  shouldVerify(): boolean {
    // Prioritize verifying:
    // 1. Important claims with low truth probability (likely false)
    // 2. Important claims that are uncertain (50-70% truth probability)
    // 3. Very checkable claims with questionable truth

    const isImportant =
      this.claim.importanceScore >= THRESHOLDS.IMPORTANCE_MEDIUM;
    const isCheckable =
      this.claim.checkabilityScore >= THRESHOLDS.CHECKABILITY_HIGH;
    const isQuestionable =
      this.claim.truthProbability <= THRESHOLDS.TRUTH_PROBABILITY_MEDIUM;
    const isLikelyFalse =
      this.claim.truthProbability <= THRESHOLDS.TRUTH_PROBABILITY_VERY_LOW;

    return (
      (isImportant && isQuestionable) ||
      (isCheckable && isLikelyFalse) ||
      this.claim.importanceScore >= THRESHOLDS.IMPORTANCE_HIGH
    ); // Always check critical claims
  }

  isHighValue(): boolean {
    const isImportant =
      this.claim.importanceScore >= THRESHOLDS.IMPORTANCE_MEDIUM;
    const isCheckable =
      this.claim.checkabilityScore >= THRESHOLDS.CHECKABILITY_HIGH;
    const isQuestionable =
      this.claim.truthProbability <= THRESHOLDS.TRUTH_PROBABILITY_MEDIUM;
    const isLikelyFalse =
      this.claim.truthProbability <= THRESHOLDS.TRUTH_PROBABILITY_LIKELY_FALSE;

    return (
      (isImportant && isQuestionable) ||
      (isCheckable && isLikelyFalse) ||
      this.claim.importanceScore >= THRESHOLDS.IMPORTANCE_HIGH
    ); // Always check critical claims
  }

  async findLocation(documentText: string): Promise<DocumentLocation | null> {
    // Use the highlight data from extraction if available
    if (this.claim.highlight && this.claim.highlight.isValid) {
      // Convert chunk-relative offsets to document-absolute offsets
      const chunkStart = this.chunk.metadata?.position?.start || 0;
      const absoluteStart = chunkStart + this.claim.highlight.startOffset;
      const absoluteEnd = chunkStart + this.claim.highlight.endOffset;

      // Verify the text at this location matches what we expect
      const textAtLocation = documentText.substring(absoluteStart, absoluteEnd);
      if (textAtLocation !== this.claim.highlight.quotedText) {
        logger.warn(
          `[FactCheck] Text mismatch at calculated location for claim: "${this.claim.highlight.quotedText.substring(0, 50)}..."`,
          {
            expected: this.claim.highlight.quotedText.substring(0, 100),
            found: textAtLocation.substring(0, 100),
            chunkStart,
            relativeStart: this.claim.highlight.startOffset,
            absoluteStart,
          }
        );
        // Location is invalid if text doesn't match
        return null;
      }

      return {
        startOffset: absoluteStart,
        endOffset: absoluteEnd,
        quotedText: this.claim.highlight.quotedText,
      };
    }

    // No valid highlight - give up
    return null;
  }

  /**
   * Find the specific error span for simple corrections like "2008 → 2007"
   * Returns the location of just the incorrect part, not the full claim
   */
  private async findErrorSpan(documentText: string): Promise<DocumentLocation | null> {
    // Only works if we have a correction in "X → Y" format or XML format
    const correction = this.verification?.displayCorrection;
    if (!correction) return null;
    const arrowMatch = correction.match(/^(.+?)\s*→\s*(.+)$/);
    if (!arrowMatch) return null;
    
    const [, wrongValue] = arrowMatch;
    const wrongValueTrimmed = wrongValue.trim();
    
    // Find the wrong value within our claim's location
    const fullLocation = await this.findLocation(documentText);
    if (!fullLocation || fullLocation.startOffset === undefined || fullLocation.endOffset === undefined) {
      return null;
    }
    
    // Search for wrong value within the highlighted text
    const claimText = documentText.substring(fullLocation.startOffset, fullLocation.endOffset);
    const errorIndex = claimText.indexOf(wrongValueTrimmed);
    
    if (errorIndex !== -1) {
      return {
        startOffset: fullLocation.startOffset + errorIndex,
        endOffset: fullLocation.startOffset + errorIndex + wrongValueTrimmed.length,
        quotedText: wrongValueTrimmed,
      };
    }
    
    return null; // Fallback to full claim
  }

  /**
   * Find the critical text using fuzzy text locator for robust matching
   * This works for ALL claims, not just false ones
   */
  private async findCriticalTextSpan(documentText: string, criticalText: string, context: ToolContext): Promise<DocumentLocation | null> {
    // Use the fuzzy text locator tool for robust text finding
    try {
      const locationResult = await fuzzyTextLocatorTool.execute(
        {
          documentText,
          searchText: criticalText.trim(),
          options: {
            normalizeQuotes: true,
            partialMatch: false,
            useLLMFallback: true, // Let it use LLM for tricky cases
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
        `[FactCheck] Failed to find critical text "${criticalText}" using fuzzy locator`,
        { error: error instanceof Error ? error.message : String(error) }
      );
    }

    return null;
  }

  /**
   * Find precise location for highlighting - prefers critical text over error spans over full claim
   */
  async findPreciseLocation(documentText: string, context: ToolContext): Promise<DocumentLocation | null> {
    // First priority: Use criticalText (works for ALL claims)
    if (this.verification?.criticalText) {
      const criticalLocation = await this.findCriticalTextSpan(documentText, this.verification.criticalText, context);
      if (criticalLocation) {
        return criticalLocation;
      }
    }
    
    // Second priority: Pattern matching for false claims (keep as fallback)
    if (this.verification?.verdict === 'false') {
      const errorSpan = await this.findErrorSpan(documentText);
      if (errorSpan) {
        return errorSpan;
      }
    }
    
    // Final fallback: Full claim location
    return this.findLocation(documentText);
  }

  // Getters for analysis
  public getProcessingStartTime(): number {
    return this.processingStartTime;
  }

  public getProcessingTime(): number {
    return Date.now() - this.processingStartTime;
  }

  public isVerified(): boolean {
    return this.verification !== undefined;
  }

  public isDisputed(): boolean {
    return (
      this.verification?.verdict === "false" ||
      this.verification?.verdict === "partially-true"
    );
  }

  public needsCorrection(): boolean {
    return this.verification?.verdict === "false";
  }

  public getCorrection(): string | undefined {
    return (
      this.verification?.displayCorrection || this.verification?.corrections
    );
  }

  /**
   * Gather surrounding text context for fact-checking
   */
  public async gatherContext(
    documentText: string,
    windowSize: number = 300
  ): Promise<string> {
    // Get the claim's position in the full document
    const location = await this.findLocation(documentText);

    if (
      location &&
      location.startOffset !== undefined &&
      location.endOffset !== undefined
    ) {
      // Extract from FULL document, not chunk
      const start = Math.max(0, location.startOffset - windowSize);
      const end = Math.min(
        documentText.length,
        location.endOffset + windowSize
      );
      let context = documentText.substring(start, end);

      // Add ellipsis if truncated
      if (start > 0) context = "..." + context;
      if (end < documentText.length) context += "...";

      return `<surrounding_context>
${context}
</surrounding_context>`;
    }

    // Fallback: use chunk if we can't locate in document
    return `<surrounding_context>
${this.chunk.text}
</surrounding_context>`;
  }
}
