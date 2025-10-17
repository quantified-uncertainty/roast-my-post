/**
 * Plugin Manager - Coordinates document analysis with the new plugin API
 *
 * This is a simplified version that only supports the new SimpleAnalysisPlugin interface.
 * For legacy plugin support, see BasePlugin.ts which maintains backward compatibility.
 */

import {
  getGlobalSessionManager,
  HeliconeSessionManager,
} from "../helicone/simpleSessionManager";
import { logger } from "../shared/logger";
// Document and Comment types are passed as parameters to avoid circular dependencies
// LLMInteraction type removed - was unused
import type { Comment } from "../shared/types";
import { ANALYSIS_MODEL } from "../types";
// Import plugin ID constants
import { PLUGIN_IDS } from "./constants/plugin-ids";
// Import core refactored components
import {
  IsolatedPluginExecutor,
  PluginExecutor,
  PluginFactory,
  PluginRegistry,
  PluginRouter,
} from "./core";
import {
  type JobLogSummary,
  PluginLogger,
} from "./PluginLogger";
import { FactCheckPlugin } from "./plugins/fact-check";
import { ForecastPlugin } from "./plugins/forecast";
import { LinkPlugin } from "./plugins/link-analysis";
// Import all plugins
import { MathPlugin } from "./plugins/math";
import { SpellingPlugin } from "./plugins/spelling";
import {
  AnalysisResult,
  SimpleAnalysisPlugin,
} from "./types";
import {
  type PluginSelection,
  PluginType,
} from "./types/plugin-types";
import { createChunksWithTool } from "./utils/createChunksWithTool";

export interface PluginManagerConfig {
  sessionManager?: HeliconeSessionManager;
  jobId?: string; // For logging integration
  pluginSelection?: PluginSelection; // Optional plugin selection configuration
  useIsolation?: boolean; // Enable plugin state isolation
}

export interface SimpleDocumentAnalysisResult {
  summary: string;
  analysis: string;
  pluginResults: Map<string, AnalysisResult>;
  allComments: Comment[];
  statistics: {
    totalChunks: number;
    totalComments: number;
    commentsByPlugin: Map<string, number>;
    totalCost: number;
    processingTime: number;
  };
  logSummary: JobLogSummary;
  jobLogString: string; // Formatted string for Job.logs field
}

export interface FullDocumentAnalysisResult {
  thinking: string;
  analysis: string;
  summary: string;
  grade?: number;
  highlights: Comment[];
  tasks: Array<{
    name: string;
    modelName: string;
    priceInDollars: number;
    timeInSeconds: number;
    log: string;
  }>;
  errors?: Array<{
    plugin: string;
    error: string;
    recoveryAction: string;
  }>;
  logSummary: JobLogSummary;
  jobLogString: string; // Formatted string for Job.logs field
}

export class PluginManager {
  private sessionManager?: HeliconeSessionManager;
  private startTime: number = 0;
  private pluginLogger: PluginLogger;
  private pluginSelection?: PluginSelection;

  // New refactored components
  private registry: PluginRegistry;
  private router: PluginRouter;
  private executor: PluginExecutor;
  private useIsolation: boolean;
  private isolatedExecutor?: IsolatedPluginExecutor;
  private factory?: PluginFactory;

  constructor(config: PluginManagerConfig = {}) {
    // Use provided session manager, or fall back to global if available
    this.sessionManager = config.sessionManager || getGlobalSessionManager();
    this.pluginLogger = new PluginLogger(config.jobId);
    this.pluginSelection = config.pluginSelection;
    this.useIsolation = config.useIsolation || false;

    // Initialize refactored components
    this.registry = new PluginRegistry();
    this.router = new PluginRouter();
    this.executor = new PluginExecutor(this.pluginLogger, {
      maxRetries: 2,
      timeoutMs: 300000,
      retryDelayMs: 1000,
    });

    // Initialize isolation components if requested
    if (this.useIsolation) {
      this.factory = new PluginFactory();
      this.isolatedExecutor = new IsolatedPluginExecutor(this.factory);
      this.registerPluginsInFactory();
    }

    // Register default plugins in the registry
    this.registerDefaultPlugins();
  }

