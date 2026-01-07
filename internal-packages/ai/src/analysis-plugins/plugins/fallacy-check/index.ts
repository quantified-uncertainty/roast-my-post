import {
  getGlobalSessionManager,
} from "../../../helicone/simpleSessionManager";
import { logger } from "../../../shared/logger";
import type { Comment, ToolChainResult } from "../../../shared/types";
import fallacyExtractorTool from "../../../tools/fallacy-extractor";
import fuzzyTextLocatorTool from "../../../tools/smart-text-searcher";
import fallacyReviewTool from "../../../tools/fallacy-review";
import supportedElsewhereFilterTool from "../../../tools/supported-elsewhere-filter";
import { TextChunk } from "../../TextChunk";
import type {
  AnalysisResult,
  RoutingExample,
  SimpleAnalysisPlugin,
} from "../../types";
import { LIMITS, THRESHOLDS, ISSUE_TYPES } from "./constants";
import { buildFallacyComment } from "./comments/builder";
import { FallacyIssue } from "./FallacyIssue";
import { PipelineTelemetry, PIPELINE_STAGES, type PipelineExecutionRecord } from "./telemetry";

export class FallacyCheckPlugin implements SimpleAnalysisPlugin {
  private documentText: string;
  private chunks: TextChunk[];
  private hasRun = false;
  private issues: FallacyIssue[] = [];
  private comments: Comment[] = [];
  private summary: string = "";
  private analysis: string = "";
  private processingStartTime: number = 0;
  private telemetryRecord: PipelineExecutionRecord | null = null;

  constructor() {
    // Initialize empty values - they'll be set in analyze()
    this.documentText = "";
    this.chunks = [];
  }

  name(): string {
    return "FALLACY_CHECK";
  }

  runOnAllChunks = true;

  promptForWhenToUse(): string {
    return "Use this when analyzing text for sophisticated reasoning issues, missing context, or epistemic problems. This includes: (1) Argumentative content with logical fallacies, deceptive framing, or manipulation tactics, (2) Factual/biographical content with vague claims, uncritical self-presentation, missing citations, or selective disclosure, (3) Statistical claims with potential bias or missing baselines. Skip only pure feelings/preferences with zero factual content.";
  }

  routingExamples(): RoutingExample[] {
    return [
      // Argumentative/persuasive content (original examples)
      {
        chunkText:
          "Studies show that 90% of people prefer our product over competitors",
        shouldProcess: true,
        reason:
          "Vague claim that lacks context about which studies, sample size, methodology - potential deceptive wording",
      },
      {
        chunkText:
          "The unemployment rate has decreased significantly this year",
        shouldProcess: true,
        reason:
          "Missing important context like baseline rate, time period, geographic area",
      },

      // Factual/biographical content (NEW - critical for coverage)
      {
        chunkText:
          "Over the past few years, I helped run several dozen hiring rounds for around 15 high-impact organizations",
        shouldProcess: true,
        reason:
          "Vague quantifiers ('several dozen', 'around 15'), uncritical framing ('high-impact'), missing context about success rate, role, failures",
      },
      {
        chunkText:
          "I joined the company in 2020 and led the product team to achieve incredible results",
        shouldProcess: true,
        reason:
          "Vague achievement claim ('incredible results'), missing specifics about what was achieved, team size, individual vs team contribution, selective self-presentation",
      },
      {
        chunkText:
          "Our research shows promising results in early trials",
        shouldProcess: true,
        reason:
          "Vague sourcing ('our research'), missing context (sample size, methodology), uncritical framing ('promising' without baseline)",
      },

      // Pure opinions (should skip)
      {
        chunkText:
          "I personally prefer using TypeScript for large projects",
        shouldProcess: false,
        reason: "Pure personal preference without factual claims or context that needs analysis",
      },
      {
        chunkText:
          "I'm excited to start my new role next week",
        shouldProcess: false,
        reason: "Simple statement about feelings/plans without claims requiring epistemic analysis",
      },
    ];
  }

