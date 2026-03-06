/**
 * Multi-Agent Orchestrator
 *
 * Defines sub-agent configurations and builds SDK query options
 * for multi-agent document analysis. Used when enableSubAgents: true in the profile.
 *
 * All prompt text lives in prompts.ts — this file handles wiring and SDK options.
 */

import { resolve } from "path";
import type { AgentDefinition, Options, McpSdkServerConfigWithInstance } from "@anthropic-ai/claude-agent-sdk";
import type { AgenticProfileConfig } from "./profile-types";
import { DEFAULT_SUBAGENTS } from "./profile-types";
import {
  AGENTIC_SYSTEM_PROMPT,
  ORCHESTRATOR_AGENT_BRIEFS,
  SUBAGENT_PROMPTS,
  SUBAGENT_DESCRIPTIONS,
  buildOrchestratorPrompt,
  buildOrchestratorMcpAddendum,
  getWorkspaceInstructions,
  getMcpToolInstructions,
} from "./prompts";
import { logger } from "../../../shared/logger";
import { getCurrentJobId } from "../../../shared/jobContext";

// ---------------------------------------------------------------------------
// Workspace filesystem guard — denies Read/Write/Edit/Glob/Grep outside workspace
// ---------------------------------------------------------------------------

const FILE_ACCESS_TOOLS = new Set(["Read", "Write", "Edit", "Glob", "Grep", "NotebookEdit"]);

// Built-in agents that should be blocked from spawning via Task tool
const BLOCKED_BUILTIN_AGENTS = new Set(["general-purpose"]);

type EmitFn = (event: { type: string; message: string }) => void;

/**
 * Combined canUseTool guard:
 * 1. Blocks Task tool calls targeting built-in agents we don't want (e.g. general-purpose)
 * 2. Restricts file access tools to the workspace directory
 * Emits status events for visibility in the UI stream.
 */
function createToolGuard(workspacePath?: string, emit?: EmitFn) {
  const resolvedWorkspace = workspacePath ? resolve(workspacePath) : null;

  return async (toolName: string, input: Record<string, unknown>) => {
    // Block spawning unwanted built-in agents
    if (toolName === "Task") {
      const agentType = (input as { subagent_type?: string }).subagent_type;
      if (agentType && BLOCKED_BUILTIN_AGENTS.has(agentType)) {
        const msg = `Blocked spawning built-in agent: ${agentType}`;
        logger.warn(msg);
        emit?.({ type: "status", message: msg });
        return {
          behavior: "deny" as const,
          message: `Agent "${agentType}" is disabled. Use the specialized sub-agents instead.`,
        };
      }
    }

    // Workspace filesystem guard
    if (resolvedWorkspace && FILE_ACCESS_TOOLS.has(toolName)) {
      const filePath =
        (input as { file_path?: string }).file_path ??
        (input as { path?: string }).path ??
        (input as { notebook_path?: string }).notebook_path;

      if (filePath && typeof filePath === "string") {
        const resolvedPath = resolve(workspacePath!, filePath);
        // Use separator-aware check to prevent prefix-based traversal
        // (e.g. /tmp/agentic-evil matching /tmp/agentic-abc)
        if (!resolvedPath.startsWith(resolvedWorkspace + "/") && resolvedPath !== resolvedWorkspace) {
          const msg = `Workspace guard denied ${toolName} access to: ${filePath}`;
          logger.warn(msg);
          emit?.({ type: "status", message: msg });
          return {
            behavior: "deny" as const,
            message: `Access denied: ${filePath} is outside workspace ${workspacePath}`,
          };
        }
      }
    }

    return { behavior: "allow" as const, updatedInput: input };
  };
}

// Default orchestrator prompt with all agents listed (used as reference/placeholder by UI)
export const ORCHESTRATOR_PROMPT = buildOrchestratorPrompt(Object.keys(ORCHESTRATOR_AGENT_BRIEFS));

// File tools for workspace access (used in allowedTools for orchestrator)
const FILE_TOOLS = ["Read", "Write", "Edit", "Glob", "Grep", "TodoWrite"] as const;

// ---------------------------------------------------------------------------
// Build sub-agent definitions from profile config
// ---------------------------------------------------------------------------

