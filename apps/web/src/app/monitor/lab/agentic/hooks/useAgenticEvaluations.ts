import { useState, useEffect, useCallback } from "react";

export interface AgenticEvaluation {
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
  comments: {
    id: string;
    header: string | null;
    description: string;
    importance: number | null;
    quotedText: string;
  }[];
  telemetry: {
    totalCostUsd?: number;
    profileName?: string | null;
  } | null;
}

interface UseAgenticEvaluationsReturn {
  evaluations: AgenticEvaluation[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const AGENT_ID = "system-agentic";

export function useAgenticEvaluations(): UseAgenticEvaluationsReturn {
  const [evaluations, setEvaluations] = useState<AgenticEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/monitor/lab/evaluations?agentId=${AGENT_ID}&limit=50`);
      if (!response.ok) {
        throw new Error(`Failed to fetch evaluations: ${response.statusText}`);
      }
      const data = await response.json();
      setEvaluations(data.evaluations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { evaluations, loading, error, refresh };
}
