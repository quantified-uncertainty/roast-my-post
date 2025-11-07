import {
  getGlobalSessionManager,
} from "../../../helicone/simpleSessionManager";
import { logger } from "../../../shared/logger";
import type { Comment, ToolChainResult } from "../../../shared/types";
import epistemicIssuesExtractorTool from "../../../tools/epistemic-issues-extractor";
import { detectGenre, getGenreDisplayName } from "../../../tools/epistemic-issues-extractor/genre-detection";
import type { DocumentGenre } from "../../../tools/epistemic-issues-extractor/types";
import perplexityResearcherTool from "../../../tools/perplexity-researcher";
import fuzzyTextLocatorTool from "../../../tools/smart-text-searcher";
import { TextChunk } from "../../TextChunk";
import type {
  AnalysisResult,
  RoutingExample,
  SimpleAnalysisPlugin,
} from "../../types";
import { LIMITS, THRESHOLDS, ISSUE_TYPES } from "./constants";
import { buildEpistemicComment } from "./comments/builder";
import { EpistemicIssue } from "./EpistemicIssue";

export class EpistemicCriticPlugin implements SimpleAnalysisPlugin {
  private documentText: string;
  private chunks: TextChunk[];
  private hasRun = false;
  private issues: EpistemicIssue[] = [];
  private comments: Comment[] = [];
  private summary: string = "";
  private analysis: string = "";
  private processingStartTime: number = 0;
  private documentGenre: DocumentGenre | null = null;

  constructor() {
    // Initialize empty values - they'll be set in analyze()
    this.documentText = "";
    this.chunks = [];
  }

  name(): string {
    return "EPISTEMIC_CRITIC";
  }

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
      epistemicIssuesExtractorTool,
      perplexityResearcherTool,
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

