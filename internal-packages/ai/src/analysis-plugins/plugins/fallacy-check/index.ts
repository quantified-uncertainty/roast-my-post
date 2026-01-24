import { logger } from "../../../shared/logger";
import type { Comment } from "../../../shared/types";
import fallacyExtractorTool from "../../../tools/fallacy-extractor";
import type { ExtractedFallacyIssue } from "../../../tools/fallacy-extractor/types";
import fuzzyTextLocatorTool from "../../../tools/smart-text-searcher";
import fallacyReviewTool from "../../../tools/fallacy-review";
import supportedElsewhereFilterTool from "../../../tools/supported-elsewhere-filter";
import principleOfCharityFilterTool from "../../../tools/principle-of-charity-filter";
import fallacyJudgeTool from "../../../tools/fallacy-judge";
import { decisionToIssue } from "../../../tools/fallacy-judge/types";
import { TextChunk } from "../../TextChunk";
import type {
  AnalysisResult,
  RoutingExample,
  SimpleAnalysisPlugin,
} from "../../types";
import { THRESHOLDS, ISSUE_TYPES } from "./constants";
import { buildFallacyComment } from "./comments/builder";
import { FallacyIssue } from "./FallacyIssue";
import {
  PipelineTelemetry,
  PIPELINE_STAGES,
  type PipelineExecutionRecord,
  type ExtractionPhaseTelemetry,
  type ExtractorTelemetry,
  type JudgeDecisionRecord,
  type ActualApiParams,
  type ApiResponseMetrics,
} from "./telemetry";
import {
  getMultiExtractorConfigFromProfile,
  getDefaultTemperature,
  getConfigSummary,
} from "./extraction/config";
import { runMultiExtractor, deduplicateExtractedIssues } from "./extraction/multiExtractor";
import type { MultiExtractorConfig, ExtractorConfig, JudgeConfig } from "./extraction/types";
import { prioritizeAndLimitIssues } from "./dedup";
import type {
  FallacyCheckerProfileConfig,
  SupportedElsewhereFilterConfig,
  PrincipleOfCharityFilterConfig,
  ReasoningConfig,
  FilterChainItem,
} from "./profile-types";
import { createDefaultProfileConfig } from "./profile-types";
import { loadProfileOrDefault } from "./profile-loader";

/**
 * Options for FallacyCheckPlugin
 */
export interface FallacyCheckPluginOptions {
  /**
   * Profile ID to load from database.
   * If provided, profile config is loaded from the database.
   */
  profileId?: string;

  /**
   * Agent ID used to load default profile if profileId is not found.
   * Defaults to "system-fallacy-check".
   */
  agentId?: string;