export function buildSubAgentDefinitions(
  config: AgenticProfileConfig,
  workspacePath?: string
): Record<string, AgentDefinition> {
  const subAgentConfigs = config.subAgents ?? DEFAULT_SUBAGENTS;
  const agents: Record<string, AgentDefinition> = {};

  for (const [name, sa] of Object.entries(subAgentConfigs)) {
    if (!sa.enabled) continue;

    const defaultPrompt = SUBAGENT_PROMPTS[name as keyof typeof SUBAGENT_PROMPTS];
    if (!defaultPrompt) continue;

    // Use custom prompt if provided, otherwise use default
    let prompt = sa.prompt?.trim() || defaultPrompt;

    // If workspace is available, add per-agent workspace instructions
    if (workspacePath) {
      const hasFactChecker = !!(subAgentConfigs["fact-checker"]?.enabled);
      const workspaceInstructions = getWorkspaceInstructions(name, workspacePath, hasFactChecker);
      prompt += `\n\n${workspaceInstructions}`;
    }

    // If MCP tools are enabled, add instructions for using them
    if (config.enableMcpTools) {
      const mcpInstructions = getMcpToolInstructions(name);
      if (mcpInstructions) {
        prompt += `\n\n${mcpInstructions}`;
      }
    }

    // Don't set tools — let agents inherit ALL tools including MCP.
    // Setting tools explicitly prevents MCP access (SDK bug #13605).
    // Instead, use disallowedTools to block MCP tools for agents that shouldn't use them.
    const disallowedTools = getDisallowedTools(name, config.enableMcpTools ?? false);

    agents[name] = {
      description: SUBAGENT_DESCRIPTIONS[name] || `Specialized sub-agent: ${name}`,
      prompt,
      model: sa.model === "inherit" ? undefined : (sa.model ?? undefined),
      ...(sa.maxTurns && { maxTurns: sa.maxTurns }),
      ...(disallowedTools.length > 0 && { disallowedTools }),
    };
  }

  return agents;
}

// All MCP tool names from the evaluation server
const ALL_MCP_TOOLS = [
  "mcp__roast-evaluators__perplexity_research",
  "mcp__roast-evaluators__web_fetch",
  "mcp__roast-evaluators__spell_check",
  "mcp__roast-evaluators__math_check",
  "mcp__roast-evaluators__forecast_check",
  "mcp__roast-evaluators__fallacy_extract",
  "mcp__roast-evaluators__fallacy_charity_filter",
  "mcp__roast-evaluators__fallacy_supported_elsewhere",
];

// Fallacy MCP tools only
const FALLACY_MCP_TOOLS = [
  "mcp__roast-evaluators__fallacy_extract",
  "mcp__roast-evaluators__fallacy_charity_filter",
  "mcp__roast-evaluators__fallacy_supported_elsewhere",
];

/**
 * Get disallowed tools per agent. Blocks MCP tools that an agent shouldn't access.
 */
function getDisallowedTools(agentName: string, mcpEnabled: boolean): string[] {
  if (!mcpEnabled) return [];

  switch (agentName) {
    case "fact-checker":
      // fact-checker can use perplexity_research + web_fetch — block fallacy tools
      return FALLACY_MCP_TOOLS;

    case "fallacy-checker":
      // fallacy-checker can use fallacy tools only — block perplexity + web_fetch
      return [
        "mcp__roast-evaluators__perplexity_research",
        "mcp__roast-evaluators__web_fetch",
      ];

    case "reviewer":
    case "clarity-checker":
    case "math-checker":
      // These agents should NOT use any MCP tools
      return ALL_MCP_TOOLS;

    default:
      return ALL_MCP_TOOLS;
  }
}

// ---------------------------------------------------------------------------
// Build full SDK query options from profile config
// ---------------------------------------------------------------------------

