/**
 * Research Agent Implementation
 *
 * Uses the Claude Agent SDK with full features:
 * - Specialized subagents for different analysis tasks
 * - MCP tools wrapping evaluation plugins
 * - Session persistence for iterative analysis
 * - Web search capability
 */

import { query, type AgentDefinition, type Options } from '@anthropic-ai/claude-agent-sdk';
import { evaluationServer } from '../tools/index.js';
import { ORCHESTRATOR_PROMPT, SUBAGENT_PROMPTS, buildAnalysisPrompt } from './prompts.js';
import type { AgentResult, AgentMetadata, ResearchAgentConfig, Finding } from '../types/index.js';

/**
 * Define the specialized subagents
 */
const SUBAGENTS: Record<string, AgentDefinition> = {
  'fact-checker': {
    description: 'Specialist in verifying factual claims against reliable sources',
    prompt: SUBAGENT_PROMPTS.factChecker,
    model: 'sonnet', // Cost-effective for focused tasks
    tools: ['mcp__roast-evaluators__fact_check', 'WebSearch'],
  },
  'logic-analyzer': {
    description: 'Expert at identifying logical fallacies and reasoning errors',
    prompt: SUBAGENT_PROMPTS.logicAnalyzer,
    model: 'sonnet',
    tools: ['mcp__roast-evaluators__fallacy_check'],
  },
  'quality-checker': {
    description: 'Specialist in writing quality, grammar, and style',
    prompt: SUBAGENT_PROMPTS.qualityChecker,
    model: 'haiku', // Fast and cheap for grammar
    tools: ['mcp__roast-evaluators__spell_check'],
  },
  'technical-checker': {
    description: 'Expert at validating math, links, and technical claims',
    prompt: SUBAGENT_PROMPTS.technicalChecker,
    model: 'sonnet',
    tools: [
      'mcp__roast-evaluators__math_check',
      'mcp__roast-evaluators__forecast_check',
    ],
  },
  'researcher': {
    description: 'Web research specialist for gathering context and verifying claims',
    prompt: SUBAGENT_PROMPTS.researcher,
    model: 'sonnet',
    tools: ['WebSearch', 'WebFetch'],
  },
};

/**
 * Run the research agent to analyze a document
 *
 * @param task - The analysis task to perform
 * @param documentText - The document content to analyze
 * @param config - Optional configuration
 * @returns Analysis result with findings and metadata
 */
export async function runResearchAgent(
  task: string,
  documentText: string,
  config: ResearchAgentConfig = {}
): Promise<AgentResult> {
  const {
    model = 'opus',
    maxTurns = 50,
    sessionId,
    maxBudgetUsd,
    enableWebSearch = true,
  } = config;

  const startTime = Date.now();

  // Build allowed tools list
  const allowedTools = [
    // Our evaluation tools via MCP
    'mcp__roast-evaluators__fact_check',
    'mcp__roast-evaluators__fallacy_check',
    'mcp__roast-evaluators__spell_check',
    'mcp__roast-evaluators__math_check',
    'mcp__roast-evaluators__forecast_check',
    // Task tool for spawning subagents
    'Task',
    // File reading for context
    'Read',
  ];

  // Add web tools if enabled
  if (enableWebSearch) {
    allowedTools.push('WebSearch', 'WebFetch');
  }

  // Build SDK options
  const options: Options = {
    model,
    maxTurns,
    systemPrompt: ORCHESTRATOR_PROMPT,

    // Resume previous session if provided
    ...(sessionId && { resume: sessionId }),

    // MCP servers for evaluation tools
    mcpServers: {
      'roast-evaluators': evaluationServer,
    },

    // All available tools
    allowedTools,

    // Specialized subagents
    agents: SUBAGENTS,

    // Budget limit if specified
    ...(maxBudgetUsd && { maxBudgetUsd }),

    // Don't ask for permissions in automated mode
    permissionMode: 'acceptEdits',
  };

  // Initialize result
  const result: AgentResult = {
    sessionId: '',
    synthesis: '',
    findings: [],
    metadata: {
      toolCalls: 0,
      subagentCalls: 0,
      costUSD: 0,
      durationMs: 0,
      model,
    },
  };

  // Build the prompt
  const prompt = buildAnalysisPrompt(task, documentText);

  // Stream the agent execution
  for await (const message of query({ prompt, options })) {
    // Capture session ID for potential resume
    if ('session_id' in message && message.session_id) {
      result.sessionId = message.session_id;
    }

    // Track tool usage from assistant messages
    if (message.type === 'assistant' && message.message) {
      const content = message.message.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === 'tool_use') {
            result.metadata.toolCalls++;
            if (block.name === 'Task') {
              result.metadata.subagentCalls++;
            }
          }
          // Capture text output
          if (block.type === 'text') {
            result.synthesis += block.text;
          }
        }
      }
    }

    // Capture final result
    if (message.type === 'result') {
      if (message.subtype === 'success') {
        result.metadata.costUSD = message.total_cost_usd || 0;
        // Final result text
        if (message.result) {
          result.synthesis = message.result;
        }
      }
    }
  }

  result.metadata.durationMs = Date.now() - startTime;

  // Parse findings from synthesis (basic extraction)
  result.findings = extractFindings(result.synthesis);

  return result;
}

