/**
 * @roast/agent - Research Agent Package
 *
 * A powerful document analysis agent using the Claude Agent SDK.
 * Features:
 * - Specialized subagents for different analysis tasks
 * - MCP tools wrapping evaluation plugins
 * - Session persistence for iterative analysis
 * - Web search capability
 */

// Main agent functionality
export { runResearchAgent, runQuickCheck } from './agent/index.js';

// Prompts (for customization)
export { ORCHESTRATOR_PROMPT, SUBAGENT_PROMPTS, buildAnalysisPrompt } from './agent/prompts.js';

// MCP tools (for direct use)
export {
  evaluationServer,
  factCheck,
  fallacyCheck,
  spellCheck,
  mathCheck,
  forecastCheck,
} from './tools/index.js';

// Types
export type {
  AgentResult,
  AgentMetadata,
  ResearchAgentConfig,
  Finding,
  PluginToolResult,
  PluginComment,
} from './types/index.js';
