/**
 * MCP Tool wrappers for evaluation plugins
 *
 * These tools wrap the existing @roast/ai plugins and expose them
 * as MCP tools that can be used by the Claude Agent SDK.
 *
 * Uses factory pattern to allow passing profile IDs for configurable plugins.
 */

import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { PluginManager } from "../../PluginManager";
import { PluginType } from "../../types/plugin-types";
import type { Comment } from "../../../shared/types";

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
// Tool Factories
// ---------------------------------------------------------------------------

function createFactCheckTool() {
  return tool(
    "fact_check",
    "Verify factual claims in a document. Returns findings with specific locations and verdicts.",
    {
      documentText: z
        .string()
        .describe("The full document text to analyze for factual claims"),
    },
    async ({ documentText }) => {
      const manager = new PluginManager({
        pluginSelection: { include: [PluginType.FACT_CHECK] },
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

function createFallacyCheckTool(config: EvaluationServerConfig) {
  return tool(
    "fallacy_check",
    "Identify logical fallacies and reasoning errors in a document. Uses principle of charity.",
    {
      documentText: z
        .string()
        .describe("The full document text to analyze for logical fallacies"),
    },
    async ({ documentText }) => {
      const manager = new PluginManager({
        pluginSelection: { include: [PluginType.FALLACY_CHECK] },
        fallacyCheckProfileId: config.fallacyCheckProfileId,
        fallacyCheckAgentId: config.fallacyCheckAgentId,
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
// MCP Server Factory
// ---------------------------------------------------------------------------

/**
 * Create an MCP server with all evaluation tools.
 * Accepts config to customize plugin behavior (e.g., fallacy checker profile).
 */
export function createEvaluationServer(config: EvaluationServerConfig = {}) {
  return createSdkMcpServer({
    name: "roast-evaluators",
    version: "1.0.0",
    tools: [
      createFactCheckTool(),
      createFallacyCheckTool(config),
      createSpellCheckTool(),
      createMathCheckTool(),
      createForecastCheckTool(),
    ],
  });
}
