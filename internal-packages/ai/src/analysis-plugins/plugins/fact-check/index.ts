import { logger } from "../../../shared/logger";
import type {
  Comment,
  DocumentLocation,
  ToolChainResult,
} from "../../../shared/types";
import type { ExtractedFactualClaim } from "../../../tools/extract-factual-claims";
import extractFactualClaimsTool from "../../../tools/extract-factual-claims";
import type { FactCheckResult } from "../../../tools/fact-checker";
import factCheckerTool from "../../../tools/fact-checker";
import { TextChunk } from "../../TextChunk";
import type {
  AnalysisResult,
  LLMInteraction,
  RoutingExample,
  SimpleAnalysisPlugin,
} from "../../types";
import { CommentBuilder } from "../../utils/CommentBuilder";
import { COSTS, LIMITS, THRESHOLDS } from "./constants";

// Domain model for fact with verification
export class VerifiedFact {
  public claim: ExtractedFactualClaim;
  private chunk: TextChunk;
  public verification?: FactCheckResult;
  public factCheckerOutput?: any; // Store full fact-checker output including Perplexity data
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
    return this.claim.originalText;
  }

  get originalText(): string {
    return this.claim.originalText;
  }

  get topic(): string {
    return this.claim.topic;
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

  async findLocation(documentText: string): Promise<DocumentLocation | null> {
    // Use the chunk's method to find text and convert to absolute position
    const result = await this.chunk.findTextAbsolute(this.originalText, {
      normalizeQuotes: true, // Handle quote variations
      partialMatch: true, // Facts can be partial matches
      useLLMFallback: true, // Enable LLM fallback for paraphrased text
      pluginName: "fact-check",
      documentText: documentText, // Pass for position verification
    });

    return result;
  }

  async toComment(documentText: string): Promise<Comment | null> {
    const location = await this.findLocation(documentText);
    if (!location) return null;

    // Build tool chain results
    const toolChain: ToolChainResult[] = [
      {
        toolName: "extractCheckableClaims",
        stage: "extraction",
        timestamp: new Date(this.processingStartTime + 30).toISOString(),
        result: this.claim,
      },
    ];

    // Add fact checking tool results if verification was done
    if (this.factCheckerOutput) {
      toolChain.push({
        toolName: "factCheckWithPerplexity",
        stage: "verification",
        timestamp: new Date(this.processingStartTime + 500).toISOString(),
        result: this.factCheckerOutput,
      });
    }

    if (this.verification) {
      toolChain.push({
        toolName: "verifyClaimWithLLM",
        stage: "enhancement",
        timestamp: new Date().toISOString(),
        result: this.verification,
      });
    }

    return CommentBuilder.build({
      plugin: "fact-check",
      location,
      chunkId: this.chunk.id,
      processingStartTime: this.processingStartTime,
      toolChain,

      // Clean semantic description - include sources if available
      description: this.buildDescription(),

      // Structured content
      header: this.buildTitle(),
      level: this.getLevel(),
      observation: this.buildObservation(),
      significance: this.buildSignificance(),
      grade: this.buildGrade(),
    });
  }

  private buildDescription(): string {
    let description =
      this.verification?.explanation ||
      `Fact-check analysis of: ${this.claim.topic}`;

    // Add sources if available from Perplexity research
    if (this.verification?.sources && this.verification.sources.length > 0) {
      description += "\n\nSources:";
      this.verification.sources.forEach((source, index) => {
        description += `\n${index + 1}. ${source.title || "Source"} - ${source.url}`;
      });
    }

    return description;
  }

  private buildTitle(): string {
    const verdict = this.verification?.verdict;
    const confidence = this.verification?.confidence;

    // Use concise verdict with emoji
    let header = "";
    if (verdict === "false") {
      header = "False";
    } else if (verdict === "partially-true") {
      header = "Partially true";
    } else if (verdict === "true") {
      header = "Verified";
    } else if (verdict === "unverifiable") {
      header = "Unverifiable";
    } else {
      header = "Needs verification";
    }

    // Add confidence if available
    if (confidence && verdict !== "unverifiable") {
      header += ` (${confidence} confidence)`;
    }

    // Add concise correction if false
    if (verdict === "false" && this.verification?.conciseCorrection) {
      header += `: ${this.verification.conciseCorrection}`;
    }

    return header;
  }

  private getLevel(): "error" | "warning" | "info" | "success" {
    const verdict = this.verification?.verdict;
    if (verdict === "false") return "error";
    if (verdict === "partially-true") return "warning";
    if (verdict === "true") return "success";
    return "info";
  }

  private buildObservation(): string | undefined {
    if (this.verification) {
      return this.verification.explanation;
    }
    if (this.claim.truthProbability <= 50) {
      return `This claim appears questionable (${this.claim.truthProbability}% truth probability)`;
    }
    return undefined;
  }

  private buildSignificance(): string | undefined {
    if (
      this.verification?.verdict === "false" &&
      this.claim.importanceScore >= 8
    ) {
      return "High-importance false claim";
    }
    if (this.verification?.verdict === "false") {
      return "False claim identified";
    }
    if (this.verification?.verdict === "partially-true") {
      return "Claim with missing context or nuances";
    }
    if (this.claim.importanceScore >= 8 && !this.verification) {
      return "This is a key claim that should be verified with credible sources";
    }
    return undefined;
  }

  private buildGrade(): number | undefined {
    if (this.verification?.verdict === "false") {
      return 0.2; // Low grade for false claims
    }
    if (
      this.verification?.verdict === "true" &&
      this.verification.confidence === "high"
    ) {
      return 0.9; // High grade for verified true claims
    }
    return undefined;
  }
}

