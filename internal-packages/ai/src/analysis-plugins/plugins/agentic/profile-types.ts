/**
 * Agentic Plugin Profile Configuration Types
 */

export interface AgenticProfileConfig {
  version: 1;
  model: "sonnet" | "opus" | "haiku";
  maxTurns: number;
  maxBudgetUsd: number;
  maxThinkingTokens?: number;
  allowedTools: string[];
  systemPrompt: string;
  permissionMode: "default" | "acceptEdits" | "plan";
}

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

  return {
    version: 1,
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
}
