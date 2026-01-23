"use client";

import { useState, useEffect } from "react";

interface DefaultPrompts {
  extractorSystemPrompt: string;
  extractorUserPrompt: string;
  judgeSystemPrompt: string;
  filterSystemPrompt: string;
}

export function useDefaultPrompts() {
  const [prompts, setPrompts] = useState<DefaultPrompts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPrompts() {
      try {
        const response = await fetch("/api/monitor/lab/prompts");
        if (!response.ok) {
          throw new Error("Failed to fetch default prompts");
        }
        const data = await response.json();
        setPrompts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    void fetchPrompts();
  }, []);

  return { prompts, loading, error };
}
