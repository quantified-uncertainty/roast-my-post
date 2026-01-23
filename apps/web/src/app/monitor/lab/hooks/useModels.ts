"use client";

import { useState, useEffect, useCallback } from "react";

export interface ModelInfo {
  id: string;
  name: string;
  provider: "anthropic" | "openrouter";
  contextLength?: number;
  description?: string;
  supportsTemperature?: boolean;
  defaultTemperature?: number;
  maxTemperature?: number;
  supportsReasoning?: boolean;
}

interface UseModelsReturn {
  models: ModelInfo[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  filterModels: (query: string) => ModelInfo[];
  groupByProvider: () => Map<string, ModelInfo[]>;
}

export function useModels(): UseModelsReturn {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/monitor/lab/models");
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }
      const data = await response.json();
      setModels(data.models);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch models");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchModels();
  }, [fetchModels]);

  const filterModels = useCallback(
    (query: string): ModelInfo[] => {
      if (!query.trim()) {
        return models;
      }
      const lowerQuery = query.toLowerCase();
      return models.filter(
        (m) =>
          m.id.toLowerCase().includes(lowerQuery) ||
          m.name.toLowerCase().includes(lowerQuery) ||
          m.provider.toLowerCase().includes(lowerQuery)
      );
    },
    [models]
  );

  const groupByProvider = useCallback((): Map<string, ModelInfo[]> => {
    const grouped = new Map<string, ModelInfo[]>();
    for (const model of models) {
      const existing = grouped.get(model.provider) || [];
      existing.push(model);
      grouped.set(model.provider, existing);
    }
    return grouped;
  }, [models]);

  return {
    models,
    loading,
    error,
    refresh: fetchModels,
    filterModels,
    groupByProvider,
  };
}