  /**
   * Register default plugins in the registry
   */
  private registerDefaultPlugins(): void {
    this.registry.register(PluginType.MATH, MathPlugin);
    this.registry.register(PluginType.SPELLING, SpellingPlugin);
    this.registry.register(PluginType.FORECAST, ForecastPlugin);
    this.registry.register(PluginType.LINK_ANALYSIS, LinkPlugin);
    this.registry.register(PluginType.FACT_CHECK, FactCheckPlugin);
  }

  /**
   * Register plugins in the isolation factory
   */
  private registerPluginsInFactory(): void {
    if (!this.factory) return;

    this.factory.register(PLUGIN_IDS.MATH, MathPlugin);
    this.factory.register(PLUGIN_IDS.SPELLING, SpellingPlugin);
    this.factory.register(PLUGIN_IDS.FORECAST, ForecastPlugin);
    this.factory.register(PLUGIN_IDS.LINK_ANALYSIS, LinkPlugin);
    this.factory.register(PLUGIN_IDS.FACT_CHECK, FactCheckPlugin);
  }

  /**
   * Analyze a document using the new SimpleAnalysisPlugin API
   * Each plugin gets all chunks and handles its own workflow
   */
  async analyzeDocumentSimple(
    text: string,
    plugins: SimpleAnalysisPlugin[]
  ): Promise<SimpleDocumentAnalysisResult> {
    this.startTime = Date.now();

    // Wrap in session tracking if available
    const runAnalysis = async () => {
      if (this.sessionManager) {
        return this.sessionManager.withPath("/plugins", undefined, async () => {
          return this._runPluginAnalysis(text, plugins);
        });
      } else {
        return this._runPluginAnalysis(text, plugins);
      }
    };

    return runAnalysis();
  }

