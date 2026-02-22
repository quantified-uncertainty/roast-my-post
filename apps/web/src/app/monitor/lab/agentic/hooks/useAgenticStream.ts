import { useState, useRef, useCallback } from "react";

export interface AgenticStreamEvent {
  type:
    | "init"
    | "assistant_text"
    | "tool_use"
    | "tool_result"
    | "status"
    | "cost_update"
    | "result"
    | "error"
    // Sub-agent events (v2 multi-agent mode)
    | "subagent_start"
    | "subagent_text"
    | "subagent_tool_use"
    | "subagent_tool_result"
    | "subagent_complete"
    // SDK lifecycle events
    | "tool_progress"
    | "task_notification"
    | "compacting";
  [key: string]: unknown;
}

export interface AgenticComment {
  header: string | null;
  description: string;
  level: string;
  source: string | null;
  highlight: {
    startOffset: number;
    endOffset: number;
    quotedText?: string;
  };
}

interface AgenticResult {
  summary: string;
  grade: number;
  cost: number;
  commentCount: number;
  comments: AgenticComment[];
}

interface AgenticState {
  status: "idle" | "running" | "done" | "error";
  events: AgenticStreamEvent[];
  result: AgenticResult | null;
  error: string | null;
}

export function useAgenticStream() {
  const [state, setState] = useState<AgenticState>({
    status: "idle",
    events: [],
    result: null,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async (documentId: string, profileId?: string) => {
    // Abort any existing stream
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({
      status: "running",
      events: [],
      result: null,
      error: null,
    });

    try {
      const response = await fetch("/api/monitor/agentic/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, profileId }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;

          try {
            const event = JSON.parse(trimmed.slice(6));
            event._receivedAt = Date.now();

            if (event.type === "complete") {
              setState((prev) => ({
                ...prev,
                status: "done",
                result: {
                  summary: event.summary,
                  grade: event.grade,
                  cost: event.cost,
                  commentCount: event.commentCount,
                  comments: event.comments ?? [],
                },
              }));
            } else if (event.type === "error") {
              setState((prev) => ({
                ...prev,
                events: [...prev.events, event],
                error: event.message,
              }));
            } else {
              setState((prev) => ({
                ...prev,
                events: [...prev.events, event],
              }));
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      // If we finished reading without a "complete" event
      setState((prev) => {
        if (prev.status === "running") {
          return { ...prev, status: prev.error ? "error" : "done" };
        }
        return prev;
      });
    } catch (err) {
      if (controller.signal.aborted) return;
      const message = err instanceof Error ? err.message : String(err);
      setState((prev) => ({
        ...prev,
        status: "error",
        error: message,
      }));
    }
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => ({
      ...prev,
      status: prev.status === "running" ? "done" : prev.status,
    }));
  }, []);

  return { ...state, start, stop };
}