  getToolDependencies() {
    return [
      fallacyExtractorTool,
      fuzzyTextLocatorTool,
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

    // Initialize telemetry - use local const to avoid repeated null assertions
    const telemetry = new PipelineTelemetry(documentText.length);

    try {
      // Audit log: Analysis started
      logger.info("FallacyCheckPlugin: AUDIT: Analysis started", {
        timestamp: new Date().toISOString(),
        documentLength: documentText.length,
        chunkCount: chunks.length,
        operation: "fallacy-check-analysis",
      });

      logger.info("FallacyCheckPlugin: Starting analysis (single-pass mode)");

      // Phase 1: Single-pass extraction on full document
      telemetry.startStage(PIPELINE_STAGES.EXTRACTION, 1); // 1 = full document
      const extractionResult = await this.extractIssuesFromDocument(documentText);
      const allIssues: FallacyIssue[] = extractionResult.issues;
      telemetry.endStage(allIssues.length, {
        error: extractionResult.error,
        metadata: { documentLength: documentText.length },
      });
      telemetry.setFinalCounts({ issuesExtracted: allIssues.length });

      if (extractionResult.error) {
        logger.warn(`Issue extraction completed with error: ${extractionResult.error}`);
      }

      logger.info("FallacyCheckPlugin: AUDIT: Extraction phase completed", {
        timestamp: new Date().toISOString(),
        issuesExtracted: allIssues.length,
        extractionError: extractionResult.error || null,
        phase: "extraction",
      });

      // Phase 1.5: Deduplicate issues by similar text
      telemetry.startStage(PIPELINE_STAGES.DEDUPLICATION, allIssues.length);
      const deduplicatedIssues = this.deduplicateIssues(allIssues);
      telemetry.endStage(deduplicatedIssues.length);
      telemetry.setFinalCounts({ issuesAfterDedup: deduplicatedIssues.length });

      // Phase 2: Filter out issues supported elsewhere in the document
      logger.info("FallacyCheckPlugin: AUDIT: Supported-elsewhere filter started", {
        timestamp: new Date().toISOString(),
        issuesToFilter: deduplicatedIssues.length,
        phase: "supported-elsewhere-filter",
      });

      telemetry.startStage(PIPELINE_STAGES.SUPPORTED_ELSEWHERE_FILTER, deduplicatedIssues.length);
      const filteredIssues = await this.runSupportedElsewhereFilter(
        deduplicatedIssues,
        documentText,
        telemetry
      );
      telemetry.setFinalCounts({ issuesAfterFiltering: filteredIssues.length });

      this.issues = filteredIssues;

      // Phase 3: Generate comments for all issues in parallel
      telemetry.startStage(PIPELINE_STAGES.COMMENT_GENERATION, this.issues.length);
      const allComments = await this.generateCommentsForIssues(this.issues, documentText);
      telemetry.endStage(allComments.length);
      telemetry.setFinalCounts({ commentsGenerated: allComments.length });

      // Phase 4: Review and filter comments, generate summaries
      telemetry.startStage(PIPELINE_STAGES.REVIEW, allComments.length);
      await this.reviewAndFilterComments(allComments, documentText, telemetry);

      this.hasRun = true;

      // Finalize telemetry
      this.telemetryRecord = telemetry.finalize(true);
      telemetry.logSummary();

      const totalDuration = Date.now() - this.processingStartTime;
      logger.info("FallacyCheckPlugin: AUDIT: Analysis completed", {
        timestamp: new Date().toISOString(),
        totalDurationMs: totalDuration,
        issuesFound: this.issues.length,
        commentsGenerated: this.comments.length,
        success: true,
        operation: "fallacy-check-analysis",
      });

      logger.info(
        `FallacyCheckPlugin: Analysis complete - ${this.comments.length} comments generated`
      );

      return this.getResults();
    } catch (error) {
      const totalDuration = Date.now() - this.processingStartTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Finalize telemetry with error
      this.telemetryRecord = telemetry.finalize(false, errorMessage);
      telemetry.logSummary();

      // Audit log: Analysis failed
      logger.error("FallacyCheckPlugin: AUDIT: Analysis failed", {
        timestamp: new Date().toISOString(),
        totalDurationMs: totalDuration,
        error: errorMessage,
        success: false,
        operation: "fallacy-check-analysis",
      });

      logger.error("FallacyCheckPlugin: Fatal error during analysis", error);
      // Return a partial result instead of throwing
      this.hasRun = true;
      this.summary = "Analysis failed due to an error";
      this.analysis =
        "The fallacy check analysis could not be completed due to a technical error.";
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
      cost: 0,
      // Cast to Record<string, unknown> for JSON serialization
      pipelineTelemetry: this.telemetryRecord as unknown as Record<string, unknown> | undefined,
    };
  }

  /**
   * Extract issues from the full document in a single pass.
   * This provides complete context for better accuracy and reduces false positives
   * from flagging intro claims that are supported later in the document.
   */
  private async extractIssuesFromDocument(documentText: string): Promise<{
    issues: FallacyIssue[];
    error?: string;
  }> {
    try {
      // Track tool execution if session manager is available
      const sessionManager = getGlobalSessionManager();
      const executeExtraction = async () => {
        return await fallacyExtractorTool.execute(
          {
            documentText, // Full document for single-pass analysis and location finding
          },
          {
            logger,
          }
        );
      };

      const result = sessionManager
        ? await sessionManager.trackTool(
            "extract-fallacy-issues",
            executeExtraction
          )
        : await executeExtraction();

      // Create a synthetic "chunk" representing the full document for FallacyIssue compatibility
      const fullDocChunk = new TextChunk("full-document", documentText, {
        position: { start: 0, end: documentText.length },
      });

      const issues = result.issues.map(
        (issue) => new FallacyIssue(issue, fullDocChunk, this.processingStartTime)
      );

      return {
        issues,
      };
    } catch (error) {
      logger.error("Error extracting issues from document:", error);
      return {
        issues: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private deduplicateIssues(issues: FallacyIssue[]): FallacyIssue[] {
    const seen = new Set<string>();
    const unique: FallacyIssue[] = [];

    for (const issue of issues) {
      const key = issue.text.toLowerCase().replace(/\s+/g, " ").trim();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(issue);
      }
    }

    // Calculate priority score for each issue
    // Higher score = more important to address
    const priorityScore = (issue: FallacyIssue) =>
      issue.severityScore * 0.6 + issue.importanceScore * 0.4;

    // Sort by priority score (most important issues first)
    const sortedIssues = unique.sort(
      (a, b) => priorityScore(b) - priorityScore(a)
    );

    // Limit to maximum issues if we have too many
    if (sortedIssues.length > LIMITS.MAX_ISSUES_TO_PROCESS) {
      logger.info(
        `Limiting issues from ${sortedIssues.length} to ${LIMITS.MAX_ISSUES_TO_PROCESS} based on priority scores`
      );

      // Log details about what's being kept and discarded
      const keptIssues = sortedIssues.slice(0, LIMITS.MAX_ISSUES_TO_PROCESS);
      const discardedIssues = sortedIssues.slice(LIMITS.MAX_ISSUES_TO_PROCESS);

      const avgKeptScore =
        keptIssues.reduce((sum, i) => sum + priorityScore(i), 0) /
        keptIssues.length;
      const avgDiscardedScore =
        discardedIssues.length > 0
          ? discardedIssues.reduce((sum, i) => sum + priorityScore(i), 0) /
            discardedIssues.length
          : 0;

      logger.debug(
        `Priority scores - Kept issues avg: ${avgKeptScore.toFixed(1)}, ` +
          `Discarded issues avg: ${avgDiscardedScore.toFixed(1)}`
      );

      return keptIssues;
    }

    return sortedIssues;
  }

  /**
   * Run the supported-elsewhere filter to remove false positives
   */
  private async runSupportedElsewhereFilter(
    issues: FallacyIssue[],
    documentText: string,
    telemetry: PipelineTelemetry
  ): Promise<FallacyIssue[]> {
    try {
      const filterInput = {
        documentText,
        issues: issues.map((issue) => ({
          quotedText: issue.text,
          issueType: issue.issueType,
          reasoning: issue.issue.reasoning,
          locationOffset: issue.issue.location?.startOffset,
        })),
      };

      const filterResult = await supportedElsewhereFilterTool.execute(
        filterInput,
        { logger }
      );

      // Keep only the issues that are NOT supported elsewhere
      const unsupportedIndices = new Set(
        filterResult.unsupportedIssues.map((r) => r.index)
      );
      const filteredIssues = issues.filter((_, idx) =>
        unsupportedIndices.has(idx)
      );

      // Log and record what was filtered
      const supportedCount = filterResult.supportedIssues.length;
      if (supportedCount > 0) {
        logger.info(
          `FallacyCheckPlugin: Filtered out ${supportedCount} issues (supported elsewhere in document)`
        );

        // Record filtered items with their reasoning for telemetry
        const filteredRecords = filterResult.supportedIssues.map((supported) => {
          const originalIssue = issues[supported.index];
          logger.debug(`  - Issue ${supported.index}: ${supported.explanation}`);
          return {
            stage: PIPELINE_STAGES.SUPPORTED_ELSEWHERE_FILTER,
            quotedText: originalIssue?.text || `Issue at index ${supported.index}`,
            header: originalIssue?.issueType,
            filterReason: supported.explanation,
            supportLocation: supported.supportLocation,
            originalIndex: supported.index,
          };
        });
        telemetry.recordFilteredItems(filteredRecords);
      }

      logger.info("FallacyCheckPlugin: AUDIT: Supported-elsewhere filter completed", {
        timestamp: new Date().toISOString(),
        issuesBeforeFilter: issues.length,
        issuesAfterFilter: filteredIssues.length,
        issuesFiltered: supportedCount,
        phase: "supported-elsewhere-filter",
      });

      telemetry.endStage(filteredIssues.length);
      return filteredIssues;
    } catch (error) {
      logger.warn("FallacyCheckPlugin: Supported-elsewhere filter failed, keeping all issues", error);
      telemetry.endStage(issues.length, {
        error: error instanceof Error ? error.message : String(error),
      });
      return issues;
    }
  }

  /**
   * Generate comments for all issues in parallel
   */
  private async generateCommentsForIssues(
    issues: FallacyIssue[],
    documentText: string
  ): Promise<Comment[]> {
    const commentPromises = issues.map(async (issue) => {
      // Run in next tick to ensure true parallelism
      await new Promise((resolve) => setImmediate(resolve));
      const comment = await buildFallacyComment(issue, documentText, { logger });
      // Filter out comments with empty descriptions
      if (comment?.description?.trim()) {
        return comment;
      }
      return null;
    });

    const commentResults = await Promise.all(commentPromises);
    return commentResults.filter((comment): comment is Comment => comment !== null);
  }

  /**
   * Review and filter comments, generate summaries
   */
  private async reviewAndFilterComments(
    allComments: Comment[],
    documentText: string,
    telemetry: PipelineTelemetry
  ): Promise<void> {
    try {
      const reviewComments = allComments.map((comment, index) => ({
        index,
        header: comment.header || "Epistemic Issue",
        description: comment.description,
        level: comment.level || 'warning',
        importance: comment.importance,
        quotedText: comment.highlight.quotedText,
      }));

      logger.info("FallacyCheckPlugin: AUDIT: Review phase started", {
        timestamp: new Date().toISOString(),
        commentsToReview: allComments.length,
        phase: "review",
        operation: "fallacy-review-tool",
      });

      const reviewResult = await fallacyReviewTool.execute(
        { documentText, comments: reviewComments },
        { logger }
      );

      // Filter comments based on review
      const keptIndices = new Set(reviewResult.commentIndicesToKeep);
      this.comments = reviewResult.commentIndicesToKeep.map((idx) => allComments[idx]);
      this.summary = reviewResult.oneLineSummary;
      this.analysis = reviewResult.documentSummary;

      // Record comments that were filtered by review
      const filteredComments = allComments
        .map((comment, idx) => ({ comment, idx }))
        .filter(({ idx }) => !keptIndices.has(idx));

      if (filteredComments.length > 0) {
        const filteredRecords = filteredComments.map(({ comment, idx }) => ({
          stage: PIPELINE_STAGES.REVIEW,
          quotedText: comment.highlight.quotedText,
          header: comment.header,
          filterReason: 'Filtered by review (redundant, low-value, or questionable)',
          originalIndex: idx,
        }));
        telemetry.recordFilteredItems(filteredRecords);
      }

      logger.info("FallacyCheckPlugin: AUDIT: Review phase completed", {
        timestamp: new Date().toISOString(),
        commentsReviewed: allComments.length,
        commentsKept: this.comments.length,
        commentsFiltered: allComments.length - this.comments.length,
        phase: "review",
      });

      telemetry.endStage(this.comments.length);
      telemetry.setFinalCounts({ commentsKept: this.comments.length });

      logger.info(
        `FallacyCheckPlugin: Review complete - kept ${this.comments.length}/${allComments.length} comments`
      );
    } catch (error) {
      logger.error("FallacyCheckPlugin: Review failed, using fallback", error);
      // Fallback: keep all comments and use old summary generation
      this.comments = allComments;
      const { summary, analysisSummary } = this.generateAnalysis();
      this.summary = summary;
      this.analysis = analysisSummary;

      telemetry.endStage(this.comments.length, {
        error: error instanceof Error ? error.message : String(error),
      });
      telemetry.setFinalCounts({ commentsKept: this.comments.length });
    }
  }

  private generateAnalysis(): { summary: string; analysisSummary: string } {
    const totalIssues = this.issues.length;
    const criticalIssues = this.issues.filter(
      (i) => i.severityScore >= THRESHOLDS.SEVERITY_CRITICAL
    ).length;
    const highIssues = this.issues.filter(
      (i) =>
        i.severityScore >= THRESHOLDS.SEVERITY_HIGH &&
        i.severityScore < THRESHOLDS.SEVERITY_CRITICAL
    ).length;
    const mediumIssues = this.issues.filter(
      (i) =>
        i.severityScore >= THRESHOLDS.SEVERITY_MEDIUM &&
        i.severityScore < THRESHOLDS.SEVERITY_HIGH
    ).length;
    const verifiedAccurate = this.issues.filter(
      (i) => i.issueType === ISSUE_TYPES.VERIFIED_ACCURATE
    ).length;

    // Count by issue type
    const misinformationCount = this.issues.filter(
      (i) => i.issueType === ISSUE_TYPES.MISINFORMATION
    ).length;
    const missingContextCount = this.issues.filter(
      (i) => i.issueType === ISSUE_TYPES.MISSING_CONTEXT
    ).length;
    const deceptiveWordingCount = this.issues.filter(
      (i) => i.issueType === ISSUE_TYPES.DECEPTIVE_WORDING
    ).length;

    // Calculate epistemic health score (0-100, higher is better)
    const healthScore = this.calculateHealthScore(
      criticalIssues,
      highIssues,
      mediumIssues,
      totalIssues,
      verifiedAccurate
    );
    const healthGrade = this.getHealthGrade(healthScore);

    const summary =
      totalIssues === 0
        ? "No significant epistemic issues detected"
        : `Found ${totalIssues} epistemic issue${totalIssues > 1 ? "s" : ""}` +
          (criticalIssues > 0 ? ` (${criticalIssues} critical)` : "");

    let analysisSummary = "";

    if (totalIssues === 0) {
      analysisSummary = `**Epistemic Health Score: ${healthScore}/100 (Grade: ${healthGrade})**\n\n`;
      analysisSummary +=
        "The document appears to present claims with adequate context and without obvious misinformation or deceptive framing.";
    } else {
      analysisSummary = `**Epistemic Health Score: ${healthScore}/100 (Grade: ${healthGrade})**\n\n`;
      analysisSummary += `The epistemic analysis identified ${totalIssues} potential issue${totalIssues > 1 ? "s" : ""}:\n\n`;

      if (criticalIssues > 0) {
        analysisSummary += `- **${criticalIssues} critical issue${criticalIssues > 1 ? "s" : ""}** requiring immediate attention\n`;
      }
      if (highIssues > 0) {
        analysisSummary += `- **${highIssues} high-severity issue${highIssues > 1 ? "s" : ""}** worth reviewing\n`;
      }
      if (mediumIssues > 0) {
        analysisSummary += `- ${mediumIssues} medium-severity issue${mediumIssues > 1 ? "s" : ""}\n`;
      }
      if (misinformationCount > 0) {
        analysisSummary += `- ${misinformationCount} potential misinformation issue${misinformationCount > 1 ? "s" : ""}\n`;
      }
      if (missingContextCount > 0) {
        analysisSummary += `- ${missingContextCount} claim${missingContextCount > 1 ? "s" : ""} missing critical context\n`;
      }
      if (deceptiveWordingCount > 0) {
        analysisSummary += `- ${deceptiveWordingCount} instance${deceptiveWordingCount > 1 ? "s" : ""} of potentially deceptive wording\n`;
      }
      if (verifiedAccurate > 0) {
        analysisSummary += `- ${verifiedAccurate} claim${verifiedAccurate > 1 ? "s" : ""} verified as accurate\n`;
      }

      analysisSummary +=
        "\nReview the comments for specific details and suggested improvements.";
    }

    return { summary, analysisSummary };
  }

  /**
   * Calculate epistemic health score (0-100, higher is better)
   */
  private calculateHealthScore(
    criticalIssues: number,
    highIssues: number,
    mediumIssues: number,
    totalIssues: number,
    verifiedAccurate: number
  ): number {
    // Start at 100 (perfect health)
    let score = 100;

    // Penalize for issues (weighted by severity)
    score -= criticalIssues * 25; // Critical issues are very bad
    score -= highIssues * 15; // High severity issues
    score -= mediumIssues * 8; // Medium severity issues
    score -= (totalIssues - criticalIssues - highIssues - mediumIssues) * 3; // Low severity

    // Bonus for verified accurate claims (shows good epistemic practices)
    score += verifiedAccurate * 5;

    // Clamp to 0-100 range
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Get letter grade for health score
   */
  private getHealthGrade(score: number): string {
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "F";
  }

  // Required methods from SimpleAnalysisPlugin interface
  getCost(): number {
    return 0;
  }

  getLLMInteractions(): unknown[] {
    return [];
  }

  getDebugInfo(): Record<string, unknown> {
    return {
      issuesFound: this.issues.length,
    };
  }
}

// Export the plugin class and FallacyIssue
export { FallacyIssue } from "./FallacyIssue";
