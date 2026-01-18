"use client";

import { useState } from "react";
import {
  ChevronUpIcon,
  ChevronDownIcon,
  TrashIcon,
  PlusIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import type {
  FilterChainItem,
  SupportedElsewhereFilterConfig,
  PrincipleOfCharityFilterConfig,
  SeverityFilterConfig,
  ConfidenceFilterConfig,
  ReasoningConfig,
  ReasoningEffort,
} from "../../types";
import { AVAILABLE_FILTER_TYPES, EFFORT_TO_BUDGET_TOKENS } from "../../types";
import { useModels } from "../../hooks/useModels";
import { ModelSelector, getModelDisplayName } from "./ModelSelector";

interface FilterChainEditorProps {
  filters: FilterChainItem[];
  onChange: (filters: FilterChainItem[]) => void;
  disabled?: boolean;
  defaultFilterPrompt?: string;
}

export function FilterChainEditor({
  filters,
  onChange,
  disabled,
  defaultFilterPrompt,
}: FilterChainEditorProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  const moveFilter = (index: number, direction: "up" | "down") => {
    if (disabled) return;
    const newFilters = [...filters];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= filters.length) return;
    [newFilters[index], newFilters[newIndex]] = [newFilters[newIndex], newFilters[index]];
    onChange(newFilters);
  };

  const removeFilter = (index: number) => {
    if (disabled) return;
    onChange(filters.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, updates: Partial<FilterChainItem>) => {
    if (disabled) return;
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...updates } as FilterChainItem;
    onChange(newFilters);
  };

  const toggleFilter = (index: number) => {
    updateFilter(index, { enabled: !filters[index].enabled });
  };

  const addFilter = (type: FilterChainItem["type"]) => {
    if (disabled) return;
    const id = `filter-${Date.now()}`;
    let newFilter: FilterChainItem;

    switch (type) {
      case "principle-of-charity":
        newFilter = {
          id,
          type: "principle-of-charity",
          enabled: true,
          model: "claude-sonnet-4-5-20250929",
          temperature: 0.2,
        };
        break;
      case "supported-elsewhere":
        newFilter = {
          id,
          type: "supported-elsewhere",
          enabled: true,
          model: "claude-sonnet-4-5-20250929",
          temperature: 0.1,
        };
        break;
      case "severity":
        newFilter = {
          id,
          type: "severity",
          enabled: true,
          minSeverity: 50,
        };
        break;
      case "confidence":
        newFilter = {
          id,
          type: "confidence",
          enabled: true,
          minConfidence: 50,
        };
        break;
      default: {
        // For exhaustiveness - this should never happen
        const _exhaustiveCheck: never = type;
        throw new Error(`Unknown filter type: ${_exhaustiveCheck}`);
      }
    }

    onChange([...filters, newFilter]);
    setShowAddMenu(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-700">Filter Chain</label>
          <p className="text-xs text-gray-500">
            Filters run in sequence. Each filter can remove issues from the pipeline.
          </p>
        </div>
      </div>

      {/* Filter List */}
      <div className="space-y-2">
        {filters.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            No filters configured. Add a filter to remove false positives.
          </div>
        ) : (
          filters.map((filter, index) => (
            <FilterItemEditor
              key={filter.id}
              filter={filter}
              index={index}
              totalFilters={filters.length}
              disabled={disabled}
              defaultFilterPrompt={defaultFilterPrompt}
              onMove={(dir) => moveFilter(index, dir)}
              onRemove={() => removeFilter(index)}
              onUpdate={(updates) => updateFilter(index, updates)}
              onToggle={() => toggleFilter(index)}
            />
          ))
        )}
      </div>

      {/* Add Filter Button */}
      {!disabled && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-orange-600 hover:bg-orange-50 rounded-md border border-orange-200"
          >
            <PlusIcon className="h-4 w-4" />
            Add Filter
          </button>

          {showAddMenu && (
            <div className="absolute z-10 left-0 top-full mt-1 w-72 bg-white border rounded-lg shadow-lg overflow-hidden">
              <div className="p-2 border-b bg-gray-50">
                <span className="text-xs font-medium text-gray-500">Available Filters</span>
              </div>
              {AVAILABLE_FILTER_TYPES.map((filterType) => (
                <button
                  key={filterType.type}
                  onClick={() => addFilter(filterType.type)}
                  className="w-full px-3 py-2 text-left hover:bg-orange-50"
                >
                  <div className="text-sm font-medium text-gray-900">{filterType.label}</div>
                  <div className="text-xs text-gray-500">{filterType.description}</div>
                </button>
              ))}
              <div className="p-2 border-t">
                <button
                  onClick={() => setShowAddMenu(false)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface FilterItemEditorProps {
  filter: FilterChainItem;
  index: number;
  totalFilters: number;
  disabled?: boolean;
  defaultFilterPrompt?: string;
  onMove: (direction: "up" | "down") => void;
  onRemove: () => void;
  onUpdate: (updates: Partial<FilterChainItem>) => void;
  onToggle: () => void;
}

function FilterItemEditor({
  filter,
  index,
  totalFilters,
  disabled,
  defaultFilterPrompt,
  onMove,
  onRemove,
  onUpdate,
  onToggle,
}: FilterItemEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const filterLabel = AVAILABLE_FILTER_TYPES.find((f) => f.type === filter.type)?.label || filter.type;

  return (
    <div
      className={`border rounded-lg ${
        filter.enabled ? "border-orange-200 bg-orange-50/50" : "border-gray-200 bg-gray-50"
      }`}
    >
      {/* Header Row */}
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Order controls */}
        {!disabled && (
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => onMove("up")}
              disabled={index === 0}
              className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronUpIcon className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => onMove("down")}
              disabled={index === totalFilters - 1}
              className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronDownIcon className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Index badge */}
        <span className="w-5 h-5 flex items-center justify-center text-xs font-medium bg-orange-200 text-orange-800 rounded">
          {index + 1}
        </span>

        {/* Expand/collapse button */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 flex-1 text-left"
        >
          <ChevronRightIcon
            className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
          />
          <span className="text-sm font-medium text-gray-900">{filterLabel}</span>
          {filter.type === "principle-of-charity" && (
            <span className="text-xs text-gray-500 font-mono">
              {getModelDisplayName((filter as PrincipleOfCharityFilterConfig).model)}
            </span>
          )}
          {filter.type === "supported-elsewhere" && (
            <span className="text-xs text-gray-500 font-mono">
              {getModelDisplayName((filter as SupportedElsewhereFilterConfig).model)}
            </span>
          )}
          {filter.type === "severity" && (
            <span className="text-xs text-gray-500">
              ≥ {(filter as SeverityFilterConfig).minSeverity}
            </span>
          )}
          {filter.type === "confidence" && (
            <span className="text-xs text-gray-500">
              ≥ {(filter as ConfidenceFilterConfig).minConfidence}
            </span>
          )}
        </button>

        {/* Enable/Disable toggle */}
        <button
          type="button"
          onClick={() => !disabled && onToggle()}
          disabled={disabled}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            filter.enabled ? "bg-orange-500" : "bg-gray-300"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
              filter.enabled ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>

        {/* Delete button */}
        {!disabled && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1 text-gray-400 hover:text-red-500"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Expanded Settings */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-orange-100 overflow-visible">
          {filter.type === "principle-of-charity" && (
            <PrincipleOfCharitySettings
              filter={filter as PrincipleOfCharityFilterConfig}
              disabled={disabled}
              onUpdate={onUpdate}
            />
          )}
          {filter.type === "supported-elsewhere" && (
            <SupportedElsewhereSettings
              filter={filter as SupportedElsewhereFilterConfig}
              disabled={disabled}
              defaultPrompt={defaultFilterPrompt}
              onUpdate={onUpdate}
            />
          )}
          {filter.type === "severity" && (
            <SeveritySettings
              filter={filter as SeverityFilterConfig}
              disabled={disabled}
              onUpdate={onUpdate}
            />
          )}
          {filter.type === "confidence" && (
            <ConfidenceSettings
              filter={filter as ConfidenceFilterConfig}
              disabled={disabled}
              onUpdate={onUpdate}
            />
          )}
        </div>
      )}
    </div>
  );
}

interface SupportedElsewhereSettingsProps {
  filter: SupportedElsewhereFilterConfig;
  disabled?: boolean;
  defaultPrompt?: string;
  onUpdate: (updates: Partial<SupportedElsewhereFilterConfig>) => void;
}

const TEMP_PRESETS: Array<number | "default"> = ["default", 0, 0.1, 0.3, 0.5, 0.7, 1.0];
const REASONING_EFFORT_OPTIONS: ReasoningEffort[] = ["minimal", "low", "medium", "high", "xhigh"];

function SupportedElsewhereSettings({
  filter,
  disabled,
  defaultPrompt,
  onUpdate,
}: SupportedElsewhereSettingsProps) {
  const { models, loading: modelsLoading } = useModels();
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showTempDropdown, setShowTempDropdown] = useState(false);
  const [showReasoningDropdown, setShowReasoningDropdown] = useState(false);

  // Get display value for temperature
  const tempDisplay = filter.temperature === undefined || filter.temperature === "default"
    ? "default"
    : filter.temperature;

  // Get display value for reasoning
  const getReasoningDisplay = () => {
    if (filter.reasoning === undefined || filter.reasoning === false) return "Off";
    if ("effort" in filter.reasoning) return filter.reasoning.effort;
    if ("budget_tokens" in filter.reasoning) return `${filter.reasoning.budget_tokens} tokens`;
    return "Off";
  };

  // Check if reasoning is enabled
  const isReasoningEnabled = filter.reasoning !== undefined && filter.reasoning !== false;

  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs text-gray-600">
        Uses an LLM to check if each flagged issue is actually supported, explained, or qualified
        elsewhere in the document. Issues that are well-supported are filtered out.
      </p>

      {/* Model Selection */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 w-20">Model</span>
        <div className="flex-1 relative">
          <button
            onClick={() => !disabled && setShowModelDropdown(!showModelDropdown)}
            disabled={disabled}
            className="flex items-center gap-2 text-left px-2 py-1 rounded hover:bg-orange-100 disabled:hover:bg-transparent disabled:cursor-default"
          >
            <span className="font-mono text-sm text-orange-900">{getModelDisplayName(filter.model)}</span>
            {!disabled && <ChevronDownIcon className="h-3 w-3 text-orange-400" />}
          </button>
          {showModelDropdown && (
            <ModelSelector
              models={models}
              loading={modelsLoading}
              onSelect={(model) => {
                onUpdate({ model: model.id });
                setShowModelDropdown(false);
              }}
              onCancel={() => setShowModelDropdown(false)}
            />
          )}
        </div>
      </div>

      {/* Temperature Selection */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 w-20">Temperature</span>
        <div className="relative">
          <button
            onClick={() => !disabled && setShowTempDropdown(!showTempDropdown)}
            disabled={disabled}
            className="flex items-center gap-2 text-left px-2 py-1 rounded hover:bg-orange-100 disabled:hover:bg-transparent disabled:cursor-default min-w-[80px]"
          >
            <span className="font-mono text-sm text-orange-900">{tempDisplay}</span>
            {!disabled && <ChevronDownIcon className="h-3 w-3 text-orange-400" />}
          </button>
          {showTempDropdown && (
            <div className="absolute z-20 left-0 top-full mt-1 bg-white border rounded-lg shadow-lg overflow-hidden">
              {TEMP_PRESETS.map((temp) => (
                <button
                  key={String(temp)}
                  onClick={() => {
                    onUpdate({ temperature: temp });
                    setShowTempDropdown(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left text-sm hover:bg-orange-50 ${
                    tempDisplay === temp ? "bg-orange-100 font-medium" : ""
                  }`}
                >
                  {temp === "default" ? "default" : temp}
                </button>
              ))}
              <div className="border-t p-2">
                <button
                  onClick={() => setShowTempDropdown(false)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reasoning/Thinking Selection */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 w-20">Reasoning</span>
        <div className="relative">
          <button
            onClick={() => !disabled && setShowReasoningDropdown(!showReasoningDropdown)}
            disabled={disabled}
            className={`flex items-center gap-2 text-left px-2 py-1 rounded hover:bg-orange-100 disabled:hover:bg-transparent disabled:cursor-default min-w-[80px] ${
              isReasoningEnabled ? "text-green-700" : "text-gray-600"
            }`}
          >
            <span className="font-mono text-sm">{getReasoningDisplay()}</span>
            {!disabled && <ChevronDownIcon className="h-3 w-3 text-orange-400" />}
          </button>
          {showReasoningDropdown && (
            <div className="absolute z-20 left-0 top-full mt-1 bg-white border rounded-lg shadow-lg overflow-hidden min-w-[160px]">
              {/* Off option */}
              <button
                onClick={() => {
                  onUpdate({ reasoning: false });
                  setShowReasoningDropdown(false);
                }}
                className={`w-full px-3 py-1.5 text-left text-sm hover:bg-orange-50 ${
                  !isReasoningEnabled ? "bg-orange-100 font-medium" : ""
                }`}
              >
                Off
              </button>
              <div className="border-t border-gray-100" />
              {/* Effort levels */}
              {REASONING_EFFORT_OPTIONS.map((effort) => {
                const isSelected = filter.reasoning && "effort" in filter.reasoning && filter.reasoning.effort === effort;
                return (
                  <button
                    key={effort}
                    onClick={() => {
                      onUpdate({ reasoning: { effort } });
                      setShowReasoningDropdown(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left text-sm hover:bg-orange-50 flex justify-between ${
                      isSelected ? "bg-orange-100 font-medium" : ""
                    }`}
                  >
                    <span>{effort}</span>
                    <span className="text-xs text-gray-400">{EFFORT_TO_BUDGET_TOKENS[effort]} tok</span>
                  </button>
                );
              })}
              <div className="border-t p-2">
                <button
                  onClick={() => setShowReasoningDropdown(false)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Custom Prompt */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Custom Prompt</span>
          {filter.customPrompt && (
            <button
              onClick={() => !disabled && onUpdate({ customPrompt: undefined })}
              disabled={disabled}
              className="text-xs text-orange-600 hover:text-orange-700 disabled:opacity-50"
            >
              Reset to default
            </button>
          )}
        </div>
        <textarea
          value={filter.customPrompt || ""}
          onChange={(e) => onUpdate({ customPrompt: e.target.value || undefined })}
          disabled={disabled}
          placeholder={defaultPrompt ? "Using default prompt (click to customize)" : "Enter custom system prompt..."}
          className="w-full px-2 py-1.5 text-xs font-mono border rounded resize-y min-h-[60px] max-h-[200px] disabled:bg-gray-50 placeholder:text-gray-400"
          rows={3}
        />
        {/* Default prompt preview */}
        {defaultPrompt && !filter.customPrompt && (
          <details className="text-xs">
            <summary className="text-gray-500 cursor-pointer hover:text-gray-700">
              View default prompt
            </summary>
            <pre className="mt-1 p-2 bg-gray-50 border rounded max-h-32 overflow-auto whitespace-pre-wrap text-gray-600">
              {defaultPrompt}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

interface PrincipleOfCharitySettingsProps {
  filter: PrincipleOfCharityFilterConfig;
  disabled?: boolean;
  onUpdate: (updates: Partial<PrincipleOfCharityFilterConfig>) => void;
}

function PrincipleOfCharitySettings({
  filter,
  disabled,
  onUpdate,
}: PrincipleOfCharitySettingsProps) {
  const { models, loading: modelsLoading } = useModels();
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showTempDropdown, setShowTempDropdown] = useState(false);
  const [showReasoningDropdown, setShowReasoningDropdown] = useState(false);

  const tempDisplay = filter.temperature === undefined || filter.temperature === "default"
    ? "default"
    : filter.temperature;

  const getReasoningDisplay = () => {
    if (filter.reasoning === undefined || filter.reasoning === false) return "Off";
    if ("effort" in filter.reasoning) return filter.reasoning.effort;
    if ("budget_tokens" in filter.reasoning) return `${filter.reasoning.budget_tokens} tokens`;
    return "Off";
  };

  const isReasoningEnabled = filter.reasoning !== undefined && filter.reasoning !== false;

  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs text-gray-600">
        Applies the &quot;Principle of Charity&quot; - interprets arguments in their strongest, most
        reasonable form before critiquing. Issues that dissolve under charitable interpretation
        are filtered out.
      </p>

      {/* Model Selection */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 w-20">Model</span>
        <div className="flex-1 relative">
          <button
            onClick={() => !disabled && setShowModelDropdown(!showModelDropdown)}
            disabled={disabled}
            className="flex items-center gap-2 text-left px-2 py-1 rounded hover:bg-orange-100 disabled:hover:bg-transparent disabled:cursor-default"
          >
            <span className="font-mono text-sm text-orange-900">{getModelDisplayName(filter.model)}</span>
            {!disabled && <ChevronDownIcon className="h-3 w-3 text-orange-400" />}
          </button>
          {showModelDropdown && (
            <ModelSelector
              models={models}
              loading={modelsLoading}
              onSelect={(model) => {
                onUpdate({ model: model.id });
                setShowModelDropdown(false);
              }}
              onCancel={() => setShowModelDropdown(false)}
            />
          )}
        </div>
      </div>

      {/* Temperature Selection */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 w-20">Temperature</span>
        <div className="relative">
          <button
            onClick={() => !disabled && setShowTempDropdown(!showTempDropdown)}
            disabled={disabled}
            className="flex items-center gap-2 text-left px-2 py-1 rounded hover:bg-orange-100 disabled:hover:bg-transparent disabled:cursor-default min-w-[80px]"
          >
            <span className="font-mono text-sm text-orange-900">{tempDisplay}</span>
            {!disabled && <ChevronDownIcon className="h-3 w-3 text-orange-400" />}
          </button>
          {showTempDropdown && (
            <div className="absolute z-20 left-0 top-full mt-1 bg-white border rounded-lg shadow-lg overflow-hidden">
              {TEMP_PRESETS.map((temp) => (
                <button
                  key={String(temp)}
                  onClick={() => {
                    onUpdate({ temperature: temp });
                    setShowTempDropdown(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left text-sm hover:bg-orange-50 ${
                    tempDisplay === temp ? "bg-orange-100 font-medium" : ""
                  }`}
                >
                  {temp === "default" ? "default" : temp}
                </button>
              ))}
              <div className="border-t p-2">
                <button
                  onClick={() => setShowTempDropdown(false)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reasoning/Thinking Selection */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 w-20">Reasoning</span>
        <div className="relative">
          <button
            onClick={() => !disabled && setShowReasoningDropdown(!showReasoningDropdown)}
            disabled={disabled}
            className={`flex items-center gap-2 text-left px-2 py-1 rounded hover:bg-orange-100 disabled:hover:bg-transparent disabled:cursor-default min-w-[80px] ${
              isReasoningEnabled ? "text-green-700" : "text-gray-600"
            }`}
          >
            <span className="font-mono text-sm">{getReasoningDisplay()}</span>
            {!disabled && <ChevronDownIcon className="h-3 w-3 text-orange-400" />}
          </button>
          {showReasoningDropdown && (
            <div className="absolute z-20 left-0 top-full mt-1 bg-white border rounded-lg shadow-lg overflow-hidden min-w-[160px]">
              <button
                onClick={() => {
                  onUpdate({ reasoning: false });
                  setShowReasoningDropdown(false);
                }}
                className={`w-full px-3 py-1.5 text-left text-sm hover:bg-orange-50 ${
                  !isReasoningEnabled ? "bg-orange-100 font-medium" : ""
                }`}
              >
                Off
              </button>
              <div className="border-t border-gray-100" />
              {REASONING_EFFORT_OPTIONS.map((effort) => {
                const isSelected = filter.reasoning && "effort" in filter.reasoning && filter.reasoning.effort === effort;
                return (
                  <button
                    key={effort}
                    onClick={() => {
                      onUpdate({ reasoning: { effort } });
                      setShowReasoningDropdown(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left text-sm hover:bg-orange-50 flex justify-between ${
                      isSelected ? "bg-orange-100 font-medium" : ""
                    }`}
                  >
                    <span>{effort}</span>
                    <span className="text-xs text-gray-400">{EFFORT_TO_BUDGET_TOKENS[effort]} tok</span>
                  </button>
                );
              })}
              <div className="border-t p-2">
                <button
                  onClick={() => setShowReasoningDropdown(false)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface SeveritySettingsProps {
  filter: SeverityFilterConfig;
  disabled?: boolean;
  onUpdate: (updates: Partial<SeverityFilterConfig>) => void;
}

function SeveritySettings({ filter, disabled, onUpdate }: SeveritySettingsProps) {
  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs text-gray-600">
        Removes issues with a severity score below the threshold.
      </p>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 w-24">Min Severity</span>
        <input
          type="number"
          min={0}
          max={100}
          value={filter.minSeverity}
          onChange={(e) => onUpdate({ minSeverity: Number(e.target.value) })}
          disabled={disabled}
          className="w-20 px-2 py-1 text-sm border rounded disabled:bg-gray-50"
        />
        <span className="text-xs text-gray-400">(0-100)</span>
      </div>
    </div>
  );
}

interface ConfidenceSettingsProps {
  filter: ConfidenceFilterConfig;
  disabled?: boolean;
  onUpdate: (updates: Partial<ConfidenceFilterConfig>) => void;
}

function ConfidenceSettings({ filter, disabled, onUpdate }: ConfidenceSettingsProps) {
  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs text-gray-600">
        Removes issues with a confidence score below the threshold.
      </p>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 w-24">Min Confidence</span>
        <input
          type="number"
          min={0}
          max={100}
          value={filter.minConfidence}
          onChange={(e) => onUpdate({ minConfidence: Number(e.target.value) })}
          disabled={disabled}
          className="w-20 px-2 py-1 text-sm border rounded disabled:bg-gray-50"
        />
        <span className="text-xs text-gray-400">(0-100)</span>
      </div>
    </div>
  );
}
