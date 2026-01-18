"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { ModelInfo } from "../../hooks/useModels";

interface ModelSelectorProps {
  models: ModelInfo[];
  loading: boolean;
  onSelect: (model: ModelInfo) => void;
  onCancel: () => void;
}

export function ModelSelector({ models, loading, onSelect, onCancel }: ModelSelectorProps) {
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

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const highlighted = list.querySelector(`[data-index="${highlightedIndex}"]`);
    highlighted?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  if (loading) {
    return (
      <div className="absolute z-10 left-0 top-full mt-1 min-w-[300px] bg-white border rounded-lg shadow-lg p-4">
        <span className="text-sm text-gray-500">Loading models...</span>
      </div>
    );
  }

  return (
    <div
      className="absolute z-10 left-0 top-full mt-1 min-w-[300px] bg-white border rounded-lg shadow-lg overflow-hidden"
      onKeyDown={handleKeyDown}
    >
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

      <div ref={listRef} className="max-h-[300px] overflow-y-auto">
        {anthropicModels.length > 0 && (
          <>
            <div className="px-3 py-1.5 bg-gray-50 text-xs font-medium text-gray-500 sticky top-0">
              Anthropic ({anthropicModels.length})
            </div>
            {anthropicModels.map((model) => {
              const globalIndex = filteredModels.indexOf(model);
              return (
                <button
                  key={model.id}
                  data-index={globalIndex}
                  onClick={() => onSelect(model)}
                  onMouseEnter={() => setHighlightedIndex(globalIndex)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-purple-50 ${
                    globalIndex === highlightedIndex ? "bg-purple-50" : ""
                  }`}
                >
                  <span className="font-mono text-gray-900">{getModelDisplayName(model.id)}</span>
                </button>
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
                <button
                  key={model.id}
                  data-index={globalIndex}
                  onClick={() => onSelect(model)}
                  onMouseEnter={() => setHighlightedIndex(globalIndex)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-purple-50 ${
                    globalIndex === highlightedIndex ? "bg-purple-50" : ""
                  }`}
                >
                  <span className="font-mono text-gray-900">{getModelDisplayName(model.id)}</span>
                </button>
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

export function getModelDisplayName(modelId: string): string {
  let name = modelId.replace(/-\d{8}$/, "");
  if (name.includes("/")) {
    name = name.split("/").pop() || name;
  }
  return name;
}
