import { useState, useCallback, useEffect } from "react";
import type { Comment, StageMetrics, ExtractionPhase, FilteredItem, PassedItem, PipelineCounts } from "../types";

export interface EvaluationWithTelemetry {
  id: string;
  evaluationId: string;
  version: number;
  grade: number | null;
  summary: string | null;
  createdAt: string;
  documentId: string;
  documentTitle: string;
  agentId: string;
  agentName: string;
  comments: Comment[];
  telemetry: {
    stages?: StageMetrics[];
    extractionPhase?: ExtractionPhase;
    filteredItems?: FilteredItem[];
    passedItems?: PassedItem[];
    pipelineCounts?: PipelineCounts;
    totalDurationMs?: number;
    totalCostUsd?: number;
    documentLength?: number;
    profileInfo?: {
      profileId: string | null;
      profileName: string | null;
    };
  } | null;
}

interface UseAllEvaluationsReturn {
  evaluations: EvaluationWithTelemetry[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAllEvaluations(agentId?: string): UseAllEvaluationsReturn {
  const [evaluations, setEvaluations] = useState<EvaluationWithTelemetry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      if (agentId) params.set("agentId", agentId);

      const res = await fetch(`/api/monitor/lab/evaluations?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch evaluations");
      const data = await res.json();
      setEvaluations(data.evaluations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { evaluations, loading, error, refresh };
}
