import { useState, useCallback } from "react";
import type { CorpusDocument } from "../types";

interface UseCorpusDocsReturn {
  documents: CorpusDocument[];
  loading: boolean;
  error: string | null;
  refresh: (filter?: string) => Promise<void>;
}

export function useCorpusDocs(agentId: string): UseCorpusDocsReturn {
  const [documents, setDocuments] = useState<CorpusDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (filter?: string) => {
      if (!agentId) return;
      setLoading(true);
      setError(null);
      try {
        const url = new URL("/api/monitor/lab/corpus", window.location.origin);
        url.searchParams.set("agentId", agentId);
        if (filter) url.searchParams.set("filter", filter);

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error("Failed to fetch corpus documents");
        const data = await res.json();
        setDocuments(data.documents);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [agentId]
  );

  return { documents, loading, error, refresh };
}
