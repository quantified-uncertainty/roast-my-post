import type { ExtractedFactualClaim } from '../../../tools/extract-factual-claims';
import type { FactCheckerOutput, FactCheckResult } from '../../../tools/fact-checker';
import { TextChunk } from '../../TextChunk';
import type { DocumentLocation } from '../../../shared/types';
import { logger } from '../../../shared/logger';
import { THRESHOLDS } from './constants';

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

  get topic(): string {
    return this.claim.topic;
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
    const isImportant = this.claim.importanceScore >= THRESHOLDS.IMPORTANCE_MEDIUM;
    const isCheckable = this.claim.checkabilityScore >= THRESHOLDS.CHECKABILITY_HIGH;
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
      this.verification?.verdict === 'false' ||
      this.verification?.verdict === 'partially-true'
    );
  }

  public needsCorrection(): boolean {
    return this.verification?.verdict === 'false';
  }

  public getCorrection(): string | undefined {
    return this.verification?.conciseCorrection || this.verification?.corrections;
  }
}