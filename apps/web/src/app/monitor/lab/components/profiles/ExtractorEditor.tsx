"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { PlusIcon, TrashIcon, ChevronDownIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { ExtractorConfig, ReasoningConfig, ReasoningEffort } from "../../types";
import { useModels, type ModelInfo } from "../../hooks/useModels";

const REASONING_OPTIONS: Array<{ value: string; label: string; tokens: string }> = [
  { value: "off", label: "Off", tokens: "" },
  { value: "minimal", label: "Minimal", tokens: "1K" },
  { value: "low", label: "Low", tokens: "2K" },
  { value: "medium", label: "Medium", tokens: "8K" },
  { value: "high", label: "High", tokens: "16K" },
  { value: "xhigh", label: "Very High", tokens: "32K" },
];

const TEMP_PRESETS: Array<{ value: "default" | number; label: string }> = [
  { value: "default", label: "Auto" },
  { value: 0, label: "0" },
  { value: 0.3, label: "0.3" },
  { value: 0.7, label: "0.7" },
  { value: 1.0, label: "1.0" },
];

interface ExtractorEditorProps {
  extractors: ExtractorConfig[];
  onChange: (extractors: ExtractorConfig[]) => void;
  disabled?: boolean;
}

export function ExtractorEditor({ extractors, onChange, disabled }: ExtractorEditorProps) {
  const { models, loading: modelsLoading, error: modelsError } = useModels();
  const [addingExtractor, setAddingExtractor] = useState(false);

  const updateExtractor = (index: number, updates: Partial<ExtractorConfig>) => {
    const newExtractors = [...extractors];
    newExtractors[index] = { ...newExtractors[index], ...updates };
    onChange(newExtractors);
  };

  const removeExtractor = (index: number) => {
    if (extractors.length <= 1) return;
    onChange(extractors.filter((_, i) => i !== index));
  };

  const addExtractor = (model: ModelInfo) => {
    onChange([
      ...extractors,
      { model: model.id, temperature: "default", thinking: false },
    ]);
    setAddingExtractor(false);
  };

  return (
    <div className="space-y-3">
      {extractors.map((ext, index) => (
        <ExtractorRow
          key={index}
          extractor={ext}
          index={index}
          models={models}
          modelsLoading={modelsLoading}
          onChange={(updates) => updateExtractor(index, updates)}
          onRemove={() => removeExtractor(index)}
          canRemove={extractors.length > 1}
          disabled={disabled}
        />
      ))}

      {/* Add Extractor Button / Model Selector */}
      {!disabled && (
        addingExtractor ? (
          <ModelSelector
            models={models}
            loading={modelsLoading}
            error={modelsError}
            onSelect={addExtractor}
            onCancel={() => setAddingExtractor(false)}
          />
        ) : (
          <button
            onClick={() => setAddingExtractor(true)}
            className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-md text-sm w-full border border-dashed border-blue-200"
          >
            <PlusIcon className="h-4 w-4" />
            Add Extractor
          </button>
        )
      )}
    </div>
  );
}

interface ExtractorRowProps {
  extractor: ExtractorConfig;
  index: number;
  models: ModelInfo[];
  modelsLoading: boolean;
  onChange: (updates: Partial<ExtractorConfig>) => void;
  onRemove: () => void;
  canRemove: boolean;
  disabled?: boolean;
}