  private async _runPluginAnalysis(
    text: string,
    plugins: SimpleAnalysisPlugin[]
  ): Promise<SimpleDocumentAnalysisResult> {
    try {
      // Log chunking phase
      this.pluginLogger.log({
        level: "info",
        plugin: "PluginManager",
        phase: "chunking",
        message: `Starting document chunking - using intelligent markdown chunking`,
      });

      // Always use intelligent chunking with markdown strategy for plugins
      logger.info(`Using intelligent chunking with markdown strategy`);
      const chunks = await createChunksWithTool(text, {
        maxChunkSize: 1500,
        minChunkSize: 200,
        preserveContext: true,
      });

      // Debug: Verify chunk positions
      logger.info("Verifying chunk positions after creation", {
        textLength: text.length,
        textStartsWith: text.slice(0, 100),
        numberOfChunks: chunks.length,
      });

      for (const chunk of chunks.slice(0, 3)) {
        // Check first 3 chunks
        if (chunk.metadata?.position) {
          const extractedText = text.substring(
            chunk.metadata.position.start,
            chunk.metadata.position.end
          );
          const matches = extractedText === chunk.text;

          logger.info(`Chunk ${chunk.id} position check`, {
            declaredStart: chunk.metadata.position.start,
            declaredEnd: chunk.metadata.position.end,
            chunkTextStart: chunk.text.slice(0, 50),
            extractedTextStart: extractedText.slice(0, 50),
            matches,
          });

          if (!matches) {
            // Try to find where the chunk actually is
            const actualPos = text.indexOf(chunk.text);
            logger.error("Chunk position mismatch during creation", {
              chunkId: chunk.id,
              declaredStart: chunk.metadata.position.start,
              actualStart: actualPos,
              difference: actualPos - chunk.metadata.position.start,
              declaredEnd: chunk.metadata.position.end,
              expectedText: chunk.text.slice(0, 50),
              actualText: extractedText.slice(0, 50),
            });
          }
        }
      }

      this.pluginLogger.log({
        level: "info",
        plugin: "PluginManager",
        phase: "chunking",
        message: `Created ${chunks.length} chunks for analysis`,
        context: { totalChunks: chunks.length },
      });

      // Use the new router component for cleaner routing logic
      this.pluginLogger.log({
        level: "info",
        plugin: "PluginManager",
        phase: "routing",
        message: `Starting chunk routing for ${plugins.length} plugins`,
      });

      const routingResult = await this.router.route(plugins, chunks);
      let totalCost = routingResult.totalCost;

      // Convert routing decisions to the existing format for backward compatibility
      const chunksPerPlugin = new Map<string, typeof chunks>();
      for (const [pluginName, decision] of routingResult.decisions) {
        chunksPerPlugin.set(pluginName, decision.chunks);

        // Log routing result
        this.pluginLogger.log({
          level: "info",
          plugin: "PluginManager",
          phase: "routing",
          message: `Plugin ${pluginName} assigned ${decision.chunks.length} chunks (${decision.reason})`,
          context: {
            pluginName,
            chunkCount: decision.chunks.length,
            chunkIds: decision.chunks.map((c) => c.id),
          },
        });
      }

      // Process with each plugin in parallel with improved error recovery
      const pluginResults = new Map<string, AnalysisResult>();
      const allComments: Comment[] = [];

      // Create promises for all plugin analyses with retry logic
      const pluginPromises = plugins.map(async (plugin) => {
        const pluginName = plugin.name();
        const maxRetries = 2;
        let lastError: Error | unknown = null;

        // Start plugin logging
        this.pluginLogger.pluginStarted(pluginName);

        // Create a plugin logger instance for this plugin
        const pluginLoggerInstance =
          this.pluginLogger.createPluginLogger(pluginName);

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const isRetry = attempt > 1;
            if (isRetry) {
              this.pluginLogger.pluginRetried(
                pluginName,
                attempt,
                maxRetries,
                lastError instanceof Error
                  ? lastError.message
                  : String(lastError)
              );
              // Add small delay between retries
              await new Promise((resolve) =>
                setTimeout(resolve, 1000 * attempt)
              );
            }

            const startTime = Date.now();

            // Get the chunks assigned to this plugin
            const assignedChunks = chunksPerPlugin.get(pluginName) || [];

            // Check if this is an always-run plugin
            const isrunOnAllChunks = plugin.runOnAllChunks === true;

            logger.info(
              `Plugin ${pluginName}: chunks=${assignedChunks.length}, runOnAllChunks=${isrunOnAllChunks}`
            );

            // Skip plugin if no chunks were routed to it (unless it's an always-run plugin)
            if (assignedChunks.length === 0 && !isrunOnAllChunks) {
              pluginLoggerInstance.startPhase(
                "skipped",
                `Skipping ${pluginName} - no chunks routed to this plugin`
              );
              pluginLoggerInstance.endPhase("skipped");
              return {
                plugin: pluginName,
                result: {
                  summary: "No relevant content found for this plugin",
                  analysis: "",
                  comments: [],
                  cost: 0,
                },
                success: true,
              };
            }

            // Add basic logging wrapper around plugin execution
            pluginLoggerInstance.startPhase(
              "initialization",
              `Starting ${pluginName} analysis with ${assignedChunks.length} chunks`
            );
            pluginLoggerInstance.processingChunks(assignedChunks.length);

            // Add timeout to prevent hanging
            const PLUGIN_TIMEOUT_MS = 300000; // 5 minutes
            let timeoutId: NodeJS.Timeout;

            const timeoutPromise = new Promise<never>((_, reject) => {
              timeoutId = setTimeout(
                () =>
                  reject(
                    new Error(
                      `Plugin ${pluginName} timed out after ${PLUGIN_TIMEOUT_MS}ms (${PLUGIN_TIMEOUT_MS / 1000}s)`
                    )
                  ),
                PLUGIN_TIMEOUT_MS
              );
            });

            // Wrap plugin execution in session tracking
            const executePlugin = async () => {
              if (this.sessionManager) {
                // Use withPath instead of trackPlugin since we're already inside /plugins
                return this.sessionManager.withPath(
                  `/${pluginName}`,
                  { plugin: pluginName },
                  async () => {
                    return plugin.analyze(assignedChunks, text);
                  }
                );
              } else {
                return plugin.analyze(assignedChunks, text);
              }
            };

            const result = await Promise.race([
              executePlugin(),
              timeoutPromise,
            ]).finally(() => {
              // Clear timeout when either promise resolves/rejects
              clearTimeout(timeoutId);
            });

            const duration = Date.now() - startTime;

            // Log results
            pluginLoggerInstance.itemsExtracted(result.comments.length);
            pluginLoggerInstance.commentsGenerated(result.comments.length);
            pluginLoggerInstance.cost(result.cost);
            pluginLoggerInstance.endPhase(
              "summary",
              `Analysis complete - ${result.comments.length} comments generated`,
              {
                duration,
                cost: result.cost,
              }
            );

            // Plugin completed successfully
            this.pluginLogger.pluginCompleted(pluginName, {
              itemsFound: result.comments.length,
              commentsGenerated: result.comments.length,
              cost: result.cost,
            });

            return { plugin: pluginName, result, success: true };
          } catch (error) {
            lastError = error;
            const errorMessage =
              error instanceof Error ? error.message : String(error);

            pluginLoggerInstance.error(
              `Plugin execution failed`,
              error,
              "analysis"
            );

            // Check if this is a retryable error
            const isRetryable = this.isRetryableError(error);

            if (isRetryable && attempt < maxRetries) {
              // Will retry - logged in pluginRetried call above
              continue;
            } else {
              // Plugin failed permanently
              this.pluginLogger.pluginCompleted(pluginName, {
                error: errorMessage,
              });
              break;
            }
          }
        }

        // All retries failed, return error with recovery strategy
        const errorMessage =
          lastError instanceof Error ? lastError.message : String(lastError);
        const recoveryAction = this.determineRecoveryAction(
          plugin.name(),
          lastError
        );

        return {
          plugin: plugin.name(),
          error: errorMessage,
          recoveryAction,
          success: false,
        };
      });

