/**
 * Plugin Manager - Coordinates document analysis with the new plugin API
 *
 * This is a simplified version that only supports the new SimpleAnalysisPlugin interface.
 * For legacy plugin support, see BasePlugin.ts which maintains backward compatibility.
 */

import type { Document } from "@/types/documents";
import type { Comment } from "@/types/documentSchema";
import type { LLMInteraction } from "@/types/llm";

import { getDocumentFullContent } from "../../utils/documentContentHelpers";
import { sessionContext } from "../helicone/sessionContext";
import type { HeliconeSessionConfig } from "../helicone/sessions";
import { logger } from "../logger";
import { createChunks } from "./TextChunk";
import { createChunksWithTool } from "./utils/createChunksWithTool";
import { PluginLogger, type JobLogSummary } from "./PluginLogger";
import {
  AnalysisResult,
  SimpleAnalysisPlugin,
} from "./types";

export interface PluginManagerConfig {
  sessionConfig?: HeliconeSessionConfig;
  useIntelligentChunking?: boolean;
  chunkingStrategy?: 'semantic' | 'fixed' | 'paragraph' | 'markdown' | 'hybrid';
  jobId?: string; // For logging integration
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
    llmInteractions: LLMInteraction[];
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
  private sessionConfig?: HeliconeSessionConfig;
  private useIntelligentChunking: boolean;
  private chunkingStrategy?: 'semantic' | 'fixed' | 'paragraph' | 'markdown' | 'hybrid';
  private startTime: number = 0;
  private pluginLogger: PluginLogger;