export class FactCheckPlugin implements SimpleAnalysisPlugin {
  private documentText: string;
  private chunks: TextChunk[];
  private hasRun = false;
  private facts: VerifiedFact[] = [];
  private comments: Comment[] = [];
  private summary: string = "";
  private analysis: string = "";
  private llmInteractions: LLMInteraction[] = [];
  private totalCost: number = 0;
  private processingStartTime: number = 0;

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
          if (result.value.llmInteraction) {
            this.llmInteractions.push(
              this.convertRichToLLMInteraction(result.value.llmInteraction)
            );
          }
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
        .slice(0, LIMITS.MAX_FACTS_TO_VERIFY); // Limit for cost management

      if (factsToVerify.length > 0) {
        await this.verifyFacts(factsToVerify);
      }

      // Phase 3: Generate comments for all facts in parallel
      const commentPromises = this.facts.map(async (fact) => {
        // Run in next tick to ensure true parallelism
        await new Promise((resolve) => setImmediate(resolve));
        const comment = await fact.toComment(documentText);
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
      const comments: Comment[] = commentResults.filter(
        (comment): comment is Comment => comment !== null
      );

      // Sort comments by importance
      comments.sort((a, b) => (b.importance || 0) - (a.importance || 0));

      // Store results for later retrieval
      this.comments = comments;

      // Phase 4: Generate analysis summary
      const { summary, analysisSummary } = this.generateAnalysis();
      this.summary = summary;
      this.analysis = analysisSummary;
      this.totalCost = this.calculateCost();

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
      cost: this.totalCost,
    };
  }

