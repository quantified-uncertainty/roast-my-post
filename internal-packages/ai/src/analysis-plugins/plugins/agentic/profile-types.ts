/**
 * Agentic Plugin Profile Configuration Types
 *
 * Supports both v1 (single-agent) and v2 (multi-agent orchestrator) modes.
 * v1 configs continue to work as single-agent mode.
 */

export interface SubAgentConfig {
  enabled: boolean;
  model?: "sonnet" | "opus" | "haiku" | "inherit";
  maxTurns?: number;
}

export interface AgenticProfileConfig {
  version: 1 | 2;
  model: "sonnet" | "opus" | "haiku";
  maxTurns: number;
  maxBudgetUsd: number;
  maxThinkingTokens?: number;
  allowedTools: string[];
  systemPrompt: string;
  permissionMode: "default" | "acceptEdits" | "plan";

  // v2 fields (optional — backward compatible with v1)
  enableSubAgents?: boolean;
  subAgents?: Record<string, SubAgentConfig>;
  orchestratorPrompt?: string;
  enableMcpTools?: boolean;

  // MCP tool configuration
  fallacyCheckProfileId?: string;
}

export const DEFAULT_SUBAGENTS: Record<string, SubAgentConfig> = {
  "fact-checker": { enabled: true, model: "sonnet" },
  "fallacy-checker": { enabled: true, model: "sonnet" },
  "spell-checker": { enabled: true, model: "haiku" },
  "math-checker": { enabled: true, model: "sonnet" },
};

export const DEFAULT_AGENTIC_CONFIG: AgenticProfileConfig = {
  version: 1,
  model: "sonnet",
  maxTurns: 10,
  maxBudgetUsd: 2.0,
  allowedTools: ["WebSearch", "WebFetch"],
  systemPrompt: "",
  permissionMode: "acceptEdits",
};

export function createDefaultAgenticConfig(): AgenticProfileConfig {
  return { ...DEFAULT_AGENTIC_CONFIG };
}

export function validateAgenticConfig(raw: unknown): AgenticProfileConfig {
  const defaults = createDefaultAgenticConfig();

  if (!raw || typeof raw !== "object") {
    return defaults;
  }

  const config = raw as Record<string, unknown>;

  const validModels = ["sonnet", "opus", "haiku"] as const;
  const validPermissions = ["default", "acceptEdits", "plan"] as const;
  const validSubAgentModels = ["sonnet", "opus", "haiku", "inherit"] as const;

  // Base fields (v1 + v2)
  const result: AgenticProfileConfig = {
    version:
      config.version === 2 ? 2 : 1,
    model: validModels.includes(config.model as typeof validModels[number])
      ? (config.model as AgenticProfileConfig["model"])
      : defaults.model,
    maxTurns:
      typeof config.maxTurns === "number" && config.maxTurns >= 1 && config.maxTurns <= 50
        ? config.maxTurns
        : defaults.maxTurns,
    maxBudgetUsd:
      typeof config.maxBudgetUsd === "number" && config.maxBudgetUsd >= 0.01 && config.maxBudgetUsd <= 10
        ? config.maxBudgetUsd
        : defaults.maxBudgetUsd,
    maxThinkingTokens:
      typeof config.maxThinkingTokens === "number" && config.maxThinkingTokens >= 1024
        ? config.maxThinkingTokens
        : undefined,
    allowedTools: Array.isArray(config.allowedTools)
      ? config.allowedTools.filter((t): t is string => typeof t === "string")
      : defaults.allowedTools,
    systemPrompt:
      typeof config.systemPrompt === "string"
        ? config.systemPrompt
        : defaults.systemPrompt,
    permissionMode: validPermissions.includes(config.permissionMode as typeof validPermissions[number])
      ? (config.permissionMode as AgenticProfileConfig["permissionMode"])
      : defaults.permissionMode,
  };

  // v2 fields
  if (typeof config.enableSubAgents === "boolean") {
    result.enableSubAgents = config.enableSubAgents;
  }

  if (typeof config.enableMcpTools === "boolean") {
    result.enableMcpTools = config.enableMcpTools;
  }

  if (typeof config.orchestratorPrompt === "string") {
    result.orchestratorPrompt = config.orchestratorPrompt;
  }

  if (typeof config.fallacyCheckProfileId === "string") {
    result.fallacyCheckProfileId = config.fallacyCheckProfileId;
  }

  if (config.subAgents && typeof config.subAgents === "object") {
    const validated: Record<string, SubAgentConfig> = {};
    for (const [name, raw] of Object.entries(config.subAgents as Record<string, unknown>)) {
      if (raw && typeof raw === "object") {
        const sa = raw as Record<string, unknown>;
        validated[name] = {
          enabled: typeof sa.enabled === "boolean" ? sa.enabled : true,
          model: validSubAgentModels.includes(sa.model as typeof validSubAgentModels[number])
            ? (sa.model as SubAgentConfig["model"])
            : undefined,
          maxTurns:
            typeof sa.maxTurns === "number" && sa.maxTurns >= 1 && sa.maxTurns <= 50
              ? sa.maxTurns
              : undefined,
        };
      }
    }
    result.subAgents = validated;
  }

  return result;
}
