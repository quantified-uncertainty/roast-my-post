"use client";

import { useMemo } from "react";
import type { ProviderPreferences } from "../../types";
import { useModelEndpoints } from "../../hooks/useModelEndpoints";

interface ProviderSelectorProps {
  provider: ProviderPreferences | undefined;
  onChange: (provider: ProviderPreferences | undefined) => void;
  disabled?: boolean;
  modelId: string;
  /** Whether to indent the content (for use inside ModelConfigurator with label) */
  indent?: boolean;
}

export function ProviderSelector({
  provider,
  onChange,
  disabled,
  modelId,
  indent = false,
}: ProviderSelectorProps) {
  const selectedProviders = provider?.order || [];

  // Fetch available providers/endpoints for this specific model
  const { endpoints, loading: endpointsLoading } = useModelEndpoints(modelId);

  // Convert endpoints to provider format for the UI
  const availableProviders = useMemo(
    () =>
      endpoints.map((ep) => ({
        id: ep.tag,
        name: ep.providerName,
        uptime: ep.uptimeLast30m,
      })),
    [endpoints]
  );

  const toggleProvider = (providerId: string) => {
    if (disabled) return;
    const current = selectedProviders;
    const newOrder = current.includes(providerId)
      ? current.filter((p) => p !== providerId)
      : [...current, providerId];

    if (newOrder.length === 0) {
      onChange(undefined);
    } else {
      onChange({ order: newOrder, allow_fallbacks: provider?.allow_fallbacks ?? true });
    }
  };

  const moveProvider = (providerId: string, direction: "up" | "down") => {
    if (disabled) return;
    const current = [...selectedProviders];
    const index = current.indexOf(providerId);
    if (index === -1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= current.length) return;

    [current[index], current[newIndex]] = [current[newIndex], current[index]];
    onChange({ order: current, allow_fallbacks: provider?.allow_fallbacks ?? true });
  };

  const containerClass = indent ? "pl-5 space-y-2" : "space-y-2";

  // Show loading state
  if (endpointsLoading) {
    return (
      <div className={containerClass}>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Provider Preference</span>
          <span className="text-xs text-gray-400 animate-pulse">Loading providers...</span>
        </div>
      </div>
    );
  }

  // No providers available for this model
  if (availableProviders.length === 0) {
    return (
      <div className={containerClass}>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Provider Preference</span>
          <span className="text-xs text-gray-400">(no routing options)</span>
        </div>
      </div>
    );
  }

  // Only one provider - no need to show selection
  if (availableProviders.length === 1) {
    return (
      <div className={containerClass}>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Provider</span>
          <span className="text-xs text-gray-600">{availableProviders[0].name}</span>
          <span className="text-xs text-green-600">
            ({Math.round(availableProviders[0].uptime)}% uptime)
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Provider Preference</span>
        <span className="text-xs text-gray-400">({availableProviders.length} available)</span>
      </div>

      {/* Selected providers in order */}
      {selectedProviders.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {selectedProviders.map((pid, idx) => {
            const providerInfo = availableProviders.find((p) => p.id === pid);
            return (
              <div
                key={pid}
                className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"
              >
                <span className="font-medium">{idx + 1}.</span>
                <span>{providerInfo?.name || pid}</span>
                {providerInfo?.uptime !== undefined && (
                  <span className="text-blue-500 text-[10px]">
                    ({Math.round(providerInfo.uptime)}%)
                  </span>
                )}
                {!disabled && (
                  <>
                    {idx > 0 && (
                      <button
                        onClick={() => moveProvider(pid, "up")}
                        className="text-blue-500 hover:text-blue-700 px-0.5"
                        title="Move up in priority"
                      >
                        ↑
                      </button>
                    )}
                    {idx < selectedProviders.length - 1 && (
                      <button
                        onClick={() => moveProvider(pid, "down")}
                        className="text-blue-500 hover:text-blue-700 px-0.5"
                        title="Move down in priority"
                      >
                        ↓
                      </button>
                    )}
                    <button
                      onClick={() => toggleProvider(pid)}
                      className="text-blue-500 hover:text-red-600 ml-1"
                      title="Remove"
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Provider selection dropdown */}
      {!disabled && (
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) {
              toggleProvider(e.target.value);
            }
          }}
          className="px-2 py-1 text-xs border border-gray-200 rounded bg-white"
        >
          <option value="">
            {selectedProviders.length === 0 ? "Select preferred provider..." : "+ Add provider"}
          </option>
          {availableProviders
            .filter((p) => !selectedProviders.includes(p.id))
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({Math.round(p.uptime)}% uptime)
              </option>
            ))}
        </select>
      )}

      {/* Fallback toggle */}
      {selectedProviders.length > 0 && (
        <label className="flex items-center gap-2 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={provider?.allow_fallbacks ?? true}
            onChange={(e) => {
              if (disabled) return;
              onChange({ order: selectedProviders, allow_fallbacks: e.target.checked });
            }}
            disabled={disabled}
            className="rounded border-gray-300"
          />
          Allow fallback to other providers
        </label>
      )}

      {selectedProviders.length === 0 && (
        <p className="text-xs text-gray-400 italic">
          No preference set - OpenRouter will choose automatically
        </p>
      )}
    </div>
  );
}