  constructor(config: PluginManagerConfig = {}) {
    this.sessionConfig = config.sessionConfig;
    this.useIntelligentChunking = config.useIntelligentChunking ?? false;
    this.chunkingStrategy = config.chunkingStrategy;
    this.pluginLogger = new PluginLogger(config.jobId);
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

    // Set session context if available
    if (this.sessionConfig) {
      sessionContext.setSession(this.sessionConfig);
    }

    try {
      // Log chunking phase
      this.pluginLogger.log({
        level: 'info',
        plugin: 'PluginManager',
        phase: 'chunking',
        message: `Starting document chunking - strategy: ${this.useIntelligentChunking ? this.chunkingStrategy || 'hybrid' : 'fixed'}`
      });

      // Create chunks using the appropriate method
      let chunks;
      if (this.useIntelligentChunking) {
        logger.info(`Using intelligent chunking with strategy: ${this.chunkingStrategy || 'hybrid'}`);
        chunks = await createChunksWithTool(text, {
          strategy: this.chunkingStrategy || 'hybrid',
          maxChunkSize: 1500,
          minChunkSize: 200,
          overlap: 100,
          preserveContext: true,
        });
      } else {
        chunks = createChunks(text, {
          chunkSize: 1000,
          chunkByParagraphs: false,
        });
      }

      this.pluginLogger.log({
        level: 'info',
        plugin: 'PluginManager',
        phase: 'chunking',
        message: `Created ${chunks.length} chunks for analysis`,
        context: { totalChunks: chunks.length }
      });

      // Process with each plugin in parallel with improved error recovery
      const pluginResults = new Map<string, AnalysisResult>();
      const allComments: Comment[] = [];
      let totalCost = 0;

      // Create promises for all plugin analyses with retry logic
      const pluginPromises = plugins.map(async (plugin) => {
        const pluginName = plugin.name();
        const maxRetries = 2;
        let lastError: Error | unknown = null;

        // Start plugin logging
        this.pluginLogger.pluginStarted(pluginName);

        // Create a plugin logger instance for this plugin
        const pluginLoggerInstance = this.pluginLogger.createPluginLogger(pluginName);

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const isRetry = attempt > 1;
            if (isRetry) {
              this.pluginLogger.pluginRetried(pluginName, attempt, maxRetries, 
                lastError instanceof Error ? lastError.message : String(lastError));
              // Add small delay between retries
              await new Promise((resolve) =>
                setTimeout(resolve, 1000 * attempt)
              );
            }

            const startTime = Date.now();
            
            // Add basic logging wrapper around plugin execution
            pluginLoggerInstance.startPhase('initialization', `Starting ${pluginName} analysis`);
            pluginLoggerInstance.processingChunks(chunks.length);
            
            const result = await plugin.analyze(chunks, text);
            const duration = Date.now() - startTime;

            // Log results
            pluginLoggerInstance.itemsExtracted(result.comments.length);
            pluginLoggerInstance.commentsGenerated(result.comments.length);
            pluginLoggerInstance.cost(result.cost);
            pluginLoggerInstance.endPhase('summary', `Analysis complete - ${result.comments.length} comments generated`, {
              duration,
              cost: result.cost
            });

            // Plugin completed successfully
            this.pluginLogger.pluginCompleted(pluginName, {
              itemsFound: result.comments.length,
              commentsGenerated: result.comments.length,
              cost: result.cost
            });

            return { plugin: pluginName, result, success: true };
          } catch (error) {
            lastError = error;
            const errorMessage =
              error instanceof Error ? error.message : String(error);

            pluginLoggerInstance.error(`Plugin execution failed`, error, 'analysis');

            // Check if this is a retryable error
            const isRetryable = this.isRetryableError(error);

            if (isRetryable && attempt < maxRetries) {
              // Will retry - logged in pluginRetried call above
              continue;
            } else {
              // Plugin failed permanently
              this.pluginLogger.pluginCompleted(pluginName, {
                error: errorMessage
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
      // Clear session context
      if (this.sessionConfig) {
        sessionContext.clear();
      }
    }
  }

  /**
   * High-level document analysis using all available plugins
   * This is the main entry point for full document analysis
   */
  async analyzeDocument(
    document: Document,
    options: {
      targetHighlights?: number;
    } = {}
  ): Promise<FullDocumentAnalysisResult> {
    // Input validation
    if (!document) {
      throw new Error("Document is required for analysis");
    }
    if (!document.content || document.content.trim().length === 0) {
      throw new Error("Document content is required and cannot be empty");
    }

    const tasks: FullDocumentAnalysisResult["tasks"] = [];
    const targetHighlights = Math.max(1, options.targetHighlights || 5);

    try {
      // Step 1: Run plugin-based analysis
      logger.info(`Starting document analysis with plugin system...`);
      const pluginStartTime = Date.now();

      // TODO: Make plugin selection configurable
      const plugins: SimpleAnalysisPlugin[] = [
        // Import here to avoid circular dependencies
        new (await import('./plugins/math')).MathPlugin(),
        new (await import('./plugins/spelling')).SpellingPlugin(),
        // new (await import('./plugins/fact-check')).FactCheckPlugin(),
        new (await import("./plugins/forecast")).ForecastPlugin(),
      ];

      // Get full document content with prepend
      const { content: fullContent, prependLineCount } =
        getDocumentFullContent(document);

      // Run analysis on full content using new API
      const pluginResults = await this.analyzeDocumentSimple(
        fullContent,
        plugins
      );

      const pluginDuration = Date.now() - pluginStartTime;
      logger.info(`Plugin analysis completed in ${pluginDuration}ms`);

      // Collect LLM interactions from all plugins
      const allLLMInteractions: LLMInteraction[] = [];
      for (const [pluginName, result] of pluginResults.pluginResults) {
        allLLMInteractions.push(...result.llmInteractions);
      }

      tasks.push({
        name: "Plugin Analysis",
        modelName: "claude-3-5-sonnet-20241022", // Update to current model
        priceInDollars: pluginResults.statistics.totalCost,
        timeInSeconds: pluginDuration / 1000,
        log: `Analyzed ${pluginResults.statistics.totalChunks} chunks, generated ${pluginResults.statistics.totalComments} comments using ${plugins.length} plugins.`,
        llmInteractions: allLLMInteractions,
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

      // Deduplicate highlights that might overlap
      const uniqueHighlights = this.deduplicateHighlights(highlights);

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
      logger.error("Document analysis failed:", error);

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
            llmInteractions: [],
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
   * Deduplicate highlights based on overlapping positions
   */
  private deduplicateHighlights(highlights: Comment[]): Comment[] {
    if (highlights.length <= 1) return highlights;

    // Sort by start offset
    const sorted = [...highlights].sort(
      (a, b) => a.highlight.startOffset - b.highlight.startOffset
    );

    const unique: Comment[] = [];

    for (const highlight of sorted) {
      // Check if this highlight overlaps with any existing unique highlight
      const overlaps = unique.some((existing) => {
        const existingStart = existing.highlight.startOffset;
        const existingEnd = existing.highlight.endOffset;
        const currentStart = highlight.highlight.startOffset;
        const currentEnd = highlight.highlight.endOffset;

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
    const errorMessage = (error as any)?.message || String(error);

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
    const errorMessage = (error as any)?.message || String(error);

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
