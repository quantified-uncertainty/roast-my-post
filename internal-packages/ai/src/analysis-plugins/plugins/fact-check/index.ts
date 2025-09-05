import {
  getGlobalSessionManager,
} from "../../../helicone/simpleSessionManager";
import { logger } from "../../../shared/logger";
import type {
  Comment,
  ToolChainResult,
} from "../../../shared/types";
import extractFactualClaimsTool from "../../../tools/extract-factual-claims";
import factCheckerTool from "../../../tools/fact-checker";
import { TextChunk } from "../../TextChunk";
import type {
  AnalysisResult,
  RoutingExample,
  SimpleAnalysisPlugin,
} from "../../types";
import { CommentBuilder } from "../../utils/CommentBuilder";
import {
  LIMITS,
  THRESHOLDS,
} from "./constants";
import { buildFactComment } from "./comments/builder";
import { generateAnalysis } from "./analysis/generator";
import { VerifiedFact } from "./VerifiedFact";

export class FactCheckPlugin implements SimpleAnalysisPlugin {
  private documentText: string;
  private chunks: TextChunk[];
  private hasRun = false;
  private facts: VerifiedFact[] = [];
  private comments: Comment[] = [];
  private summary: string = "";
  private analysis: string = "";
  private processingStartTime: number = 0;
  static readonly alwaysRun = false;

  constructor() {
    // Initialize empty values - they'll be set in analyze()
    this.documentText = "";
    this.chunks = [];
  }

  name(): string {
    return "FACT_CHECK";
  }

  promptForWhenToUse(): string {
    return "Use this when the document makes specific factual claims that can be verified or when checking for accuracy of statements.";
  }

  routingExamples(): RoutingExample[] {
    return [
      {
        chunkText:
          "The global population reached 8 billion in 2022, marking a significant milestone",
        shouldProcess: true,
        reason: "Contains specific factual claim about population statistics",
      },
      {
        chunkText:
          "Many people believe that climate change is an important issue",
        shouldProcess: false,
        reason: "Opinion statement without specific verifiable facts",
      },
      {
        chunkText: "The unemployment rate dropped to 3.5% in December 2023",
        shouldProcess: true,
        reason: "Contains specific economic statistic that can be verified",
      },
    ];
  }

  async analyze(
    chunks: TextChunk[],
    documentText: string
  ): Promise<AnalysisResult> {
    // Store the inputs
    this.processingStartTime = Date.now();
    this.documentText = documentText;
    this.chunks = chunks;

    if (this.hasRun) {
      return this.getResults();
    }

    try {
      logger.info("FactCheckPlugin: Starting analysis");
      logger.info(`FactCheckPlugin: Processing ${chunks.length} chunks`);
      // Phase 1: Extract factual claims from all chunks in parallel
      const extractionPromises = this.chunks.map((chunk) =>
        this.extractFactsFromChunk(chunk)
      );

      const extractionResults = await Promise.allSettled(extractionPromises);

      // Collect all extracted facts and track errors
      const allFacts: VerifiedFact[] = [];
      const extractionErrors: string[] = [];

      for (const result of extractionResults) {
        if (result.status === "fulfilled" && result.value) {
          allFacts.push(...result.value.facts);
          if (result.value.error) {
            extractionErrors.push(result.value.error);
          }
        } else if (result.status === "rejected") {
          const error =
            result.reason instanceof Error
              ? result.reason.message
              : "Unknown extraction error";
          extractionErrors.push(error);
          logger.warn(`Fact extraction failed for chunk: ${error}`);
        }
      }

      // Log summary of errors if any occurred
      if (extractionErrors.length > 0) {
        logger.warn(
          `Fact extraction completed with ${extractionErrors.length} errors`
        );
      }

      // Deduplicate facts by similar text
      this.facts = this.deduplicateFacts(allFacts);

      // Phase 2: Verify high-priority facts
      const factsToVerify = this.facts
        .filter((fact) => fact.shouldVerify())
        .slice(0, LIMITS.MAX_FACTS_TO_VERIFY);

      if (factsToVerify.length > 0) {
        await this.verifyFacts(factsToVerify);
      }

      // Phase 3: Generate comments for all facts in parallel
      const commentPromises = this.facts.map(async (fact) => {
        // Run in next tick to ensure true parallelism
        await new Promise((resolve) => setImmediate(resolve));
        const comment = await buildFactComment(fact, documentText, { logger });
        // Filter out comments with empty descriptions
        if (
          comment &&
          comment.description &&
          comment.description.trim() !== ""
        ) {
          return comment;
        }
        return null;
      });

      const commentResults = await Promise.all(commentPromises);
      const regularComments: Comment[] = commentResults.filter(
        (comment): comment is Comment => comment !== null
      );

      // Generate debug comments for facts that were not investigated
      const debugComments = await this.generateDebugComments(documentText);

      // Combine regular and debug comments
      const comments: Comment[] = [
        ...regularComments,
        ...debugComments.filter((c) => c !== null),
      ];
      // Store results for later retrieval
      this.comments = comments;

      // Phase 4: Generate analysis summary
      const { summary, analysisSummary } = this.generateAnalysis();
      this.summary = summary;
      this.analysis = analysisSummary;

      this.hasRun = true;
      logger.info(
        `FactCheckPlugin: Analysis complete - ${this.comments.length} comments generated`
      );

      return this.getResults();
    } catch (error) {
      logger.error("FactCheckPlugin: Fatal error during analysis", error);
      // Return a partial result instead of throwing
      this.hasRun = true;
      this.summary = "Analysis failed due to an error";
      this.analysis =
        "The fact-checking analysis could not be completed due to a technical error.";
      return this.getResults();
    }
  }

