/**
 * MCP Tool wrappers for evaluation plugins
 *
 * These tools wrap the existing @roast/ai plugins and expose them
 * as MCP tools that can be used by the Claude Agent SDK.
 *
 * The fallacy checker is decomposed into granular tools (extract, charity filter,
 * supported-elsewhere filter) so the agent has full visibility into each stage.
 * Other plugins are exposed as bulk pipeline tools.
 */

import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { PluginManager } from "../../PluginManager";
import { PluginType } from "../../types/plugin-types";
import type { Comment } from "../../../shared/types";
import { logger as appLogger } from "../../../shared/logger";

// Granular fallacy checker tools
import { principleOfCharityFilterTool } from "../../../tools/principle-of-charity-filter";
import { supportedElsewhereFilterTool } from "../../../tools/supported-elsewhere-filter";

// Perplexity research tool
import { perplexityResearchTool } from "../../../tools/perplexity-researcher";

// Article fetch pipeline (Diffbot → Firecrawl → GraphQL → JSDOM)
import { processArticle } from "../../../utils/articleFetch";

// Profile loading for fallacy checker config
import { loadProfileOrDefault } from "../fallacy-check/profile-loader";
import type { FallacyCheckerProfileConfig } from "../fallacy-check/profile-types";

// Shared extraction pipeline (multi-extractor + dedup + judge + priority sort)
import { runExtractionPipeline } from "../fallacy-check/extraction/pipeline";
import { profileToMultiExtractorConfig } from "../fallacy-check/extraction/config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PluginToolComment {
  header: string;
  description: string;
  severity: string;
  location?: {
    start: number;
    end: number;
    text: string;
  };
}

interface PluginToolResult {
  summary: string;
  analysis: string;
  comments: PluginToolComment[];
  cost: number;
}

export interface EvaluationServerConfig {
  /** Profile ID for fallacy checker plugin */
  fallacyCheckProfileId?: string;
  /** Agent ID for fallacy checker default profile loading */
  fallacyCheckAgentId?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** ToolContext for calling internal @roast/ai tools */
const toolContext = {
  logger: {
    info: (msg: string, ...args: unknown[]) => appLogger.info(msg, ...args),
    warn: (msg: string, ...args: unknown[]) => appLogger.warn(msg, ...args),
    error: (msg: string, ...args: unknown[]) => appLogger.error(msg, ...args),
    debug: (msg: string, ...args: unknown[]) => appLogger.debug(msg, ...args),
  },
};

async function loadFallacyProfile(config: EvaluationServerConfig): Promise<FallacyCheckerProfileConfig> {
  return loadProfileOrDefault(
    config.fallacyCheckProfileId,
    config.fallacyCheckAgentId ?? "system-fallacy-check"
  );
}

function formatPluginResult(result: {
  summary: string;
  analysis: string;
  highlights: Comment[];
}): PluginToolResult {
  return {
    summary: result.summary,
    analysis: result.analysis,
    comments: result.highlights.map((c) => ({
      header: c.header || "Finding",
      description: c.description,
      severity: c.level || "info",
      location: c.highlight
        ? {
            start: c.highlight.startOffset,
            end: c.highlight.endOffset,
            text: c.highlight.quotedText || "",
          }
        : undefined,
    })),
    cost: 0,
  };
}

// ---------------------------------------------------------------------------
// Bulk Pipeline Tools (spell-check, math-check, forecast-check)
// ---------------------------------------------------------------------------

function createSpellCheckTool() {
  return tool(
    "spell_check",
    "Check grammar, spelling, and writing style in a document.",
    {
      documentText: z
        .string()
        .describe("The full document text to check for spelling/grammar"),
    },
    async ({ documentText }) => {
      const manager = new PluginManager({
        pluginSelection: { include: [PluginType.SPELLING] },
      });
      const result = await manager.analyzeDocument(documentText);
      const formatted = formatPluginResult(result);
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(formatted, null, 2) },
        ],
      };
    }
  );
}

