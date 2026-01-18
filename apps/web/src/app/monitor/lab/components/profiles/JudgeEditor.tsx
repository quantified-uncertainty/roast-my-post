"use client";

import { useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import type { JudgeConfig, ReasoningConfig, ReasoningEffort } from "../../types";
import { useModels } from "../../hooks/useModels";
import { ModelSelector, getModelDisplayName } from "./ModelSelector";

const REASONING_OPTIONS: Array<{ value: string; label: string; tokens: string }> = [
  { value: "off", label: "Off", tokens: "" },
  { value: "minimal", label: "Minimal", tokens: "1K" },
  { value: "low", label: "Low", tokens: "2K" },
  { value: "medium", label: "Medium", tokens: "8K" },
  { value: "high", label: "High", tokens: "16K" },
  { value: "xhigh", label: "Very High", tokens: "32K" },
];

interface JudgeEditorProps {
  judge: JudgeConfig;
  onChange: (judge: JudgeConfig) => void;
  disabled?: boolean;
}

export function JudgeEditor({ judge, onChange, disabled }: JudgeEditorProps) {
  const { models, loading: modelsLoading } = useModels();
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  const modelName = getModelDisplayName(judge.model);

  // Find model info for the selected model
  const modelInfo = models.find((m) => m.id === judge.model);
  const supportsTemperature = modelInfo?.supportsTemperature ?? true;
  const supportsReasoning = modelInfo?.supportsReasoning ?? true;
  const defaultTemperature = modelInfo?.defaultTemperature;
  const maxTemperature = modelInfo?.maxTemperature ?? 1;

  // Check if current value is a preset or custom
  const DROPDOWN_TEMPS = [0, 0.3, 0.7, 1, 1.5, 2];
  const isCustomTemp = typeof judge.temperature === "number" &&
    !DROPDOWN_TEMPS.includes(judge.temperature);

  // Build auto label with default temp if known
  const autoLabel = defaultTemperature !== undefined
    ? `Auto (${defaultTemperature})`
    : "Auto";

  const updateJudge = (updates: Partial<JudgeConfig>) => {
    onChange({ ...judge, ...updates });
  };

  return (
    <div className="space-y-4">
      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-700">Enable Judge</label>
          <p className="text-xs text-gray-500">
            When using multiple extractors, the judge aggregates and deduplicates results.
          </p>
        </div>
        <button
          type="button"
          onClick={() => !disabled && updateJudge({ enabled: !judge.enabled })}
          disabled={disabled}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 ${
            judge.enabled ? "bg-purple-600" : "bg-gray-200"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              judge.enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {judge.enabled && (
        <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 space-y-3">
          {/* Model Selection */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-16">Model</span>
            <div className="flex-1 relative">
              <button
                onClick={() => !disabled && setShowModelDropdown(!showModelDropdown)}
                disabled={disabled}
                className="flex items-center gap-2 w-full text-left px-2 py-1 rounded hover:bg-purple-100 disabled:hover:bg-transparent disabled:cursor-default"
              >
                <span className="font-mono text-sm text-purple-900 truncate">{modelName}</span>
                {!disabled && <ChevronDownIcon className="h-3 w-3 text-purple-400 flex-shrink-0" />}
              </button>
              {showModelDropdown && (
                <ModelSelector
                  models={models}
                  loading={modelsLoading}
                  onSelect={(model) => {
                    updateJudge({ model: model.id });
                    setShowModelDropdown(false);
                  }}
                  onCancel={() => setShowModelDropdown(false)}
                />
              )}
            </div>
          </div>

          {/* Temperature */}
          {supportsTemperature && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-16">Temp</span>
              <select
                value={isCustomTemp ? "custom" : String(judge.temperature ?? "default")}
                onChange={(e) => {
                  if (disabled) return;
                  const val = e.target.value;
                  if (val === "custom") {
                    updateJudge({ temperature: 0.5 });
                  } else if (val === "default") {
                    updateJudge({ temperature: "default" });
                  } else {
                    updateJudge({ temperature: parseFloat(val) });
                  }
                }}
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
              {isCustomTemp && !disabled && (
                <input
                  type="number"
                  min={0}
                  max={maxTemperature}
                  step={0.05}
                  value={typeof judge.temperature === "number" ? judge.temperature : 0.5}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val >= 0 && val <= maxTemperature) {
                      updateJudge({ temperature: val });
                    }
                  }}
                  className="w-16 px-2 py-1 text-center text-sm border rounded"
                />
              )}
            </div>
          )}

          {/* Reasoning */}
          {supportsReasoning && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-16">Reasoning</span>
              <select
                value={getReasoningValue(judge.reasoning, judge.thinking)}
                onChange={(e) => {
                  if (disabled) return;
                  const val = e.target.value;
                  if (val === "off") {
                    updateJudge({ reasoning: false, thinking: false });
                  } else {
                    updateJudge({ reasoning: { effort: val as ReasoningEffort }, thinking: true });
                  }
                }}
                disabled={disabled}
                className={`px-2 py-1 text-sm rounded border transition-colors ${
                  getReasoningValue(judge.reasoning, judge.thinking) !== "off"
                    ? "bg-green-100 text-green-700 border-green-200"
                    : "bg-gray-100 text-gray-500 border-gray-200"
                } disabled:bg-gray-50 disabled:text-gray-500`}
              >
                {REASONING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}{opt.tokens ? ` (${opt.tokens})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getReasoningValue(reasoning: ReasoningConfig | undefined, thinking?: boolean): string {
  if (reasoning !== undefined) {
    if (reasoning === false) return "off";
    if (typeof reasoning === "object" && "effort" in reasoning) {
      return reasoning.effort;
    }
    if (typeof reasoning === "object" && "budget_tokens" in reasoning) {
      return "high";
    }
  }
  if (thinking === true) return "medium";
  return "off";
}