export function buildAgenticQueryOptions(
  config: AgenticProfileConfig,
  evaluationServer: McpSdkServerConfigWithInstance,
  workspacePath?: string,
  emit?: (event: { type: string; message: string }) => void
): Partial<Options> {
  logger.info(`buildAgenticQueryOptions: version=${config.version} enableSubAgents=${config.enableSubAgents} enableMcpTools=${config.enableMcpTools} workspace=${workspacePath ?? "none"}`);

  // Build env for the SDK subprocess.
  // In dev, strip ANTHROPIC_API_KEY so the SDK uses subscription auth,
  // unless AGENTIC_USE_API_KEY=true overrides this (useful for testing Helicone).
  const isDev = process.env.NODE_ENV === "development";
  const useApiKey = process.env.AGENTIC_USE_API_KEY === "true";
  const env = (isDev && !useApiKey)
    ? Object.fromEntries(
        Object.entries(process.env).filter(([key]) => key !== "ANTHROPIC_API_KEY")
      ) as Record<string, string>
    : { ...process.env } as Record<string, string>;

  // Tag SDK API calls with the Helicone session ID so the cost poller
  // can attribute them to the job. The SDK reads ANTHROPIC_CUSTOM_HEADERS.
  const jobId = getCurrentJobId();
  if (jobId) {
    env.ANTHROPIC_CUSTOM_HEADERS = `Helicone-Session-Id: ${jobId}`;
  }

  // Security: canUseTool blocks unwanted built-in agents + restricts filesystem
  const canUseTool = createToolGuard(workspacePath, emit);
  const workspaceOptions = workspacePath
    ? {
        cwd: workspacePath,
        sandbox: { enabled: true, allowUnsandboxedCommands: false },
        canUseTool,
      }
    : { canUseTool };

  if (!config.enableSubAgents) {
    // Single-agent mode - explicitly pass empty agents to disable built-in agents
    logger.info("Using single-agent mode");
    const allowedTools = [...config.allowedTools];
    // Add file tools if workspace is available
    if (workspacePath) {
      allowedTools.push(...FILE_TOOLS);
    }
    return {
      model: config.model,
      maxTurns: config.maxTurns,
      maxBudgetUsd: config.maxBudgetUsd,
      systemPrompt: config.systemPrompt || AGENTIC_SYSTEM_PROMPT,
      allowedTools,
      permissionMode: config.permissionMode,
      agents: {}, // Disable built-in agents like Bash, Explore, etc.
      env,
      ...workspaceOptions,
      ...(config.maxThinkingTokens && { maxThinkingTokens: config.maxThinkingTokens }),
    };
  }

  // Multi-agent mode
  const agents = buildSubAgentDefinitions(config, workspacePath);
  logger.info(`Using multi-agent mode with ${Object.keys(agents).length} agents: ${Object.keys(agents).join(", ")}`);

  // Build allowed tools for orchestrator
  const allowedTools = [
    "Task", // Required for spawning sub-agents
    ...config.allowedTools,
  ];

  // Add file tools if workspace is available
  if (workspacePath) {
    allowedTools.push(...FILE_TOOLS);
  }

  // Add MCP tool names to allowed list if MCP tools are enabled
  if (config.enableMcpTools) {
    allowedTools.push(
      "mcp__roast-evaluators__fallacy_extract",
      "mcp__roast-evaluators__fallacy_charity_filter",
      "mcp__roast-evaluators__fallacy_supported_elsewhere",
      "mcp__roast-evaluators__spell_check",
      "mcp__roast-evaluators__math_check",
      "mcp__roast-evaluators__forecast_check",
      "mcp__roast-evaluators__web_fetch"
    );
  }

  // Build orchestrator prompt dynamically — only list enabled agents
  const enabledAgentNames = Object.keys(agents);
  let orchestratorPrompt = config.orchestratorPrompt || buildOrchestratorPrompt(enabledAgentNames);
  if (config.enableMcpTools) {
    orchestratorPrompt += buildOrchestratorMcpAddendum(enabledAgentNames);
  }

  return {
    model: config.model,
    maxTurns: config.maxTurns,
    maxBudgetUsd: config.maxBudgetUsd,
    systemPrompt: orchestratorPrompt,
    agents,
    mcpServers: config.enableMcpTools
      ? { "roast-evaluators": evaluationServer }
      : undefined,
    allowedTools: [...new Set(allowedTools)], // dedupe
    permissionMode: config.permissionMode,
    env,
    ...workspaceOptions,
    ...(config.maxThinkingTokens && { maxThinkingTokens: config.maxThinkingTokens }),
  };
}
