"use client";

import { useState, useMemo } from "react";
import { ChevronDownIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { ReasoningConfig, ReasoningEffort, ProviderPreferences } from "../../types";
import { useModels, type ModelInfo } from "../../hooks/useModels";
import { useModelEndpoints } from "../../hooks/useModelEndpoints";
import { resolveReasoningBudgetSync, type ModelEndpointData } from "@roast/ai";
import { ModelSelector, getModelDisplayName } from "./ModelSelector";
import { ProviderSelector } from "./ProviderSelector";

// ============================================================================
// Types
// ============================================================================

export interface ModelConfig {
  model: string;
  temperature?: number | "default";
  reasoning?: ReasoningConfig;
  thinking?: boolean; // Legacy field, mapped to reasoning
  provider?: ProviderPreferences;
}

export interface ModelConfiguratorProps {
  /** Current configuration */
  config: ModelConfig;
  /** Callback when config changes */
  onChange: (updates: Partial<ModelConfig>) => void;
  /** Whether the configurator is disabled */
  disabled?: boolean;
  /** Optional label/index to show (e.g., "1" for extractor list) */
  label?: string | number;
  /** Color theme for the component */
  colorTheme?: "blue" | "purple" | "orange";
  /** Whether to show provider selection (for OpenRouter models) */
  showProvider?: boolean;
  /** Whether to show delete button */
  showDelete?: boolean;
  /** Callback when delete is clicked */
  onDelete?: () => void;
  /** Whether delete is disabled (e.g., can't delete last item) */
  deleteDisabled?: boolean;
  /** Tooltip for delete button when disabled */
  deleteDisabledReason?: string;
  /** Layout mode */
  layout?: "compact" | "expanded";
}

// ============================================================================
// Color Theme Helpers
// ============================================================================

const themeColors = {
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-100",
    hoverBg: "hover:bg-blue-100",
    text: "text-blue-900",
    textMuted: "text-blue-400",
    badge: "bg-blue-100 text-blue-700",
  },
  purple: {
    bg: "bg-purple-50",
    border: "border-purple-100",
    hoverBg: "hover:bg-purple-100",
    text: "text-purple-900",
    textMuted: "text-purple-400",
    badge: "bg-purple-100 text-purple-700",
  },
  orange: {
    bg: "bg-orange-50",
    border: "border-orange-100",
    hoverBg: "hover:bg-orange-100",
    text: "text-orange-900",
    textMuted: "text-orange-400",
    badge: "bg-orange-100 text-orange-700",
  },
};

// ============================================================================
// Main Component
// ============================================================================