    try {
      // Detect document genre for context-aware analysis
      this.documentGenre = detectGenre(documentText);
      logger.info(`EpistemicCriticPlugin: Detected genre: ${getGenreDisplayName(this.documentGenre)}`);

      logger.info("EpistemicCriticPlugin: Starting analysis");
      logger.info(`EpistemicCriticPlugin: Processing ${chunks.length} chunks`);

      // Phase 1: Extract epistemic issues from all chunks in parallel
      const extractionPromises = this.chunks.map((chunk) =>
        this.extractIssuesFromChunk(chunk)
      );

      const extractionResults = await Promise.allSettled(extractionPromises);

      // Collect all extracted issues and track errors
      const allIssues: EpistemicIssue[] = [];
      const extractionErrors: string[] = [];

      for (const result of extractionResults) {
        if (result.status === "fulfilled" && result.value) {
          allIssues.push(...result.value.issues);
          if (result.value.error) {
            extractionErrors.push(result.value.error);
          }
        } else if (result.status === "rejected") {
          const error =
            result.reason instanceof Error
              ? result.reason.message
              : "Unknown extraction error";
          extractionErrors.push(error);
          logger.warn(`Issue extraction failed for chunk: ${error}`);
        }
      }

      // Log summary of errors if any occurred
      if (extractionErrors.length > 0) {
        logger.warn(
          `Issue extraction completed with ${extractionErrors.length} errors`
        );
      }

      // Deduplicate issues by similar text
      this.issues = this.deduplicateIssues(allIssues);

      // Phase 2: Research high-priority issues
      const issuesToResearch = this.issues.filter((issue) =>
        issue.shouldResearch()
      );

      if (issuesToResearch.length > 0) {
        await this.researchIssues(issuesToResearch);
      }

      // Phase 3: Generate comments for all issues in parallel
      const commentPromises = this.issues.map(async (issue) => {
        // Run in next tick to ensure true parallelism
        await new Promise((resolve) => setImmediate(resolve));
        const comment = await buildEpistemicComment(
          issue,
          documentText,
          { logger }
        );
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
      this.comments = commentResults.filter(
        (comment): comment is Comment => comment !== null
      );

      // Phase 4: Generate analysis summary
      const { summary, analysisSummary } = this.generateAnalysis();
      this.summary = summary;
      this.analysis = analysisSummary;

      this.hasRun = true;
      logger.info(
        `EpistemicCriticPlugin: Analysis complete - ${this.comments.length} comments generated`
      );

      return this.getResults();
    } catch (error) {
      logger.error("EpistemicCriticPlugin: Fatal error during analysis", error);
      // Return a partial result instead of throwing
      this.hasRun = true;
      this.summary = "Analysis failed due to an error";
      this.analysis =
        "The epistemic analysis could not be completed due to a technical error.";
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
    };
  }

  private async extractIssuesFromChunk(chunk: TextChunk): Promise<{
    issues: EpistemicIssue[];
    error?: string;
  }> {
    try {
      // Track tool execution if session manager is available
      const sessionManager = getGlobalSessionManager();
      const executeExtraction = async () => {
        return await epistemicIssuesExtractorTool.execute(
          {
            text: chunk.text,
            focusAreas: [
              ISSUE_TYPES.MISINFORMATION,
              ISSUE_TYPES.MISSING_CONTEXT,
              ISSUE_TYPES.DECEPTIVE_WORDING,
              ISSUE_TYPES.LOGICAL_FALLACY,
              ISSUE_TYPES.VERIFIED_ACCURATE,
            ],
            minSeverityThreshold: THRESHOLDS.SEVERITY_LOW,
            maxIssues: LIMITS.MAX_ISSUES_PER_CHUNK,
            genre: this.documentGenre ?? undefined, // Pass detected genre for context-aware analysis
          },
          {
            logger,
          }
        );
      };

      const result = sessionManager
        ? await sessionManager.trackTool(
            "extract-epistemic-issues",
            executeExtraction
          )
        : await executeExtraction();

      const issues = result.issues.map(
        (issue) => new EpistemicIssue(issue, chunk, this.processingStartTime)
      );

      return {
        issues,
      };
    } catch (error) {
      logger.error("Error extracting issues from chunk:", error);
      return {
        issues: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private deduplicateIssues(issues: EpistemicIssue[]): EpistemicIssue[] {
    const seen = new Set<string>();
    const unique: EpistemicIssue[] = [];

    for (const issue of issues) {
      const key = issue.text.toLowerCase().replace(/\s+/g, " ").trim();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(issue);
      }
    }

    // Calculate priority score for each issue
    // Higher score = more important to address
    const priorityScore = (issue: EpistemicIssue) =>
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

  private async researchIssues(issues: EpistemicIssue[]): Promise<void> {
    // Research issues in parallel for better performance
    const researchPromises = issues.map((issue) =>
      this.researchSingleIssue(issue)
    );
    await Promise.allSettled(researchPromises);
  }

  private async researchSingleIssue(issue: EpistemicIssue): Promise<void> {
    try {
      logger.info(
        `[EpistemicCritic] Researching high-priority issue: "${issue.text.substring(0, 100)}..."`
      );

      // Use the research query from the extraction or create one
      const query =
        issue.issue.researchQuery ||
        `Verify this claim and provide context: ${issue.text}`;

      // Track tool execution if session manager is available
      const sessionManager = getGlobalSessionManager();
      const executeResearch = async () => {
        return await perplexityResearcherTool.execute(
          {
            query,
            focusArea: "general",
          },
          {
            logger,
          }
        );
      };

      const result = sessionManager
        ? await sessionManager.trackTool(
            "perplexity-researcher",
            executeResearch
          )
        : await executeResearch();

      // Store research findings
      issue.researchFindings = {
        summary: result.summary || "No research summary available",
        sources:
          result.sources?.map((s) => s.url || "Unknown source") || [],
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown research error";
      logger.error(`Error researching issue "${issue.text}": ${errorMessage}`);
      // Store error info on the issue for debugging
      issue.researchFindings = {
        summary: `Research failed: ${errorMessage}`,
        sources: [],
      };
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
    const researchErrors = this.issues.filter(
      (i) =>
        i.researchFindings?.summary?.includes("Research failed")
    ).length;

    return {
      issuesFound: this.issues.length,
      issuesResearched: this.issues.filter((i) => i.hasResearch()).length,
      issuesWithResearchErrors: researchErrors,
      errorRate:
        this.issues.length > 0
          ? ((researchErrors / this.issues.length) * 100).toFixed(1) + "%"
          : "0%",
    };
  }
}

// Export the plugin class and EpistemicIssue
export { EpistemicIssue } from "./EpistemicIssue";