  private async extractFactsFromChunk(chunk: TextChunk): Promise<{
    facts: VerifiedFact[];
    llmInteraction?: any;
    error?: string;
  }> {
    try {
      const result = await extractFactualClaimsTool.execute(
        {
          text: chunk.text,
          minQualityThreshold: THRESHOLDS.MIN_QUALITY_THRESHOLD,
          maxClaims: LIMITS.MAX_CLAIMS_PER_CHUNK,
        },
        {
          logger,
        }
      );

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

      const result = await factCheckerTool.execute(
        {
          claim: fact.text,
          context: `Topic: ${fact.topic}, Importance: ${fact.claim.importanceScore}/100, Initial truth estimate: ${fact.claim.truthProbability}%`,
          searchForEvidence: shouldResearch,
        },
        {
          logger,
        }
      );

      fact.verification = result.result;
      fact.factCheckerOutput = result; // Store full output including Perplexity data
      this.llmInteractions.push(
        this.convertRichToLLMInteraction(result.llmInteraction)
      );
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
        conciseCorrection: undefined,
        sources: [],
      };
    }
  }

  private convertRichToLLMInteraction(rich: any): LLMInteraction {
    return {
      messages: [
        { role: "user" as const, content: rich.prompt },
        { role: "assistant" as const, content: rich.response },
      ],
      usage: {
        input_tokens: rich.tokensUsed?.prompt || 0,
        output_tokens: rich.tokensUsed?.completion || 0,
        prompt_tokens: rich.tokensUsed?.prompt || 0,
        completion_tokens: rich.tokensUsed?.completion || 0,
        total_tokens: rich.tokensUsed?.total || 0,
      },
    };
  }

  private calculateCost(): number {
    // Estimate based on token usage
    const totalTokens = this.llmInteractions.reduce((sum, interaction) => {
      return (
        sum + (interaction.usage.input_tokens + interaction.usage.output_tokens)
      );
    }, 0);

    // Rough estimate: $0.01 per 1000 tokens
    return totalTokens * COSTS.COST_PER_TOKEN;
  }

  private generateAnalysis(): { summary: string; analysisSummary: string } {
    const totalFacts = this.facts.length;
    const verifiedFacts = this.facts.filter((f) => f.verification).length;
    const researchedFacts = this.facts.filter(
      (f) => f.factCheckerOutput?.perplexityData
    ).length;
    const trueFacts = this.facts.filter(
      (f) => f.verification?.verdict === "true"
    ).length;
    const falseFacts = this.facts.filter(
      (f) => f.verification?.verdict === "false"
    ).length;
    const partiallyTrueFacts = this.facts.filter(
      (f) => f.verification?.verdict === "partially-true"
    ).length;

    const highImportanceFacts = this.facts.filter(
      (f) => f.claim.importanceScore >= 70
    ).length;
    const likelyFalseFacts = this.facts.filter(
      (f) => f.claim.truthProbability <= 40
    ).length;
    const uncertainFacts = this.facts.filter(
      (f) => f.claim.truthProbability > 40 && f.claim.truthProbability <= 70
    ).length;

    const summary = `Found ${totalFacts} factual claims: ${verifiedFacts} verified (${trueFacts} true, ${falseFacts} false, ${partiallyTrueFacts} partially true)${researchedFacts > 0 ? `, ${researchedFacts} researched` : ""}`;

    const topicStats = this.facts.reduce(
      (acc, fact) => {
        acc[fact.topic] = (acc[fact.topic] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const analysisSummary = `
## Fact Check Analysis

**Overview**: Extracted and analyzed ${totalFacts} factual claims from the document.

**Verification Results** (${verifiedFacts} claims verified${researchedFacts > 0 ? `, ${researchedFacts} with external research 🔍` : ""}):
- True: ${trueFacts} claims
- False: ${falseFacts} claims
- Partially True: ${partiallyTrueFacts} claims
- Unverified: ${totalFacts - verifiedFacts} claims

**Claim Characteristics**:
- High importance claims: ${highImportanceFacts}
- Likely false (≤40% truth probability): ${likelyFalseFacts}
- Uncertain (41-70% truth probability): ${uncertainFacts}
- Average quality score: ${Math.round(this.facts.reduce((sum, f) => sum + f.averageScore, 0) / totalFacts || 0)}

**Topics Covered**: ${Object.entries(topicStats)
      .sort((a, b) => b[1] - a[1])
      .map(([topic, count]) => `${topic} (${count})`)
      .join(", ")}

${falseFacts > 0 ? `\n**⚠️ Accuracy Concerns**: Found ${falseFacts} false claims that should be corrected.` : ""}
${likelyFalseFacts > 3 && verifiedFacts === 0 ? `\n**⚠️ Initial Assessment**: Multiple claims appear questionable based on truth probability estimates.` : ""}
${uncertainFacts > totalFacts / 2 ? `\n**Note**: Many claims in this document are uncertain and would benefit from citations.` : ""}
    `.trim();

    return { summary, analysisSummary };
  }

  // Required methods from SimpleAnalysisPlugin interface
  getCost(): number {
    return this.totalCost;
  }

  getLLMInteractions(): LLMInteraction[] {
    return this.llmInteractions;
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
      llmCallCount: this.llmInteractions.length,
      topTopics: this.facts.reduce(
        (acc, fact) => {
          acc[fact.topic] = (acc[fact.topic] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      errorRate:
        this.facts.length > 0
          ? ((verificationErrors / this.facts.length) * 100).toFixed(1) + "%"
          : "0%",
    };
  }
}

// Export the plugin class for backward compatibility
export { FactCheckPlugin as FactCheckAnalyzerJob };