function createMathCheckTool() {
  return tool(
    "math_check",
    "Validate mathematical expressions and calculations in a document.",
    {
      documentText: z
        .string()
        .describe("The full document text to check for math errors"),
    },
    async ({ documentText }) => {
      const manager = new PluginManager({
        pluginSelection: { include: [PluginType.MATH] },
      });
      const result = await manager.analyzeDocument(documentText);
      const formatted = formatPluginResult(result);
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(formatted, null, 2) },
        ],
      };
    }
  );
}

function createForecastCheckTool() {
  return tool(
    "forecast_check",
    "Validate forecasting claims and predictions in a document.",
    {
      documentText: z
        .string()
        .describe("The full document text to check for forecast analysis"),
    },
    async ({ documentText }) => {
      const manager = new PluginManager({
        pluginSelection: { include: [PluginType.FORECAST] },
      });
      const result = await manager.analyzeDocument(documentText);
      const formatted = formatPluginResult(result);
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(formatted, null, 2) },
        ],
      };
    }
  );
}

// ---------------------------------------------------------------------------
// Granular Fallacy Checker Tools
// ---------------------------------------------------------------------------

/**
 * Extract epistemic issues from a document using the full extraction pipeline.
 * Runs multiple extractors in parallel, deduplicates via Jaccard similarity,
 * optionally runs LLM judge for consensus, then sorts by priority.
 * Uses profile config for models, thresholds, and prompts.
 */
function createFallacyExtractTool(config: EvaluationServerConfig) {
  return tool(
    "fallacy_extract",
    "Extract logical fallacies, reasoning errors, and epistemic issues from a document. Runs multiple extractors in parallel with deduplication and optional LLM judge aggregation. Returns findings with severity/confidence/importance scores. Use this FIRST, then apply filters to refine.",
    {
      documentText: z
        .string()
        .describe("The full document text to analyze for epistemic issues"),
    },
    async ({ documentText }) => {
      const profile = await loadFallacyProfile(config);

      // Build multi-extractor config from profile
      const extractorConfig = profileToMultiExtractorConfig(profile);

      // Run the full extraction pipeline
      const pipelineResult = await runExtractionPipeline({
        documentText,
        config: {
          ...extractorConfig,
          thresholds: {
            minSeverityThreshold: profile.thresholds.minSeverityThreshold,
            maxIssues: profile.thresholds.maxIssues,
          },
          customPrompts: profile.prompts ? {
            extractorSystemPrompt: profile.prompts.extractorSystemPrompt,
            extractorUserPrompt: profile.prompts.extractorUserPrompt,
          } : undefined,
        },
      });

      // Return issues with pipeline metadata for agent visibility
      const output = {
        totalExtractors: pipelineResult.extractorResults.length,
        extractors: pipelineResult.extractorResults.map((r) => ({
          extractorId: r.extractorId,
          durationMs: r.durationMs,
          issueCount: r.issues.length,
          costUsd: r.unifiedUsage?.costUsd ?? r.costUsd,
          error: r.error,
        })),
        dedup: pipelineResult.dedup,
        judge: pipelineResult.judge ? {
          acceptedCount: pipelineResult.judge.acceptedCount,
          rejectedCount: pipelineResult.judge.rejectedCount,
        } : undefined,
        totalDurationMs: pipelineResult.totalDurationMs,
        issues: pipelineResult.issues.map((issue) => ({
          exactText: issue.exactText,
          issueType: issue.issueType,
          fallacyType: issue.fallacyType,
          severityScore: issue.severityScore,
          confidenceScore: issue.confidenceScore,
          importanceScore: issue.importanceScore,
          reasoning: issue.reasoning,
        })),
      };

      return {
        content: [
          { type: "text" as const, text: JSON.stringify(output, null, 2) },
        ],
      };
    }
  );
}

/**
 * Apply principle of charity filter to extracted issues.
 * Returns both valid issues AND dissolved issues with charitable interpretations.
 * Uses profile filter chain config for model/temperature/reasoning.
 */
