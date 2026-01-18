import { useState, useCallback, useEffect } from "react";
import type { Baseline } from "../types";

interface UseBaselinesReturn {
  baselines: Baseline[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createBaseline: (name: string, description: string, evaluationVersionIds: string[]) => Promise<Baseline>;
  deleteBaseline: (id: string) => Promise<void>;
}

export function useBaselines(agentId: string): UseBaselinesReturn {
  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/monitor/lab/baselines?agentId=${agentId}`);
      if (!res.ok) throw new Error("Failed to fetch baselines");
      const data = await res.json();
      setBaselines(data.baselines);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createBaseline = useCallback(
    async (name: string, description: string, evaluationVersionIds: string[]): Promise<Baseline> => {
      const res = await fetch("/api/monitor/lab/baselines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, agentId, evaluationVersionIds }),
      });
      if (!res.ok) throw new Error("Failed to create baseline");
      const data = await res.json();
      await refresh();
      return data.baseline;
    },
    [agentId, refresh]
  );

  const deleteBaseline = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/monitor/lab/baselines/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete baseline");
      await refresh();
    },
    [refresh]
  );

  return { baselines, loading, error, refresh, createBaseline, deleteBaseline };
}
