"use client";

import { useState, useEffect } from "react";

export interface ModelEndpoint {
  name: string;
  providerName: string;
  tag: string; // Provider slug like "google-vertex", "together", etc.
  contextLength: number;
  maxCompletionTokens: number | null;
  status: number;
  uptimeLast30m: number;
}

interface UseModelEndpointsReturn {
  endpoints: ModelEndpoint[];
  loading: boolean;
  error: string | null;
}

// Cache endpoints to avoid repeated fetches
const endpointsCache = new Map<string, { endpoints: ModelEndpoint[]; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch available endpoints/providers for a specific OpenRouter model.
 * Only works for OpenRouter models (those with "/" in the ID).
 */
export function useModelEndpoints(modelId: string | null): UseModelEndpointsReturn {
  const [endpoints, setEndpoints] = useState<ModelEndpoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only fetch for OpenRouter models
    if (!modelId || !modelId.includes("/")) {
      setEndpoints([]);
      setLoading(false);
      return;
    }

    // Check cache
    const cached = endpointsCache.get(modelId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      setEndpoints(cached.endpoints);
      setLoading(false);
      return;
    }

    const fetchEndpoints = async () => {
      setLoading(true);
      setError(null);

      try {
        // Use our proxy endpoint to avoid CORS issues
        const response = await fetch(
          `/api/monitor/lab/model-endpoints?model=${encodeURIComponent(modelId)}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch endpoints: ${response.status}`);
        }

        const data = await response.json();
        const rawEndpoints = data.data?.endpoints || [];

        // Parse and deduplicate by tag (provider slug)
        const seenTags = new Set<string>();
        const parsed: ModelEndpoint[] = [];

        for (const ep of rawEndpoints) {
          // Extract base tag (remove region suffixes like "/global")
          const baseTag = ep.tag?.split("/")[0];
          if (!baseTag || seenTags.has(baseTag)) continue;
          seenTags.add(baseTag);

          parsed.push({
            name: ep.name,
            providerName: ep.provider_name,
            tag: baseTag,
            contextLength: ep.context_length || 0,
            maxCompletionTokens: ep.max_completion_tokens,
            status: ep.status,
            uptimeLast30m: ep.uptime_last_30m || 0,
          });
        }

        // Sort by uptime (best first)
        parsed.sort((a, b) => b.uptimeLast30m - a.uptimeLast30m);

        // Cache the result
        endpointsCache.set(modelId, { endpoints: parsed, timestamp: Date.now() });

        setEndpoints(parsed);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch endpoints");
        setEndpoints([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchEndpoints();
  }, [modelId]);

  return { endpoints, loading, error };
}