function ExtractorRow({
  extractor,
  index,
  models,
  modelsLoading,
  onChange,
  onRemove,
  canRemove,
  disabled,
}: ExtractorRowProps) {
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showCustomTemp, setShowCustomTemp] = useState(false);
  const [customTempValue, setCustomTempValue] = useState(
    typeof extractor.temperature === "number" ? extractor.temperature : 0.5
  );

  const modelName = getModelDisplayName(extractor.model);

  // Find model info for the selected model
  const modelInfo = models.find((m) => m.id === extractor.model);
  const supportsTemperature = modelInfo?.supportsTemperature ?? true;
  const supportsReasoning = modelInfo?.supportsReasoning ?? true;
  const defaultTemperature = modelInfo?.defaultTemperature;
  const maxTemperature = modelInfo?.maxTemperature ?? 1;

  // Check if current value is a preset or custom
  // Must include all dropdown option values, not just TEMP_PRESETS
  const DROPDOWN_TEMPS = [0, 0.3, 0.7, 1, 1.5, 2];
  const isCustomTemp = typeof extractor.temperature === "number" &&
    !DROPDOWN_TEMPS.includes(extractor.temperature);

  // Build auto label with default temp if known
  const autoLabel = defaultTemperature !== undefined
    ? `Auto (${defaultTemperature})`
    : "Auto";

  return (
    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 space-y-3">
      {/* Top row: model, reasoning, delete */}
      <div className="flex items-center gap-2">
        {/* Index */}
        <span className="text-xs text-blue-400 font-medium w-5">{index + 1}</span>

        {/* Model Selector */}
        <div className="flex-1 min-w-0 relative">
          <button
            onClick={() => !disabled && setShowModelDropdown(!showModelDropdown)}
            disabled={disabled}
            className="flex items-center gap-2 w-full text-left px-2 py-1 rounded hover:bg-blue-100 disabled:hover:bg-transparent disabled:cursor-default"
          >
            <span className="font-mono text-sm text-blue-900 truncate">{modelName}</span>
            {!disabled && <ChevronDownIcon className="h-3 w-3 text-blue-400 flex-shrink-0" />}
          </button>
          {showModelDropdown && (
            <ModelSelector
              models={models}
              loading={modelsLoading}
              error={null}
              onSelect={(model) => {
                onChange({ model: model.id });
                setShowModelDropdown(false);
              }}
              onCancel={() => setShowModelDropdown(false)}
              compact
            />
          )}
        </div>

        {/* Reasoning Dropdown - only show if model supports it */}
        {supportsReasoning ? (
          <select
            value={getReasoningValue(extractor.reasoning, extractor.thinking)}
            onChange={(e) => {
              if (disabled) return;
              const val = e.target.value;
              if (val === "off") {
                onChange({ reasoning: false, thinking: false });
              } else {
                onChange({ reasoning: { effort: val as ReasoningEffort }, thinking: true });
              }
            }}
            disabled={disabled}
            className={`px-2 py-1 text-xs rounded border transition-colors ${
              getReasoningValue(extractor.reasoning, extractor.thinking) !== "off"
                ? "bg-green-100 text-green-700 border-green-200"
                : "bg-gray-100 text-gray-500 border-gray-200"
            } disabled:bg-gray-50 disabled:text-gray-500`}
            title="Extended reasoning effort level"
          >
            {REASONING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}{opt.tokens ? ` (${opt.tokens})` : ""}
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
        <button
          onClick={onRemove}
          disabled={disabled || !canRemove}
          className={`p-1 rounded ${
            canRemove && !disabled
              ? "text-gray-400 hover:text-red-600 hover:bg-red-50"
              : "text-gray-300 cursor-not-allowed"
          }`}
          title={canRemove ? "Remove extractor" : "Cannot remove last extractor"}
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Temperature row - only show if model supports it */}
      {supportsTemperature ? (
        <div className="pl-5 flex items-start gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Temperature</span>
            <select
              value={isCustomTemp ? "custom" : String(extractor.temperature ?? "default")}
              onChange={(e) => {
                if (disabled) return;
                const val = e.target.value;
                if (val === "custom") {
                  setShowCustomTemp(true);
                  onChange({ temperature: customTempValue });
                } else if (val === "default") {
                  setShowCustomTemp(false);
                  onChange({ temperature: "default" });
                } else {
                  setShowCustomTemp(false);
                  onChange({ temperature: parseFloat(val) });
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
          </div>

          {/* Custom temperature slider */}
          {(showCustomTemp || isCustomTemp) && !disabled && (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="range"
                min={0}
                max={maxTemperature}
                step={0.05}
                value={typeof extractor.temperature === "number" ? extractor.temperature : customTempValue}
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
                value={typeof extractor.temperature === "number" ? extractor.temperature : customTempValue}
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
        <div className="pl-5 text-xs text-gray-400">
          Temperature not supported by this model
        </div>
      )}
    </div>
  );
}

interface ModelSelectorProps {
  models: ModelInfo[];
  loading: boolean;
  error: string | null;
  onSelect: (model: ModelInfo) => void;
  onCancel: () => void;
  compact?: boolean;
}

function ModelSelector({ models, loading, error, onSelect, onCancel, compact }: ModelSelectorProps) {
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filteredModels = useMemo(() => {
    if (!search.trim()) return models;
    const lowerSearch = search.toLowerCase();
    return models.filter(
      (m) =>
        m.id.toLowerCase().includes(lowerSearch) ||
        m.name.toLowerCase().includes(lowerSearch)
    );
  }, [models, search]);

  const anthropicModels = filteredModels.filter((m) => m.provider === "anthropic");
  const openRouterModels = filteredModels.filter((m) => m.provider === "openrouter");

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onCancel();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, filteredModels.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && filteredModels.length > 0) {
      e.preventDefault();
      onSelect(filteredModels[highlightedIndex]);
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const highlighted = list.querySelector(`[data-index="${highlightedIndex}"]`);
    highlighted?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  if (loading) {
    return (
      <div className={`${compact ? "absolute z-10 left-0 right-0 top-full mt-1" : ""} bg-white border rounded-lg shadow-lg p-4`}>
        <span className="text-sm text-gray-500">Loading models...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${compact ? "absolute z-10 left-0 right-0 top-full mt-1" : ""} bg-white border rounded-lg shadow-lg p-4`}>
        <span className="text-sm text-red-500">{error}</span>
        <button onClick={onCancel} className="ml-2 text-sm text-blue-600 hover:underline">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div
      className={`${compact ? "absolute z-10 left-0 top-full mt-1 min-w-[300px]" : ""} bg-white border rounded-lg shadow-lg overflow-hidden`}
      onKeyDown={handleKeyDown}
    >
      {/* Search Input */}
      <div className="p-2 border-b">
        <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded border">
          <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setHighlightedIndex(0);
            }}
            placeholder="Search models..."
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500 px-1">
          <span>{filteredModels.length} models</span>
          <button onClick={onCancel} className="text-blue-600 hover:underline">
            Cancel
          </button>
        </div>
      </div>

      {/* Model List */}
      <div ref={listRef} className="max-h-[300px] overflow-y-auto">
        {anthropicModels.length > 0 && (
          <>
            <div className="px-3 py-1.5 bg-gray-50 text-xs font-medium text-gray-500 sticky top-0">
              Anthropic ({anthropicModels.length})
            </div>
            {anthropicModels.map((model, i) => {
              const globalIndex = filteredModels.indexOf(model);
              return (
                <ModelItem
                  key={model.id}
                  model={model}
                  isHighlighted={globalIndex === highlightedIndex}
                  onSelect={() => onSelect(model)}
                  onMouseEnter={() => setHighlightedIndex(globalIndex)}
                  dataIndex={globalIndex}
                />
              );
            })}
          </>
        )}

        {openRouterModels.length > 0 && (
          <>
            <div className="px-3 py-1.5 bg-gray-50 text-xs font-medium text-gray-500 sticky top-0">
              OpenRouter ({openRouterModels.length})
            </div>
            {openRouterModels.map((model) => {
              const globalIndex = filteredModels.indexOf(model);
              return (
                <ModelItem
                  key={model.id}
                  model={model}
                  isHighlighted={globalIndex === highlightedIndex}
                  onSelect={() => onSelect(model)}
                  onMouseEnter={() => setHighlightedIndex(globalIndex)}
                  dataIndex={globalIndex}
                />
              );
            })}
          </>
        )}

        {filteredModels.length === 0 && (
          <div className="p-4 text-center text-sm text-gray-500">
            No models found matching "{search}"
          </div>
        )}
      </div>
    </div>
  );
}

interface ModelItemProps {
  model: ModelInfo;
  isHighlighted: boolean;
  onSelect: () => void;
  onMouseEnter: () => void;
  dataIndex: number;
}

function ModelItem({ model, isHighlighted, onSelect, onMouseEnter, dataIndex }: ModelItemProps) {
  return (
    <button
      data-index={dataIndex}
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${
        isHighlighted ? "bg-blue-50" : ""
      }`}
    >
      <span className="font-mono text-gray-900">{getModelDisplayName(model.id)}</span>
      {model.name !== model.id && (
        <span className="ml-2 text-gray-500 text-xs">{model.name}</span>
      )}
    </button>
  );
}

/**
 * Shorten model ID for display
 * e.g., "claude-sonnet-4-5-20250929" -> "claude-sonnet-4-5"
 * e.g., "google/gemini-2.5-flash" -> "gemini-2.5-flash"
 */
function getModelDisplayName(modelId: string): string {
  // Remove date suffix like -20250929
  let name = modelId.replace(/-\d{8}$/, "");

  // Remove provider prefix like "google/"
  if (name.includes("/")) {
    name = name.split("/").pop() || name;
  }

  return name;
}

/**
 * Convert ReasoningConfig to dropdown value string
 * Handles both new reasoning config and legacy thinking boolean
 */
function getReasoningValue(reasoning: ReasoningConfig | undefined, thinking?: boolean): string {
  // Handle new reasoning config
  if (reasoning !== undefined) {
    if (reasoning === false) return "off";
    if (typeof reasoning === "object" && "effort" in reasoning) {
      return reasoning.effort;
    }
    // Custom budget_tokens - default to "high" in the dropdown
    if (typeof reasoning === "object" && "budget_tokens" in reasoning) {
      return "high";
    }
  }

  // Fallback to legacy thinking boolean
  if (thinking === true) return "medium"; // Default legacy "on" to medium
  return "off";
}