      // Wait for all plugins to complete
      const results = await Promise.all(pluginPromises);

      // Process results with error tracking
      for (const {
        plugin,
        result,
        success,
        error,
        recoveryAction,
      } of results) {
        if (success && result) {
          pluginResults.set(plugin, result);
          allComments.push(...result.comments);
          totalCost += result.cost;
        } else {
          logger.warn(`Plugin ${plugin} failed: ${error}`);
        }
      }

      // Generate summaries
      const pluginSummaries = Array.from(pluginResults.entries())
        .map(([name, result]) => `**${name}**: ${result.summary}`)
        .join("\n\n");

      // Generate detailed analysis sections for plugins that have them
      const detailedAnalyses = Array.from(pluginResults.entries())
        .filter(([_, result]) => result.analysis && result.analysis.length > 0)
        .map(([name, result]) => `## ${name} Analysis\n\n${result.analysis}`)
        .join("\n\n");

      const summary = `Analyzed ${chunks.length} sections with ${plugins.length} plugins. Found ${allComments.length} total issues.`;

      const analysis = `**Document Analysis Summary**\n\nThis document was analyzed by ${plugins.length} specialized plugins that examined ${chunks.length} sections.\n\n${pluginSummaries}${detailedAnalyses ? "\n\n---\n\n" + detailedAnalyses : ""}`;

      // Calculate statistics
      const commentsByPlugin = new Map<string, number>();
      for (const [name, result] of pluginResults) {
        commentsByPlugin.set(name, result.comments.length);
      }

      const processingTime = Date.now() - this.startTime;

      // Generate log summary and job log string
      const logSummary = this.pluginLogger.generateSummary();
      const jobLogString = this.pluginLogger.generateJobLogString();