function createCharityFilterTool(config: EvaluationServerConfig) {
  return tool(
    "fallacy_charity_filter",
    "Apply the principle of charity to extracted issues. Evaluates whether each issue holds up when the author's argument is interpreted in its strongest form. Returns BOTH valid issues and dissolved issues with explanations.",
    {
      documentText: z
        .string()
        .describe("The full document text for context"),
      issues: z
        .array(
          z.object({
            quotedText: z.string().describe("The exact text flagged as an issue"),
            issueType: z.string().describe("Type of issue (e.g. LOGICAL_FALLACY, MISINFORMATION)"),
            reasoning: z.string().describe("Why this was flagged as an issue"),
          })
        )
        .describe("Issues to evaluate with principle of charity"),
    },
    async ({ documentText, issues }) => {
      const profile = await loadFallacyProfile(config);
      const filterConfig = profile.filterChain.find(
        (f) => f.type === "principle-of-charity" && f.enabled
      );

      const result = await principleOfCharityFilterTool.execute(
        {
          documentText,
          issues,
          ...(filterConfig && "model" in filterConfig && filterConfig.model && { model: filterConfig.model }),
          ...(filterConfig && "temperature" in filterConfig && filterConfig.temperature != null && { temperature: filterConfig.temperature as number }),
          ...(filterConfig && "reasoning" in filterConfig && filterConfig.reasoning != null && { reasoning: filterConfig.reasoning }),
          ...(filterConfig && "provider" in filterConfig && filterConfig.provider && { provider: filterConfig.provider }),
          ...(filterConfig && "customPrompt" in filterConfig && filterConfig.customPrompt && { customPrompt: filterConfig.customPrompt }),
        },
        toolContext
      );

      const output = {
        validIssues: result.validIssues.map((r) => ({
          index: r.index,
          quotedText: issues[r.index]?.quotedText,
          charitableInterpretation: r.charitableInterpretation,
          explanation: r.explanation,
        })),
        dissolvedIssues: result.dissolvedIssues.map((r) => ({
          index: r.index,
          quotedText: issues[r.index]?.quotedText,
          charitableInterpretation: r.charitableInterpretation,
          explanation: r.explanation,
        })),
      };

      return {
        content: [
          { type: "text" as const, text: JSON.stringify(output, null, 2) },
        ],
      };
    }
  );
}

/**
 * Check if issues are supported/addressed elsewhere in the document.
 * Returns both unsupported issues AND supported issues with locations.
 * Uses profile filter chain config for model/temperature/reasoning.
 */
function createSupportedElsewhereFilterTool(config: EvaluationServerConfig) {
  return tool(
    "fallacy_supported_elsewhere",
    "Check if flagged issues are actually supported, explained, or qualified elsewhere in the document. Returns BOTH unsupported issues (real problems) and supported issues (false positives) with locations.",
    {
      documentText: z
        .string()
        .describe("The full document text to search for support"),
      issues: z
        .array(
          z.object({
            quotedText: z.string().describe("The exact text flagged as an issue"),
            issueType: z.string().describe("Type of issue"),
            reasoning: z.string().describe("Why this was flagged"),
          })
        )
        .describe("Issues to check for support elsewhere in document"),
    },
    async ({ documentText, issues }) => {
      const profile = await loadFallacyProfile(config);
      const filterConfig = profile.filterChain.find(
        (f) => f.type === "supported-elsewhere" && f.enabled
      );

      const result = await supportedElsewhereFilterTool.execute(
        {
          documentText,
          issues,
          ...(filterConfig && "model" in filterConfig && filterConfig.model && { model: filterConfig.model }),
          ...(filterConfig && "temperature" in filterConfig && filterConfig.temperature != null && { temperature: filterConfig.temperature as number }),
          ...(filterConfig && "reasoning" in filterConfig && filterConfig.reasoning != null && { reasoning: filterConfig.reasoning }),
          ...(filterConfig && "provider" in filterConfig && filterConfig.provider && { provider: filterConfig.provider }),
          ...(filterConfig && "customPrompt" in filterConfig && filterConfig.customPrompt && { customPrompt: filterConfig.customPrompt }),
        },
        toolContext
      );

      const output = {
        unsupportedIssues: result.unsupportedIssues.map((r) => ({
          index: r.index,
          quotedText: issues[r.index]?.quotedText,
          explanation: r.explanation,
        })),
        supportedIssues: result.supportedIssues.map((r) => ({
          index: r.index,
          quotedText: issues[r.index]?.quotedText,
          supportLocation: r.supportLocation,
          explanation: r.explanation,
        })),
      };

      return {
        content: [
          { type: "text" as const, text: JSON.stringify(output, null, 2) },
        ],
      };
    }
  );
}