  /**
   * Direct profile config - bypasses database loading.
   * Use this for testing or when the config is already loaded.
   */
  profileConfig?: FallacyCheckerProfileConfig;
}

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

  // Profile configuration
  private options: FallacyCheckPluginOptions;
  private profileConfig: FallacyCheckerProfileConfig | null = null;
  private profileLoaded = false;

  constructor(options: FallacyCheckPluginOptions = {}) {
    this.documentText = "";
    this.chunks = [];
    this.options = options;
  }

  /**
   * Load the profile configuration.
   * Called at the start of analyze() to ensure profile is loaded before use.
   */
  private async loadProfile(): Promise<FallacyCheckerProfileConfig> {
    if (this.profileLoaded && this.profileConfig) {
      return this.profileConfig;
    }

    // If config was provided directly, use it
    if (this.options.profileConfig) {
      this.profileConfig = this.options.profileConfig;
      this.profileLoaded = true;
      return this.profileConfig;
    }

    // If profileId is provided, load from database
    if (this.options.profileId || this.options.agentId) {
      try {
        this.profileConfig = await loadProfileOrDefault(
          this.options.profileId,
          this.options.agentId || 'system-fallacy-check'
        );
        this.profileLoaded = true;
        logger.info('FallacyCheckPlugin: Loaded profile config', {
          profileId: this.options.profileId,
          agentId: this.options.agentId,
          hasProfileConfig: !!this.profileConfig,
        });
        return this.profileConfig;
      } catch (error) {
        logger.warn('FallacyCheckPlugin: Failed to load profile, using defaults', error);
      }
    }

    // Fall back to default config (uses env vars internally)
    const defaultConfig = createDefaultProfileConfig();
    this.profileConfig = defaultConfig;
    this.profileLoaded = true;
    return defaultConfig;
  }

  /**
   * Resolve thinking boolean from extractor config
   * Checks reasoning config first, falls back to thinking boolean
   */
  private resolveThinkingForExtractor(config: ExtractorConfig | undefined): boolean {
    if (!config) return true; // default enabled

    // New reasoning config takes precedence
    if (config.reasoning !== undefined) {
      if (config.reasoning === false) return false;
      return true; // any effort level or budget_tokens = enabled
    }

    // Fall back to legacy thinking boolean (default true)
    return config.thinking !== false;
  }

  /**
   * Resolve thinking boolean for judge config.
   * Checks reasoning config first, falls back to thinking boolean.
   */
  private resolveThinkingForJudge(config: JudgeConfig): boolean {
    // New reasoning config takes precedence
    if (config.reasoning !== undefined) {
      if (config.reasoning === false) return false;
      return true; // any effort level or budget_tokens = enabled
    }

    // Fall back to legacy thinking boolean (default true)
    return config.thinking !== false;
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
    this.processingStartTime = Date.now();
    this.documentText = documentText;
    this.chunks = chunks;

    if (this.hasRun) {
      return this.getResults();
    }

    // Load profile configuration FIRST before any analysis
    const profileConfig = await this.loadProfile();

    // Initialize telemetry - use local const to avoid repeated null assertions
    const telemetry = new PipelineTelemetry(documentText.length);

    // Record profile info in telemetry
    telemetry.setProfileInfo({
      profileId: this.options.profileId,
      agentId: this.options.agentId || 'system-fallacy-check',
      thresholds: profileConfig.thresholds,
      extractorCount: profileConfig.models.extractors.length,
      judgeEnabled: profileConfig.models.judge.enabled,
      hasCustomPrompts: !!profileConfig.prompts,
    });

    try {
      // Audit log: Analysis started
      logger.info("FallacyCheckPlugin: AUDIT: Analysis started", {
        timestamp: new Date().toISOString(),
        documentLength: documentText.length,
        chunkCount: chunks.length,
        operation: "fallacy-check-analysis",
        profileId: this.options.profileId,
        thresholds: profileConfig.thresholds,
        hasCustomPrompts: !!profileConfig.prompts,
      });

      logger.info("FallacyCheckPlugin: Starting analysis (single-pass mode)", {
        profileId: this.options.profileId,
        extractorCount: profileConfig.models.extractors.length,
        judgeEnabled: profileConfig.models.judge.enabled,
      });

      // Phase 1: Single-pass extraction on full document
      telemetry.startStage(PIPELINE_STAGES.EXTRACTION, 1); // 1 = full document
      const extractionResult = await this.extractIssuesFromDocument(documentText, telemetry);
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

      // Deduplication now happens inside extraction phase, so allIssues is already deduplicated
      // Just prioritize and limit
      const prioritizedIssues = prioritizeAndLimitIssues(allIssues);
      telemetry.setFinalCounts({ issuesAfterDedup: prioritizedIssues.length });

      // Phase 2: Run filters in filterChain order
      // Iterate through the filter chain and run each enabled filter
      let filteredIssues = prioritizedIssues;
      for (const filterConfig of profileConfig.filterChain) {
        if (!filterConfig.enabled) {
          logger.info(`FallacyCheckPlugin: Filter ${filterConfig.type} is disabled, skipping`);
          continue;
        }

        filteredIssues = await this.runFilter(
          filterConfig,
          filteredIssues,
          documentText,
          telemetry
        );
      }
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
   *
   * Supports multi-extractor mode when multiple extractors are configured
   * in the profile or FALLACY_EXTRACTORS env var.
   */
  private async extractIssuesFromDocument(
    documentText: string,
    telemetry: PipelineTelemetry
  ): Promise<{
    issues: FallacyIssue[];
    error?: string;
  }> {
    // Use profile-based config if available, otherwise fall back to env vars
    // Always use the multi-extractor path - it handles 1+ extractors, does dedup
    // (useful even for single extractor since LLMs can produce duplicates),
    // and has proper telemetry capture
    const config = getMultiExtractorConfigFromProfile(this.profileConfig || undefined);
    return this.extractWithMultiExtractor(documentText, telemetry, config);
  }

  /**
   * Extract issues using the unified extractor path.
   * Handles 1+ extractors, always does dedup (useful even with 1 extractor),
   * and optionally runs the judge if enabled.
   */
  private async extractWithMultiExtractor(
    documentText: string,
    telemetry: PipelineTelemetry,
    config: MultiExtractorConfig
  ): Promise<{
    issues: FallacyIssue[];
    error?: string;
  }> {
    logger.info(`[FallacyCheckPlugin] Starting extraction`, {
      extractorCount: config.extractors.length,
      judgeEnabled: config.judge.enabled,
      minSeverityThreshold: this.profileConfig?.thresholds.minSeverityThreshold,
      maxIssues: this.profileConfig?.thresholds.maxIssues,
      hasCustomPrompts: !!this.profileConfig?.prompts,
    });
    logger.info(getConfigSummary());

    try {
      // Phase 1: Run all extractors in parallel
      const multiResult = await runMultiExtractor(documentText, {
        ...config,
        thresholds: {
          minSeverityThreshold: this.profileConfig?.thresholds.minSeverityThreshold,
          maxIssues: this.profileConfig?.thresholds.maxIssues,
        },
      });

      // Collect telemetry for each extractor
      const extractorsTelemetry: ExtractorTelemetry[] = multiResult.extractorResults.map(
        (r) => ({
          extractorId: r.extractorId,
          model: r.config.model,
          // Resolve temperature for telemetry: "default" -> model default, number -> use as-is
          temperature: typeof r.config.temperature === 'number'
            ? r.config.temperature
            : getDefaultTemperature(r.config.model),
          // Store original config for display
          temperatureConfig: r.config.temperature,
          thinkingEnabled: r.config.thinking !== false,
          issuesFound: r.issues.length,
          durationMs: r.durationMs,
          // Get cost from unified usage (preferred) or legacy costUsd field
          costUsd: r.unifiedUsage?.costUsd ?? r.costUsd,
          error: r.error,
          issuesByType: this.countIssuesByType(r.issues),
          // Include actual API params and response metrics for UI display
          actualApiParams: r.actualApiParams,
          responseMetrics: r.responseMetrics,
          // Include unified usage for detailed cost/token tracking
          unifiedUsage: r.unifiedUsage,
        })
      );

      // Phase 2: Deduplicate all issues using Jaccard similarity
      const successfulExtractors = multiResult.extractorResults.filter((r) => !r.error);
      const allExtractedIssues = successfulExtractors.flatMap((r) => r.issues);

      let finalIssues: ExtractedFallacyIssue[];
      let judgeDecisions: JudgeDecisionRecord[] = [];
      let judgeDurationMs: number | undefined;
      let judgeCostUsd: number | undefined;
      let judgeUnifiedUsage: typeof multiResult.extractorResults[0]['unifiedUsage'];
      let judgeActualApiParams: ActualApiParams | undefined;
      let judgeResponseMetrics: ApiResponseMetrics | undefined;
      let issuesAfterDedup = allExtractedIssues.length;

      if (allExtractedIssues.length === 0) {
        finalIssues = [];
      } else {
        // Always run Jaccard deduplication first
        const dedupResult = deduplicateExtractedIssues(allExtractedIssues);
        issuesAfterDedup = dedupResult.deduplicated.length;

        logger.info(
          `[FallacyCheckPlugin] Deduplication: ${allExtractedIssues.length} → ${issuesAfterDedup} issues (${dedupResult.removedCount} duplicates removed)`
        );

        if (!config.judge.enabled) {
          // Judge disabled - deduplication is the final step
          logger.info(`[FallacyCheckPlugin] Judge disabled, using deduplicated issues`);
          finalIssues = dedupResult.deduplicated;
        } else {
          // Judge enabled - run judge on deduplicated issues
          const judgeInput = {
            documentText,
            issues: dedupResult.deduplicated.map((issue) => ({
              extractorId: 'deduped', // Issues are already merged
              exactText: issue.exactText,
              issueType: issue.issueType,
              fallacyType: issue.fallacyType,
              severityScore: issue.severityScore,
              confidenceScore: issue.confidenceScore,
              importanceScore: issue.importanceScore,
              reasoning: issue.reasoning,
            })),
            extractorIds: successfulExtractors.map((r) => r.extractorId),
            // Pass judge config from profile to avoid env var fallback
            judgeConfig: {
              model: config.judge.model,
              temperature: config.judge.temperature,
              thinking: this.resolveThinkingForJudge(config.judge),
              reasoning: config.judge.reasoning,
              provider: config.judge.provider,
              enabled: true, // We're inside the enabled branch
            },
          };

          logger.info(
            `[FallacyCheckPlugin] Running LLM judge on ${judgeInput.issues.length} deduplicated issues`
          );

          const judgeStartTime = Date.now();
          const judgeResult = await fallacyJudgeTool.execute(judgeInput, { logger });
          judgeDurationMs = Date.now() - judgeStartTime;
          // Get cost and unified usage from judge result
          judgeCostUsd = judgeResult.unifiedUsage?.costUsd;
          judgeUnifiedUsage = judgeResult.unifiedUsage;
          judgeActualApiParams = judgeResult.actualApiParams;
          judgeResponseMetrics = judgeResult.responseMetrics;

          // Convert judge decisions to issues
          finalIssues = judgeResult.acceptedDecisions.map((d) => decisionToIssue(d));

          // Record judge decisions for telemetry
          judgeDecisions = [
            ...judgeResult.acceptedDecisions.map((d) => ({
              issueText: d.finalText,
              issueType: d.finalIssueType,
              decision: (d.decision === 'accept' || d.decision === 'merge' ? 'accepted' : 'rejected') as 'accepted' | 'merged' | 'rejected',
              reasoning: d.judgeReasoning,
              sourceExtractors: d.sourceExtractors,
              finalSeverity: d.finalSeverity,
              finalConfidence: d.finalConfidence,
            })),
            ...judgeResult.rejectedDecisions.map((d) => ({
              issueText: d.finalText,
              issueType: d.finalIssueType,
              decision: 'rejected' as const,
              reasoning: d.judgeReasoning,
              sourceExtractors: d.sourceExtractors,
              finalSeverity: d.finalSeverity,
              finalConfidence: d.finalConfidence,
            })),
          ];

          logger.info(
            `[FallacyCheckPlugin] Judge aggregation complete: ${finalIssues.length} accepted, ${judgeResult.rejectedDecisions.length} rejected`
          );
        }
      }

      // Record extraction phase telemetry
      const extractionTelemetry: ExtractionPhaseTelemetry = {
        multiExtractorEnabled: true,
        extractors: extractorsTelemetry,
        totalIssuesBeforeJudge: multiResult.totalIssuesFound,
        totalIssuesAfterDedup: issuesAfterDedup,
        totalIssuesAfterJudge: finalIssues.length,
        judgeModel: config.judge.model,
        judgeDurationMs,
        judgeCostUsd,
        judgeUnifiedUsage,
        judgeActualApiParams,
        judgeResponseMetrics,
        judgeDecisions,
      };
      telemetry.setExtractionPhase(extractionTelemetry);

      // Create FallacyIssue objects
      const fullDocChunk = new TextChunk("full-document", documentText, {
        position: { start: 0, end: documentText.length },
      });

      const issues = finalIssues.map(
        (issue) => new FallacyIssue(issue, fullDocChunk, this.processingStartTime)
      );

      return { issues };
    } catch (error) {
      logger.error("Error in multi-extractor mode:", error);
      return {
        issues: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Count issues by type for telemetry
   */
  private countIssuesByType(issues: ExtractedFallacyIssue[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const issue of issues) {
      counts[issue.issueType] = (counts[issue.issueType] || 0) + 1;
    }
    return counts;
  }

  /**
   * Dispatch to the appropriate filter based on the filter config type.
   * This enables dynamic filter chain ordering.
   */
  private async runFilter(
    filterConfig: FilterChainItem,
    issues: FallacyIssue[],
    documentText: string,
    telemetry: PipelineTelemetry
  ): Promise<FallacyIssue[]> {
    // Get the stage name for telemetry
    const stageName = this.getFilterStageName(filterConfig.type);

    logger.info(`FallacyCheckPlugin: AUDIT: ${filterConfig.type} filter started`, {
      timestamp: new Date().toISOString(),
      issuesToFilter: issues.length,
      phase: stageName,
      type: filterConfig.type,
    });

    switch (filterConfig.type) {
      case 'principle-of-charity':
        telemetry.startStage(stageName, issues.length);
        return this.runPrincipleOfCharityFilter(
          issues,
          documentText,
          telemetry,
          filterConfig
        );

      case 'supported-elsewhere':
        telemetry.startStage(stageName, issues.length);
        return this.runSupportedElsewhereFilter(
          issues,
          documentText,
          telemetry,
          filterConfig
        );

      case 'dedup':
        // Dedup is handled in extraction phase, but if someone re-adds it here, just pass through
        logger.info("FallacyCheckPlugin: Dedup filter in chain (already handled in extraction phase)");
        return issues;

      case 'severity': {
        // Severity filtering - filter by minimum severity threshold
        const minSeverity = filterConfig.minSeverity;
        const afterSeverity = issues.filter((issue) => issue.severityScore >= minSeverity);
        logger.info(`FallacyCheckPlugin: Severity filter: ${issues.length} → ${afterSeverity.length} (min: ${minSeverity})`);
        return afterSeverity;
      }

      case 'confidence': {
        // Confidence filtering - filter by minimum confidence threshold
        const minConfidence = filterConfig.minConfidence;
        const afterConfidence = issues.filter((issue) => issue.confidenceScore >= minConfidence);
        logger.info(`FallacyCheckPlugin: Confidence filter: ${issues.length} → ${afterConfidence.length} (min: ${minConfidence})`);
        return afterConfidence;
      }

      case 'review':
        // Review filter is handled later in the pipeline (after comment generation)
        logger.info("FallacyCheckPlugin: Review filter in chain (handled after comment generation)");
        return issues;

      default: {
        // Exhaustive check - TypeScript will error if we miss a case
        const _exhaustive: never = filterConfig;
        logger.warn(`FallacyCheckPlugin: Unknown filter type, skipping: ${(filterConfig as FilterChainItem).type}`);
        return issues;
      }
    }
  }

  /**
   * Get the telemetry stage name for a filter type
   */
  private getFilterStageName(filterType: string): string {
    switch (filterType) {
      case 'principle-of-charity':
        return PIPELINE_STAGES.PRINCIPLE_OF_CHARITY_FILTER;
      case 'supported-elsewhere':
        return PIPELINE_STAGES.SUPPORTED_ELSEWHERE_FILTER;
      default:
        return `${filterType}-filter`;
    }
  }

  /**
   * Run the principle-of-charity filter to remove issues that dissolve under charitable interpretation
   */
  private async runPrincipleOfCharityFilter(
    issues: FallacyIssue[],
    documentText: string,
    telemetry: PipelineTelemetry,
    filterConfig?: PrincipleOfCharityFilterConfig
  ): Promise<FallacyIssue[]> {
    try {
      // Build filter input with config settings
      const filterInput: {
        documentText: string;
        issues: Array<{
          quotedText: string;
          issueType: string;
          reasoning: string;
          locationOffset?: number;
        }>;
        model?: string;
        temperature?: number;
        reasoning?: ReasoningConfig;
        provider?: { order?: string[]; allow_fallbacks?: boolean };
        customPrompt?: string;
      } = {
        documentText,
        issues: issues.map((issue) => ({
          quotedText: issue.text,
          issueType: issue.issueType,
          reasoning: issue.issue.reasoning,
          locationOffset: issue.issue.location?.startOffset,
        })),
      };

      // Apply config settings if provided
      if (filterConfig) {
        if (filterConfig.model) {
          filterInput.model = filterConfig.model;
        }
        if (filterConfig.temperature !== undefined && filterConfig.temperature !== 'default') {
          filterInput.temperature = filterConfig.temperature;
        }
        if (filterConfig.reasoning !== undefined) {
          filterInput.reasoning = filterConfig.reasoning;
        }
        if (filterConfig.provider) {
          filterInput.provider = filterConfig.provider;
        }
        if (filterConfig.customPrompt) {
          filterInput.customPrompt = filterConfig.customPrompt;
        }
      }

      const filterResult = await principleOfCharityFilterTool.execute(
        filterInput,
        { logger }
      );

      // Keep only the issues that remain valid under charitable interpretation
      const validIndices = new Set(
        filterResult.validIssues.map((r) => r.index)
      );
      const filteredIssues = issues.filter((_, idx) =>
        validIndices.has(idx)
      );

      // Log and record what was filtered
      const dissolvedCount = filterResult.dissolvedIssues.length;
      if (dissolvedCount > 0) {
        logger.info(
          `FallacyCheckPlugin: Filtered out ${dissolvedCount} issues (dissolved under charitable interpretation)`
        );

        // Record filtered items with their reasoning for telemetry
        const filteredRecords = filterResult.dissolvedIssues.map((dissolved) => {
          const originalIssue = issues[dissolved.index];
          logger.debug(`  - Issue ${dissolved.index}: ${dissolved.explanation}`);
          return {
            stage: PIPELINE_STAGES.PRINCIPLE_OF_CHARITY_FILTER,
            quotedText: originalIssue.text || `Issue at index ${dissolved.index}`,
            header: originalIssue.issueType,
            filterReason: `Charitable interpretation: ${dissolved.charitableInterpretation}. ${dissolved.explanation}`,
            originalIndex: dissolved.index,
          };
        });
        telemetry.recordFilteredItems(filteredRecords);
      }

      // Record passed items (issues that remain valid)
      if (filterResult.validIssues.length > 0) {
        const passedRecords = filterResult.validIssues.map((valid) => {
          const originalIssue = issues[valid.index];
          return {
            stage: PIPELINE_STAGES.PRINCIPLE_OF_CHARITY_FILTER,
            quotedText: originalIssue.text || `Issue at index ${valid.index}`,
            header: originalIssue.issueType,
            passReason: valid.explanation,
            originalIndex: valid.index,
          };
        });
        telemetry.recordPassedItems(passedRecords);
      }

      logger.info("FallacyCheckPlugin: AUDIT: Principle-of-charity filter completed", {
        timestamp: new Date().toISOString(),
        issuesBeforeFilter: issues.length,
        issuesAfterFilter: filteredIssues.length,
        issuesFiltered: dissolvedCount,
        phase: "principle-of-charity-filter",
        costUsd: filterResult.unifiedUsage?.costUsd,
      });

      telemetry.endStage(filteredIssues.length, {
        costUsd: filterResult.unifiedUsage?.costUsd,
        actualApiParams: filterResult.actualApiParams,
        responseMetrics: filterResult.responseMetrics,
        unifiedUsage: filterResult.unifiedUsage,
      });
      return filteredIssues;
    } catch (error) {
      logger.warn("FallacyCheckPlugin: Principle-of-charity filter failed, keeping all issues", error);
      telemetry.endStage(issues.length, {
        error: error instanceof Error ? error.message : String(error),
      });
      return issues;
    }
  }

  /**
   * Run the supported-elsewhere filter to remove false positives
   */
  private async runSupportedElsewhereFilter(
    issues: FallacyIssue[],
    documentText: string,
    telemetry: PipelineTelemetry,
    filterConfig?: SupportedElsewhereFilterConfig
  ): Promise<FallacyIssue[]> {
    try {
      // Build filter input with config settings
      const filterInput: {
        documentText: string;
        issues: Array<{
          quotedText: string;
          issueType: string;
          reasoning: string;
          locationOffset?: number;
        }>;
        model?: string;
        temperature?: number;
        reasoning?: ReasoningConfig;
        provider?: { order?: string[]; allow_fallbacks?: boolean };
        customPrompt?: string;
      } = {
        documentText,
        issues: issues.map((issue) => ({
          quotedText: issue.text,
          issueType: issue.issueType,
          reasoning: issue.issue.reasoning,
          locationOffset: issue.issue.location?.startOffset,
        })),
      };

      // Apply config settings if provided
      if (filterConfig) {
        if (filterConfig.model) {
          filterInput.model = filterConfig.model;
        }
        if (filterConfig.temperature !== undefined && filterConfig.temperature !== 'default') {
          filterInput.temperature = filterConfig.temperature;
        }
        if (filterConfig.reasoning !== undefined) {
          filterInput.reasoning = filterConfig.reasoning;
        }
        if (filterConfig.provider) {
          filterInput.provider = filterConfig.provider;
        }
        if (filterConfig.customPrompt) {
          filterInput.customPrompt = filterConfig.customPrompt;
        }
      }

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
            quotedText: originalIssue.text || `Issue at index ${supported.index}`,
            header: originalIssue.issueType,
            filterReason: supported.explanation,
            supportLocation: supported.supportLocation,
            originalIndex: supported.index,
          };
        });
        telemetry.recordFilteredItems(filteredRecords);
      }

      // Record passed items (issues that are NOT supported elsewhere)
      if (filterResult.unsupportedIssues.length > 0) {
        const passedRecords = filterResult.unsupportedIssues.map((unsupported) => {
          const originalIssue = issues[unsupported.index];
          return {
            stage: PIPELINE_STAGES.SUPPORTED_ELSEWHERE_FILTER,
            quotedText: originalIssue.text || `Issue at index ${unsupported.index}`,
            header: originalIssue.issueType,
            passReason: unsupported.explanation,
            originalIndex: unsupported.index,
          };
        });
        telemetry.recordPassedItems(passedRecords);
      }

      logger.info("FallacyCheckPlugin: AUDIT: Supported-elsewhere filter completed", {
        timestamp: new Date().toISOString(),
        issuesBeforeFilter: issues.length,
        issuesAfterFilter: filteredIssues.length,
        issuesFiltered: supportedCount,
        phase: "supported-elsewhere-filter",
        costUsd: filterResult.unifiedUsage?.costUsd,
      });

      telemetry.endStage(filteredIssues.length, {
        costUsd: filterResult.unifiedUsage?.costUsd,
        actualApiParams: filterResult.actualApiParams,
        responseMetrics: filterResult.responseMetrics,
        unifiedUsage: filterResult.unifiedUsage,
      });
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
      if (comment?.description.trim()) {
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
        costUsd: reviewResult.unifiedUsage?.costUsd,
      });

      telemetry.endStage(this.comments.length, {
        costUsd: reviewResult.unifiedUsage?.costUsd,
      });
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