export function ModelConfigurator({
  config,
  onChange,
  disabled,
  label,
  colorTheme = "blue",
  showProvider = true,
  showDelete = false,
  onDelete,
  deleteDisabled = false,
  deleteDisabledReason,
  layout = "compact",
}: ModelConfiguratorProps) {
  const { models, loading: modelsLoading } = useModels();
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showCustomTemp, setShowCustomTemp] = useState(false);
  const [customTempValue, setCustomTempValue] = useState(
    typeof config.temperature === "number" ? config.temperature : 0.5
  );

  const colors = themeColors[colorTheme];

  // Find model info for the selected model
  const modelInfo = models.find((m) => m.id === config.model);
  const supportsTemperature = modelInfo?.supportsTemperature ?? true;
  const supportsReasoning = modelInfo?.supportsReasoning ?? true;
  const defaultTemperature = modelInfo?.defaultTemperature;
  const maxTemperature = modelInfo?.maxTemperature ?? 1;

  // Fetch endpoints for OpenRouter models to calculate reasoning budget
  const isOpenRouter = config.model.includes("/");
  const { endpoints: modelEndpoints } = useModelEndpoints(isOpenRouter ? config.model : null);

  // Check if this is an Anthropic model (direct API, not via OpenRouter)
  const isAnthropicDirect = config.model.startsWith("claude-") && !config.model.includes("/");

  // Calculate reasoning budget options based on model endpoints
  const reasoningOptions = useMemo(() => {
    const efforts: Array<{ value: string; label: string; tokens: string }> = [
      { value: "off", label: "Off", tokens: "" },
    ];

    const effortLevels: Array<{ value: ReasoningEffort; label: string }> = [
      { value: "minimal", label: "Minimal" },
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" },
      { value: "xhigh", label: "Very High" },
    ];

    // Effort level percentages (same as ReasoningBudgetResolver)
    const effortPercentages: Record<ReasoningEffort, number> = {
      minimal: 0.1,
      low: 0.3,
      medium: 0.5,
      high: 0.7,
      xhigh: 0.9,
    };

    for (const { value: effort, label } of effortLevels) {
      if (isAnthropicDirect) {
        // Anthropic models support up to 128K thinking tokens
        // Calculate budget based on percentage of max (128K)
        const maxThinkingTokens = 128000;
        const budget = Math.floor(maxThinkingTokens * effortPercentages[effort]);
        const displayBudget = budget >= 1000 ? `${Math.round(budget / 1000)}K` : String(budget);
        efforts.push({
          value: effort,
          label,
          tokens: displayBudget,
        });
      } else if (isOpenRouter && modelEndpoints.length > 0) {
        // OpenRouter models - use endpoint data to calculate
        const endpointsData: ModelEndpointData[] = modelEndpoints.map((ep) => ({
          tag: ep.tag,
          providerName: ep.providerName,
          maxCompletionTokens: ep.maxCompletionTokens,
        }));
        const budget = resolveReasoningBudgetSync({
          effort,
          modelId: config.model,
          selectedProviders: config.provider?.order,
          endpointsData,
        });
        efforts.push({
          value: effort,
          label,
          tokens: budget.displayBudget,
        });
      } else {
        // Fallback to static estimates (for unknown models or while loading)
        const staticTokens: Record<ReasoningEffort, string> = {
          minimal: "~1K",
          low: "~2K",
          medium: "~4K",
          high: "~8K",
          xhigh: "~16K",
        };
        efforts.push({
          value: effort,
          label,
          tokens: staticTokens[effort],
        });
      }
    }

    return efforts;
  }, [config.model, config.provider?.order, modelEndpoints, isOpenRouter, isAnthropicDirect]);

  // Check if current temp is a preset or custom
  const DROPDOWN_TEMPS = [0, 0.3, 0.7, 1, 1.5, 2];
  const isCustomTemp =
    typeof config.temperature === "number" && !DROPDOWN_TEMPS.includes(config.temperature);

  // Build auto label with default temp if known
  const autoLabel = defaultTemperature !== undefined ? `Auto (${defaultTemperature})` : "Auto";

  const handleReasoningChange = (value: string) => {
    if (disabled) return;
    if (value === "off") {
      onChange({ reasoning: false, thinking: false });
    } else {
      onChange({ reasoning: { effort: value as ReasoningEffort }, thinking: true });
    }
  };

  const handleTemperatureChange = (value: string) => {
    if (disabled) return;
    if (value === "custom") {
      setShowCustomTemp(true);
      onChange({ temperature: customTempValue });
    } else if (value === "default") {
      setShowCustomTemp(false);
      onChange({ temperature: "default" });
    } else {
      setShowCustomTemp(false);
      onChange({ temperature: parseFloat(value) });
    }
  };

  return (
    <div className={`p-3 ${colors.bg} rounded-lg border ${colors.border} space-y-3`}>
      {/* Top row: label, model, reasoning, delete */}
      <div className="flex items-center gap-2">
        {/* Optional label/index */}
        {label !== undefined && (
          <span className={`text-xs ${colors.textMuted} font-medium w-5`}>{label}</span>
        )}

        {/* Model Selector */}
        <div className="flex-1 min-w-0 relative">
          <button
            onClick={() => !disabled && setShowModelDropdown(!showModelDropdown)}
            disabled={disabled}
            className={`flex items-center gap-2 w-full text-left px-2 py-1 rounded ${colors.hoverBg} disabled:hover:bg-transparent disabled:cursor-default`}
          >
            <span className={`font-mono text-sm ${colors.text} truncate`}>
              {getModelDisplayName(config.model)}
            </span>
            {!disabled && <ChevronDownIcon className={`h-3 w-3 ${colors.textMuted} flex-shrink-0`} />}
          </button>
          {showModelDropdown && (
            <ModelSelector
              models={models}
              loading={modelsLoading}
              onSelect={(model) => {
                onChange({ model: model.id });
                setShowModelDropdown(false);
              }}
              onCancel={() => setShowModelDropdown(false)}
            />
          )}
        </div>

        {/* Reasoning Dropdown */}
        {supportsReasoning ? (
          <select
            value={getReasoningValue(config.reasoning, config.thinking)}
            onChange={(e) => handleReasoningChange(e.target.value)}
            disabled={disabled}
            className={`px-2 py-1 text-xs rounded border transition-colors ${
              getReasoningValue(config.reasoning, config.thinking) !== "off"
                ? "bg-green-100 text-green-700 border-green-200"
                : "bg-gray-100 text-gray-500 border-gray-200"
            } disabled:bg-gray-50 disabled:text-gray-500`}
            title="Extended reasoning effort level - shows calculated token budget"
          >
            {reasoningOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
                {opt.tokens ? ` (${opt.tokens})` : ""}
              </option>
            ))}
          </select>
        ) : (
          <span
            className="flex items-center gap-1.5 px-2 py-1 text-xs rounded border bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
            title="This model does not support extended reasoning"
          >
            Reasoning N/A
          </span>
        )}

        {/* Delete Button */}
        {showDelete && (
          <button
            onClick={onDelete}
            disabled={disabled || deleteDisabled}
            className={`p-1 rounded ${
              !disabled && !deleteDisabled
                ? "text-gray-400 hover:text-red-600 hover:bg-red-50"
                : "text-gray-300 cursor-not-allowed"
            }`}
            title={deleteDisabled ? deleteDisabledReason : "Remove"}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Temperature row */}
      {supportsTemperature ? (
        <div className={`${label !== undefined ? "pl-5" : ""} flex items-start gap-3`}>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Temperature</span>
            <select
              value={isCustomTemp ? "custom" : String(config.temperature ?? "default")}
              onChange={(e) => handleTemperatureChange(e.target.value)}
              disabled={disabled}
              className="px-2 py-1 text-sm border border-gray-200 rounded bg-white disabled:bg-gray-50 disabled:text-gray-500"
            >
              <option value="default">{autoLabel}</option>
              <option value="0">0 - Precise</option>
              <option value="0.3">0.3</option>
              <option value="0.7">0.7</option>
              <option value="1">1.0{maxTemperature <= 1 ? " - Creative" : ""}</option>
              {maxTemperature > 1 && <option value="1.5">1.5</option>}
              {maxTemperature >= 2 && <option value="2">2.0 - Creative</option>}
              <option value="custom">Custom...</option>
            </select>
          </div>

          {/* Custom temperature slider */}
          {(showCustomTemp || isCustomTemp) && !disabled && (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="range"
                min={0}
                max={maxTemperature}
                step={0.05}
                value={typeof config.temperature === "number" ? config.temperature : customTempValue}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setCustomTempValue(val);
                  onChange({ temperature: val });
                }}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <input
                type="number"
                min={0}
                max={maxTemperature}
                step={0.05}
                value={typeof config.temperature === "number" ? config.temperature : customTempValue}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val >= 0 && val <= maxTemperature) {
                    setCustomTempValue(val);
                    onChange({ temperature: val });
                  }
                }}
                className="w-16 px-2 py-1 text-center text-sm border rounded"
              />
            </div>
          )}
        </div>
      ) : (
        <div className={`${label !== undefined ? "pl-5" : ""} text-xs text-gray-400`}>
          Temperature not supported by this model
        </div>
      )}

      {/* Provider preference row - only for OpenRouter models */}
      {showProvider && isOpenRouter && (
        <ProviderSelector
          provider={config.provider}
          onChange={(provider) => onChange({ provider })}
          disabled={disabled}
          modelId={config.model}
          indent={label !== undefined}
        />
      )}
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Convert ReasoningConfig to dropdown value string
 * Handles both new reasoning config and legacy thinking boolean
 */
function getReasoningValue(reasoning: ReasoningConfig | undefined, thinking?: boolean): string {
  if (reasoning !== undefined) {
    if (reasoning === false) return "off";
    if (typeof reasoning === "object" && "effort" in reasoning) {
      return reasoning.effort;
    }
    if (typeof reasoning === "object" && "budget_tokens" in reasoning) {
      return "high"; // Default for custom budget
    }
  }
  if (thinking === true) return "medium"; // Legacy
  return "off";
}

// Re-export for convenience
export { getModelDisplayName } from "./ModelSelector";
