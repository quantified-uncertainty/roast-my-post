import { DEFAULT_ANALYSIS_MODEL, DEFAULT_SEARCH_MODEL } from "../../../constants";
import { DEFAULT_RESEARCH_MODEL } from "../../../modelDefaults";

/**
 * Agentic Plugin Profile Configuration Types
 *
 * Supports both v1 (single-agent) and v2 (multi-agent orchestrator) modes.
 * v1 configs continue to work as single-agent mode.
 */

export interface SubAgentConfig {
  enabled: boolean;
  model?: string;
  maxTurns?: number;
  prompt?: string; // Custom prompt override (empty = use default)
}

export interface AgenticProfileConfig {
  version: 1 | 2;
  model: string;
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
  /** OpenRouter model used by the web research tool. */
  researchModel?: string;
}

export const DEFAULT_SUBAGENTS: Record<string, SubAgentConfig> = {
  "fact-checker": { enabled: true, model: DEFAULT_ANALYSIS_MODEL },
  "fallacy-checker": { enabled: true, model: DEFAULT_ANALYSIS_MODEL },
  "clarity-checker": { enabled: true, model: DEFAULT_SEARCH_MODEL },
  "math-checker": { enabled: true, model: DEFAULT_ANALYSIS_MODEL },
  "reviewer": { enabled: true, model: DEFAULT_ANALYSIS_MODEL, maxTurns: 15 },
};

export const DEFAULT_AGENTIC_CONFIG: AgenticProfileConfig = {
  version: 1,
  researchModel: DEFAULT_RESEARCH_MODEL,
  model: DEFAULT_ANALYSIS_MODEL,
  maxTurns: 20,
  maxBudgetUsd: 2.0,
  allowedTools: ["WebSearch"],
  systemPrompt: "",
  permissionMode: "acceptEdits",
};

export function createDefaultAgenticConfig(): AgenticProfileConfig {
  return { ...DEFAULT_AGENTIC_CONFIG, allowedTools: [...DEFAULT_AGENTIC_CONFIG.allowedTools] };
}

export function validateAgenticConfig(raw: unknown): AgenticProfileConfig {
  const defaults = createDefaultAgenticConfig();

  if (!raw || typeof raw !== "object") {
    return defaults;
  }

  const config = raw as Record<string, unknown>;

  const validModel = (model: unknown): model is string =>
    typeof model === "string" && /^(sonnet|opus|haiku|claude-[a-zA-Z0-9.-]+)$/.test(model);
  const validPermissions = ["default", "acceptEdits", "plan"] as const;


  // Base fields (v1 + v2)
  const result: AgenticProfileConfig = {
    researchModel: typeof config.researchModel === "string" && /^[\w.-]+\/[\w.:-]+$/.test(config.researchModel)
      ? config.researchModel : DEFAULT_RESEARCH_MODEL,
    version:
      config.version === 2 ? 2 : 1,
    model: validModel(config.model)
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
          model: (sa.model === "inherit" || validModel(sa.model))
            ? (sa.model as SubAgentConfig["model"])
            : undefined,
          maxTurns:
            typeof sa.maxTurns === "number" && sa.maxTurns >= 1 && sa.maxTurns <= 50
              ? sa.maxTurns
              : undefined,
          prompt: typeof sa.prompt === "string" ? sa.prompt : undefined,
        };
      }
    }
    result.subAgents = validated;
  }

  return result;
}