  public getResults(): AnalysisResult {
    if (!this.hasRun) {
      throw new Error("Analysis has not been run yet. Call analyze() first.");
    }

    return {
      summary: this.summary,
      analysis: this.analysis,
      comments: this.comments,
      cost: 0, // Cost tracking removed
    };
  }

  private async extractFactsFromChunk(chunk: TextChunk): Promise<{
    facts: VerifiedFact[];
    error?: string;
  }> {
    try {
      // Track tool execution if session manager is available
      const sessionManager = getGlobalSessionManager();
      const executeExtraction = async () => {
        return await extractFactualClaimsTool.execute(
          {
            text: chunk.text,
            minQualityThreshold: THRESHOLDS.MIN_QUALITY_THRESHOLD,
            maxClaims: LIMITS.MAX_CLAIMS_PER_CHUNK,
          },
          {
            logger,
          }
        );
      };

      const result = sessionManager
        ? await sessionManager.trackTool(
            "extract-factual-claims",
            executeExtraction
          )
        : await executeExtraction();

      const facts = result.claims.map(
        (claim) => new VerifiedFact(claim, chunk, this.processingStartTime)
      );

      return {
        facts,
      };
    } catch (error) {
      logger.error("Error extracting facts from chunk:", error);
      // Return empty result but include error info for debugging
      return {
        facts: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private deduplicateFacts(facts: VerifiedFact[]): VerifiedFact[] {
    const seen = new Set<string>();
    const unique: VerifiedFact[] = [];

    for (const fact of facts) {
      const key = fact.text.toLowerCase().replace(/\s+/g, " ").trim();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(fact);
      }
    }

    // Sort by average score
    return unique.sort((a, b) => b.averageScore - a.averageScore);
  }

  private async verifyFacts(facts: VerifiedFact[]): Promise<void> {
    // Verify facts in parallel for better performance
    const verificationPromises = facts.map((fact) =>
      this.verifySingleFact(fact)
    );
    await Promise.allSettled(verificationPromises);
  }

  private shouldUsePerplexityResearch(fact: VerifiedFact): boolean {
    // Use Perplexity research for high-priority claims that need verification

    // 1. High importance claims (likely core to the document's argument)
    const isHighImportance =
      fact.claim.importanceScore >= THRESHOLDS.IMPORTANCE_HIGH;

    // 2. Claims with low truth probability (likely false, need evidence to refute)
    const isLikelyFalse =
      fact.claim.truthProbability <= THRESHOLDS.TRUTH_PROBABILITY_VERY_LOW;

    // 3. Uncertain but important claims (need evidence to confirm/deny)
    const isUncertainButImportant =
      fact.claim.importanceScore >= THRESHOLDS.IMPORTANCE_MEDIUM &&
      fact.claim.truthProbability >= 40 &&
      fact.claim.truthProbability <= 70;

    // 4. Highly checkable claims with questionable truth (easy to verify)
    const isEasilyVerifiable =
      fact.claim.checkabilityScore >= THRESHOLDS.CHECKABILITY_HIGH &&
      fact.claim.truthProbability <= THRESHOLDS.TRUTH_PROBABILITY_MEDIUM;

    // Use research if any of these conditions are met
    const shouldResearch =
      isHighImportance ||
      isLikelyFalse ||
      isUncertainButImportant ||
      isEasilyVerifiable;

    logger.debug(
      `[FactCheck] Research decision for "${fact.text.substring(0, 50)}...": ${shouldResearch}`,
      {
        importance: fact.claim.importanceScore,
        checkability: fact.claim.checkabilityScore,
        truthProbability: fact.claim.truthProbability,
        isHighImportance,
        isLikelyFalse,
        isUncertainButImportant,
        isEasilyVerifiable,
      }
    );

    return shouldResearch;
  }

  private async verifySingleFact(fact: VerifiedFact): Promise<void> {
    try {
      // Decide whether to use Perplexity research based on claim characteristics
      const shouldResearch = this.shouldUsePerplexityResearch(fact);

      if (shouldResearch) {
        logger.info(
          `[FactCheck] Using Perplexity research for high-priority claim: "${fact.text.substring(0, 100)}..."`
        );
      }

      // Gather contextual information for better fact-checking
      const context = await fact.gatherContext(this.documentText);

      // Track tool execution if session manager is available
      const sessionManager = getGlobalSessionManager();
      const executeFactCheck = async () => {
        return await factCheckerTool.execute(
          {
            claim: fact.text, // Use the normalized claim text for fact-checking
            context,
            searchForEvidence: shouldResearch,
          },
          {
            logger,
          }
        );
      };

      const result = sessionManager
        ? await sessionManager.trackTool("fact-checker", executeFactCheck)
        : await executeFactCheck();

      fact.verification = result.result;
      fact.factCheckerOutput = result; // Store full output including Perplexity data
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown verification error";
      logger.error(`Error verifying fact "${fact.text}": ${errorMessage}`);
      // Store error info on the fact for debugging
      fact.verification = {
        verdict: "unverifiable",
        confidence: "low",
        explanation: `Verification failed: ${errorMessage}`,
        corrections: undefined,
        displayCorrection: undefined,
        sources: [],
      };
    }
  }

  private async generateDebugComments(
    documentText: string
  ): Promise<(Comment | null)[]> {
    const debugComments: (Comment | null)[] = [];

    // IMPORTANT: We now handle skipped facts in the regular comment flow,
    // so we only need debug comments for facts that couldn't be located.
    // This avoids creating duplicate comments.

    // Debug comments ONLY for facts that couldn't be located
    for (const fact of this.facts) {
      const location = await fact.findLocation(documentText);
      if (!location) {
        const debugComment = await this.createLocationDebugComment(
          fact,
          documentText
        );
        if (debugComment) {
          debugComments.push(debugComment);
        }
      }
    }

    return debugComments;
  }

  private async createLocationDebugComment(
    fact: VerifiedFact,
    _documentText: string
  ): Promise<Comment | null> {
    const toolChain: ToolChainResult[] = [
      {
        toolName: "extractCheckableClaims",
        stage: "extraction",
        timestamp: new Date(this.processingStartTime + 30).toISOString(),
        result: fact.claim,
      },
      {
        toolName: "findLocation",
        stage: "enhancement",
        timestamp: new Date().toISOString(),
        result: { status: "failed", reason: "text_not_found" },
      },
    ];

    // Use a default position since we can't locate the text
    const location = {
      startOffset: 0,
      endOffset: fact.text.length,
      quotedText: fact.text,
    };

    return CommentBuilder.build({
      plugin: "fact-check",
      location,
      chunkId: fact.getChunk().id,
      processingStartTime: this.processingStartTime,
      toolChain,

      header: `Fact claim location not found`,
      level: "debug" as const,
      description: `The fact-checker found this claim but couldn't locate it precisely in the document: "${fact.text}". This might be due to text paraphrasing or formatting differences between extraction and document structure.`,
    });
  }

  private generateAnalysis(): { summary: string; analysisSummary: string } {
    return generateAnalysis(this.facts);
  }

  // Required methods from SimpleAnalysisPlugin interface
  getCost(): number {
    return 0; // Cost tracking removed
  }

  getLLMInteractions(): unknown[] {
    return []; // LLM interaction tracking removed
  }

  getDebugInfo(): Record<string, unknown> {
    const verificationErrors = this.facts.filter(
      (f) =>
        f.verification?.verdict === "unverifiable" &&
        f.verification?.explanation?.includes("Verification failed")
    ).length;

    return {
      factsFound: this.facts.length,
      factsVerified: this.facts.filter((f) => f.verification).length,
      factsWithErrors: verificationErrors,
      errorRate:
        this.facts.length > 0
          ? ((verificationErrors / this.facts.length) * 100).toFixed(1) + "%"
          : "0%",
    };
  }
}

// Export the plugin class and VerifiedFact
export { VerifiedFact } from "./VerifiedFact";