// ---------------------------------------------------------------------------
// Perplexity Research Tool
// ---------------------------------------------------------------------------

function createPerplexityResearchTool() {
  return tool(
    "perplexity_research",
    "Research a factual claim or question using Perplexity Sonar (web-search-grounded AI). Returns a summary with sources and key findings. Use this to verify factual claims with high-quality, cited web research.",
    {
      query: z
        .string()
        .describe("The research query or factual claim to verify"),
      focusArea: z
        .enum(["general", "academic", "news", "technical", "market"])
        .optional()
        .describe("Focus area for research (default: general)"),
    },
    async ({ query, focusArea }) => {
      const result = await perplexityResearchTool.execute(
        { query, focusArea: focusArea ?? "general", maxSources: 5 },
        toolContext
      );
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    }
  );
}

// ---------------------------------------------------------------------------
// Web Fetch Tool (replaces SDK's built-in WebFetch which hangs on heavy pages)
// ---------------------------------------------------------------------------

/** Max content length returned to the agent (~50k chars) */
const WEB_FETCH_MAX_CONTENT_LENGTH = 50_000;

/** Hard timeout for the entire fetch pipeline (seconds) */
const WEB_FETCH_TIMEOUT_MS = 30_000;

function createWebFetchTool() {
  return tool(
    "web_fetch",
    "Fetch a web page and return its content as clean markdown. Uses Diffbot/Firecrawl/JSDOM pipeline with a 30-second timeout. Returns title, author, and markdown content. Use this instead of the SDK's built-in WebFetch which can hang on JS-heavy pages.",
    {
      url: z
        .string()
        .url()
        .describe("The URL to fetch"),
    },
    async ({ url }) => {
      try {
        const result = await Promise.race([
          processArticle(url),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("web_fetch timed out after 30 seconds")), WEB_FETCH_TIMEOUT_MS)
          ),
        ]);

        // Determine which source was used based on content characteristics
        let source = "unknown";
        if (url.includes("lesswrong.com") || url.includes("forum.effectivealtruism.org")) {
          source = "graphql-api";
        } else if (process.env.DIFFBOT_KEY) {
          source = "diffbot-or-firecrawl";
        } else if (process.env.FIRECRAWL_KEY) {
          source = "firecrawl";
        } else {
          source = "jsdom-fallback";
        }

        const content = result.content.length > WEB_FETCH_MAX_CONTENT_LENGTH
          ? result.content.slice(0, WEB_FETCH_MAX_CONTENT_LENGTH) + "\n\n[Content truncated — original was " + result.content.length + " chars]"
          : result.content;

        const output = {
          url: result.url,
          title: result.title,
          author: result.author,
          content,
          contentLength: result.content.length,
          source,
        };

        return {
          content: [
            { type: "text" as const, text: JSON.stringify(output, null, 2) },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        appLogger.error(`web_fetch failed for ${url}: ${message}`);

        const output = {
          url,
          error: message,
          suggestion: "The URL could not be fetched. Try a different URL, use WebSearch to find alternative sources, or ask the user to provide the content directly.",
        };

        return {
          content: [
            { type: "text" as const, text: JSON.stringify(output, null, 2) },
          ],
        };
      }
    }
  );
}

// ---------------------------------------------------------------------------
// MCP Server Factory
// ---------------------------------------------------------------------------

/**
 * Create an MCP server with all evaluation tools.
 * Fallacy checker is decomposed into granular tools (extract, charity filter,
 * supported-elsewhere filter). Other plugins are bulk pipeline tools.
 */
export function createEvaluationServer(config: EvaluationServerConfig = {}) {
  return createSdkMcpServer({
    name: "roast-evaluators",
    version: "1.0.0",
    tools: [
      // Research tools
      createPerplexityResearchTool(),
      createWebFetchTool(),
      // Bulk pipeline tools
      createSpellCheckTool(),
      createMathCheckTool(),
      createForecastCheckTool(),
      // Granular fallacy checker tools (profile-driven)
      createFallacyExtractTool(config),
      createCharityFilterTool(config),
      createSupportedElsewhereFilterTool(config),
    ],
  });
}
