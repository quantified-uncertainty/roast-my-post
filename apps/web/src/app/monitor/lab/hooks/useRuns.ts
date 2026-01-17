import { useState, useCallback, useEffect } from "react";
import type { ValidationRun, ValidationRunDetail } from "../types";

interface UseRunsReturn {
  runs: ValidationRun[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  startRun: (baselineId: string, name?: string) => Promise<ValidationRun>;
  getRunDetail: (runId: string) => Promise<ValidationRunDetail | null>;
  deleteRun: (runId: string) => Promise<void>;
}

export function useRuns(baselineId: string | null): UseRunsReturn {
  const [runs, setRuns] = useState<ValidationRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!baselineId) {
      setRuns([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/monitor/lab/runs?baselineId=${baselineId}`);
      if (!res.ok) throw new Error("Failed to fetch runs");
      const data = await res.json();
      setRuns(data.runs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [baselineId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const startRun = useCallback(
    async (baselineId: string, name?: string): Promise<ValidationRun> => {
      const res = await fetch("/api/monitor/lab/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baselineId, name }),
      });
      if (!res.ok) throw new Error("Failed to start run");
      const data = await res.json();
      return data.run;
    },
    []
  );

  const getRunDetail = useCallback(async (runId: string): Promise<ValidationRunDetail | null> => {
    const res = await fetch(`/api/monitor/lab/runs/${runId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.run;
  }, []);

  const deleteRun = useCallback(
    async (runId: string) => {
      const res = await fetch(`/api/monitor/lab/runs/${runId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete run");
      await refresh();
    },
    [refresh]
  );

  return { runs, loading, error, refresh, startRun, getRunDetail, deleteRun };
}
