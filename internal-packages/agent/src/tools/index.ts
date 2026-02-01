/**
 * MCP Tool wrappers for evaluation plugins
 *
 * These tools wrap the existing @roast/ai plugins and expose them
 * as MCP tools that can be used by the Claude Agent SDK.
 *
 * Uses PluginManager as the entry point to avoid circular dependency issues.
 */

import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { PluginManager } from '@roast/ai/server';
import { PluginType, type Comment } from '@roast/ai';
import type { PluginToolResult } from '../types/index.js';

// Helper to convert plugin results to a serializable format
function formatPluginResult(result: {
  summary: string;
  analysis: string;
  highlights: Comment[];
}): PluginToolResult {
  return {
    summary: result.summary,
    analysis: result.analysis,
    comments: result.highlights.map(c => ({
      header: c.header || 'Finding',
      description: c.description,
      severity: c.level || 'info',
      location: c.highlight ? {
        start: c.highlight.startOffset,
        end: c.highlight.endOffset,
        text: c.highlight.quotedText || '',
      } : undefined,
    })),
    cost: 0, // Cost tracked separately
  };
}

/**
 * Fact Check Tool
 * Verifies factual claims in a document
 */
export const factCheckTool = tool(
  'fact_check',
  'Verify factual claims in a document. Returns findings with specific locations and verdicts.',
  {
    documentText: z.string().describe('The full document text to analyze for factual claims'),
  },
  async ({ documentText }) => {
    const manager = new PluginManager({
      pluginSelection: { include: [PluginType.FACT_CHECK] },
    });

    const result = await manager.analyzeDocument(documentText);
    const formatted = formatPluginResult(result);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(formatted, null, 2),
      }],
    };
  }
);

/**
 * Fallacy Check Tool
 * Identifies logical fallacies and reasoning errors
 */
export const fallacyCheckTool = tool(
  'fallacy_check',
  'Identify logical fallacies and reasoning errors in a document. Uses principle of charity.',
  {
    documentText: z.string().describe('The full document text to analyze for logical fallacies'),
  },
  async ({ documentText }) => {
    const manager = new PluginManager({
      pluginSelection: { include: [PluginType.FALLACY_CHECK] },
    });

    const result = await manager.analyzeDocument(documentText);
    const formatted = formatPluginResult(result);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(formatted, null, 2),
      }],
    };
  }
);

/**
 * Spell Check Tool
 * Checks grammar, spelling, and style
 */
export const spellCheckTool = tool(
  'spell_check',
  'Check grammar, spelling, and writing style in a document.',
  {
    documentText: z.string().describe('The full document text to check for spelling/grammar'),
  },
  async ({ documentText }) => {
    const manager = new PluginManager({
      pluginSelection: { include: [PluginType.SPELLING] },
    });

    const result = await manager.analyzeDocument(documentText);
    const formatted = formatPluginResult(result);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(formatted, null, 2),
      }],
    };
  }
);

/**
 * Math Check Tool
 * Validates mathematical expressions and calculations
 */
export const mathCheckTool = tool(
  'math_check',
  'Validate mathematical expressions and calculations in a document.',
  {
    documentText: z.string().describe('The full document text to check for math errors'),
  },
  async ({ documentText }) => {
    const manager = new PluginManager({
      pluginSelection: { include: [PluginType.MATH] },
    });

    const result = await manager.analyzeDocument(documentText);
    const formatted = formatPluginResult(result);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(formatted, null, 2),
      }],
    };
  }
);

/**
 * Forecast Check Tool
 * Validates forecasting claims and predictions
 */
export const forecastCheckTool = tool(
  'forecast_check',
  'Validate forecasting claims and predictions in a document.',
  {
    documentText: z.string().describe('The full document text to check for forecast analysis'),
  },
  async ({ documentText }) => {
    const manager = new PluginManager({
      pluginSelection: { include: [PluginType.FORECAST] },
    });

    const result = await manager.analyzeDocument(documentText);
    const formatted = formatPluginResult(result);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(formatted, null, 2),
      }],
    };
  }
);

/**
 * Create the MCP server with all evaluation tools
 */
export const evaluationServer = createSdkMcpServer({
  name: 'roast-evaluators',
  version: '1.0.0',
  tools: [
    factCheckTool,
    fallacyCheckTool,
    spellCheckTool,
    mathCheckTool,
    forecastCheckTool,
  ],
});

export {
  factCheckTool as factCheck,
  fallacyCheckTool as fallacyCheck,
  spellCheckTool as spellCheck,
  mathCheckTool as mathCheck,
  forecastCheckTool as forecastCheck,
};