/**
 * Extract findings from the synthesis text
 * This is a simple extraction - in production you'd want structured output
 */
function extractFindings(synthesis: string): Finding[] {
  const findings: Finding[] = [];

  // Look for common finding patterns
  const patterns = [
    /(?:issue|error|problem|finding):\s*(.+?)(?:\n|$)/gi,
    /(?:⚠️|❌|🔴)\s*(.+?)(?:\n|$)/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(synthesis)) !== null) {
      findings.push({
        type: 'extracted',
        severity: 'medium',
        message: match[1].trim(),
        source: 'synthesis',
      });
    }
  }

  return findings;
}

/**
 * Run a quick single-plugin analysis
 * Useful for targeted checks without full orchestration
 */
export async function runQuickCheck(
  documentText: string,
  checkType: 'fact' | 'fallacy' | 'spell' | 'math' | 'forecast',
  config: Pick<ResearchAgentConfig, 'model' | 'maxTurns'> = {}
): Promise<AgentResult> {
  const { model = 'sonnet', maxTurns = 10 } = config;

  const toolName = {
    fact: 'mcp__roast-evaluators__fact_check',
    fallacy: 'mcp__roast-evaluators__fallacy_check',
    spell: 'mcp__roast-evaluators__spell_check',
    math: 'mcp__roast-evaluators__math_check',
    forecast: 'mcp__roast-evaluators__forecast_check',
  }[checkType];

  const prompt = `Analyze this document using the ${checkType}_check tool:

<document>
${documentText}
</document>

Use the ${toolName} tool to analyze the document, then summarize the findings.`;

  const options: Options = {
    model,
    maxTurns,
    mcpServers: {
      'roast-evaluators': evaluationServer,
    },
    allowedTools: [toolName],
    permissionMode: 'acceptEdits',
  };

  const startTime = Date.now();
  const result: AgentResult = {
    sessionId: '',
    synthesis: '',
    findings: [],
    metadata: {
      toolCalls: 0,
      subagentCalls: 0,
      costUSD: 0,
      durationMs: 0,
      model,
    },
  };

  for await (const message of query({ prompt, options })) {
    if ('session_id' in message && message.session_id) {
      result.sessionId = message.session_id;
    }

    if (message.type === 'assistant' && message.message) {
      const content = message.message.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === 'tool_use') {
            result.metadata.toolCalls++;
          }
          if (block.type === 'text') {
            result.synthesis += block.text;
          }
        }
      }
    }

    if (message.type === 'result' && message.subtype === 'success') {
      result.metadata.costUSD = message.total_cost_usd || 0;
      if (message.result) {
        result.synthesis = message.result;
      }
    }
  }

  result.metadata.durationMs = Date.now() - startTime;
  result.findings = extractFindings(result.synthesis);

  return result;
}