      return {
        summary,
        analysis,
        pluginResults,
        allComments,
        statistics: {
          totalChunks: chunks.length,
          totalComments: allComments.length,
          commentsByPlugin,
          totalCost,
          processingTime,
        },
        logSummary,
        jobLogString,
      };
    } finally {
      // Cleanup if needed
    }
  }

  /**
   * High-level document analysis using all available plugins
   * This is the main entry point for full document analysis
   */
  async analyzeDocument(
    documentContent: string,
    options: {
      targetHighlights?: number;
    } = {}
  ): Promise<FullDocumentAnalysisResult> {
    // Input validation
    if (!documentContent || documentContent.trim().length === 0) {
      throw new Error("Document content is required and cannot be empty");
    }

    const tasks: FullDocumentAnalysisResult["tasks"] = [];
    const _targetHighlights = Math.max(1, options.targetHighlights || 5);

    try {
      // Step 1: Run plugin-based analysis
      logger.info(`Starting document analysis with plugin system...`);
      const pluginStartTime = Date.now();

      // Get selected plugins
      const plugins = await this.getSelectedPlugins();

      // Run analysis on document content using new API
      const pluginResults = await this.analyzeDocumentSimple(
        documentContent,
        plugins
      );

      const pluginDuration = Date.now() - pluginStartTime;
      logger.info(`Plugin analysis completed in ${pluginDuration}ms`);

      // Note: LLM interactions are now tracked automatically by the Claude wrapper

      tasks.push({
        name: "Plugin Analysis",
        modelName: ANALYSIS_MODEL, // claude-sonnet-4-5
        priceInDollars: pluginResults.statistics.totalCost,
        timeInSeconds: pluginDuration / 1000,
        log: `Analyzed ${pluginResults.statistics.totalChunks} chunks, generated ${pluginResults.statistics.totalComments} comments using ${plugins.length} plugins.`,
      });

      // Step 2: Plugin results are ready
      logger.info(
        `Plugin analysis completed: ${pluginResults.statistics.totalComments} comments generated`
      );

      // Step 3: Use summary and analysis from plugin results
      const { summary, analysis } = pluginResults;

      // Step 4: Get highlights from plugin results
      logger.info(`Converting plugin comments to highlights...`);
      const highlights: Comment[] = pluginResults.allComments;

      // Log comment counts by plugin
      for (const [
        pluginName,
        count,
      ] of pluginResults.statistics.commentsByPlugin.entries()) {
        logger.info(`${pluginName} plugin generated ${count} comments`);
      }

      logger.info(`Total highlights from plugins: ${highlights.length}`);

      // Skip deduplication for now (for debugging purposes)
      // const uniqueHighlights = this.deduplicateHighlights(highlights);
      const uniqueHighlights = highlights;

      logger.info(`Final highlights: ${uniqueHighlights.length}`);

      return {
        thinking: "", // Plugin analysis doesn't provide thinking
        analysis: analysis,
        summary: summary,
        grade: undefined, // Plugins don't provide grades yet
        highlights: uniqueHighlights,
        tasks,
        errors: undefined, // TODO: Add better error tracking
        logSummary: pluginResults.logSummary,
        jobLogString: pluginResults.jobLogString,
      };
    } catch (error) {
      logger.error(
        "Document analysis failed:",
        error instanceof Error ? error : new Error(String(error))
      );

      // Return a graceful fallback result instead of throwing
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        thinking: "",
        analysis:
          "⚠️ **Analysis Error**\n\nDocument analysis could not be completed due to a system error. Please try again later.",
        summary: "Analysis failed due to system error",
        grade: undefined,
        highlights: [],
        tasks: [
          {
            name: "Plugin Analysis",
            modelName: "N/A",
            priceInDollars: 0,
            timeInSeconds: 0,
            log: `Analysis failed: ${errorMessage}`,
          },
        ],
        errors: [
          {
            plugin: "SYSTEM",
            error: errorMessage,
            recoveryAction: "Check system logs and retry the analysis",
          },
        ],
        logSummary: this.pluginLogger.generateSummary(),
        jobLogString: this.pluginLogger.generateJobLogString(),
      };
    }
  }

  /**
   * Create fresh plugin instances for each analysis to avoid state pollution
   */
  private createPluginInstances(): Map<PluginType, SimpleAnalysisPlugin> {
    // Create new plugin instances for each analysis
    const plugins = new Map<PluginType, SimpleAnalysisPlugin>([
      [PluginType.MATH, new MathPlugin()],
      [PluginType.SPELLING, new SpellingPlugin()],
      [PluginType.FACT_CHECK, new FactCheckPlugin()],
      [PluginType.FORECAST, new ForecastPlugin()],
      [PluginType.LINK_ANALYSIS, new LinkPlugin()],
    ]);

    logger.info(`Created fresh instances of ${plugins.size} plugins`);
    return plugins;
  }

  /**
   * Get selected plugins based on configuration
   */
  private async getSelectedPlugins(): Promise<SimpleAnalysisPlugin[]> {
    const allPlugins = this.createPluginInstances();

    // Default plugins if no selection specified
    const defaultPluginTypes = [
      PluginType.MATH,
      PluginType.FACT_CHECK,
      PluginType.FORECAST,
    ];

    let selectedTypes: PluginType[];

    if (this.pluginSelection?.include) {
      // Use explicitly included plugins
      selectedTypes = this.pluginSelection.include;
    } else if (this.pluginSelection?.exclude) {
      // Use defaults minus excluded plugins
      selectedTypes = defaultPluginTypes.filter(
        (type) => !this.pluginSelection!.exclude!.includes(type)
      );
    } else {
      // Use all defaults
      selectedTypes = defaultPluginTypes;
    }

    // Get the selected plugin instances
    const selectedPlugins: SimpleAnalysisPlugin[] = [];
    const selectedTypeNames: string[] = [];

    // First, add explicitly selected plugins
    for (const type of selectedTypes) {
      const plugin = allPlugins.get(type);
      if (plugin) {
        selectedPlugins.push(plugin);
        selectedTypeNames.push(type);
      }
    }

    // Note: We don't automatically add runOnAllChunks plugins anymore
    // They must be explicitly included in the selection
    // runOnAllChunks only means they bypass routing, not selection

    logger.info(
      `Selected ${selectedPlugins.length} plugins: ${selectedTypeNames.join(", ")}`
    );
    return selectedPlugins;
  }

  /**
   * Deduplicate highlights based on overlapping positions
   */
  private deduplicateHighlights(highlights: Comment[]): Comment[] {
    if (highlights.length <= 1) return highlights;

    // Filter out comments without highlights first
    const withHighlights = highlights.filter(
      (h) => h.highlight && h.highlight.startOffset !== undefined
    );
    if (withHighlights.length <= 1) return withHighlights;

    // Sort by start offset
    const sorted = [...withHighlights].sort(
      (a, b) => a.highlight!.startOffset! - b.highlight!.startOffset!
    );

    const unique: Comment[] = [];

    for (const highlight of sorted) {
      // Check if this highlight overlaps with any existing unique highlight
      const overlaps = unique.some((existing) => {
        const existingStart = existing.highlight!.startOffset!;
        const existingEnd = existing.highlight!.endOffset!;
        const currentStart = highlight.highlight!.startOffset!;
        const currentEnd = highlight.highlight!.endOffset!;

        // Check for overlap (fixed off-by-one error)
        return (
          (currentStart >= existingStart && currentStart < existingEnd) ||
          (currentEnd > existingStart && currentEnd <= existingEnd) ||
          (currentStart < existingStart && currentEnd > existingEnd)
        );
      });

      if (!overlaps) {
        unique.push(highlight);
      }
    }

    return unique;
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (!error) return false;

    // Check for common retryable error patterns
    const errorMessage = (error as unknown as Error)?.message || String(error);

    // Network/timeout errors are retryable
    if (
      errorMessage.includes("timeout") ||
      errorMessage.includes("ECONNRESET") ||
      errorMessage.includes("ETIMEDOUT") ||
      errorMessage.includes("network") ||
      errorMessage.includes("connection")
    ) {
      return true;
    }

    // Rate limiting errors are retryable
    if (
      errorMessage.includes("rate limit") ||
      errorMessage.includes("429") ||
      errorMessage.includes("too many requests")
    ) {
      return true;
    }

    // Server errors (5xx) are retryable
    if (
      errorMessage.includes("server error") ||
      errorMessage.includes("internal error") ||
      /5\d\d/.test(errorMessage)
    ) {
      return true;
    }

    // Temporary service unavailable
    if (
      errorMessage.includes("service unavailable") ||
      errorMessage.includes("temporarily unavailable")
    ) {
      return true;
    }

    return false;
  }

  /**
   * Determine the appropriate recovery action for a failed plugin
   */
  private determineRecoveryAction(pluginName: string, error: unknown): string {
    const errorMessage = (error as unknown as Error)?.message || String(error);

    // Specific recovery actions based on error type
    if (errorMessage.includes("timeout")) {
      return "Consider increasing timeout settings or reducing chunk size";
    }

    if (errorMessage.includes("rate limit")) {
      return "Implement request throttling or use different API keys";
    }

    if (
      errorMessage.includes("authentication") ||
      errorMessage.includes("unauthorized")
    ) {
      return "Check API key configuration and permissions";
    }

    if (
      errorMessage.includes("quota") ||
      errorMessage.includes("limit exceeded")
    ) {
      return "Check API usage limits and billing status";
    }

    if (errorMessage.includes("model") || errorMessage.includes("not found")) {
      return "Verify model configuration and availability";
    }

    if (
      errorMessage.includes("malformed") ||
      errorMessage.includes("invalid")
    ) {
      return "Review plugin input validation and data formatting";
    }

    // Plugin-specific recovery actions
    switch (pluginName) {
      case "MATH":
        return "Math plugin failed - analysis will continue without math checking";
      case "SPELLING":
        return "Spelling plugin failed - analysis will continue without spell checking";
      case "FACT_CHECK":
        return "Fact checking plugin failed - analysis will continue without fact verification";
      case "FORECAST":
        return "Forecast plugin failed - analysis will continue without prediction analysis";
      default:
        return `${pluginName} plugin failed - analysis will continue with remaining plugins`;
    }
  }
}
