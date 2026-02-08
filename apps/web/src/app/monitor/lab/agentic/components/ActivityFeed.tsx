"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { ClipboardDocumentIcon, CheckIcon } from "@heroicons/react/24/outline";
import type { AgenticStreamEvent } from "../hooks/useAgenticStream";

interface ActivityFeedProps {
  events: AgenticStreamEvent[];
}

function formatEvent(event: AgenticStreamEvent): { label: string; color: string } {
  switch (event.type) {
    case "init":
      return {
        label: `Initialized model: ${event.model}`,
        color: "text-gray-500",
      };
    case "assistant_text": {
      return {
        label: String(event.text ?? ""),
        color: "text-blue-700",
      };
    }
    case "tool_use":
      return {
        label: `Using tool: ${event.toolName}`,
        color: "text-orange-600",
      };
    case "tool_result": {
      return {
        label: String(event.output ?? ""),
        color: "text-teal-600",
      };
    }
    case "status":
      return {
        label: String(event.message ?? ""),
        color: "text-gray-600",
      };
    case "cost_update":
      return {
        label: `Cost: $${Number(event.cost ?? 0).toFixed(4)} | Turns: ${event.turns}`,
        color: "text-teal-500",
      };
    case "result":
      return {
        label: `Analysis complete - ${event.findings} findings, grade: ${event.grade}`,
        color: "text-green-600 font-medium",
      };
    case "error":
      return {
        label: `Error: ${event.message}`,
        color: "text-red-600",
      };
    // Sub-agent events (v2 multi-agent mode)
    case "subagent_start":
      return {
        label: `Sub-agent started: ${event.agentName}`,
        color: "text-purple-600 font-medium",
      };
    case "subagent_text":
      return {
        label: `[${event.agentName}] ${event.text}`,
        color: "text-purple-700",
      };
    case "subagent_tool_use":
      return {
        label: `[${event.agentName}] Using: ${event.toolName}`,
        color: "text-orange-500",
      };
    case "subagent_tool_result":
      return {
        label: `[${event.agentName}] ${event.output}`,
        color: "text-teal-500",
      };
    case "subagent_complete":
      return {
        label: `Sub-agent done: ${event.agentName}`,
        color: "text-green-500",
      };
    default:
      return {
        label: JSON.stringify(event),
        color: "text-gray-400",
      };
  }
}

function EventRow({ index, event }: { index: number; event: AgenticStreamEvent }) {
  const [expanded, setExpanded] = useState(false);
  const { label, color } = formatEvent(event);
  const isLong = label.length > 120;

  return (
    <div
      className={`${color} leading-relaxed ${isLong ? "cursor-pointer hover:bg-gray-50 rounded" : ""}`}
      onClick={isLong ? () => setExpanded((v) => !v) : undefined}
    >
      <span className="text-gray-300 mr-2 select-none">{String(index + 1).padStart(3, " ")}</span>
      <span className="inline-block px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px] mr-2 uppercase">
        {event.type}
      </span>
      {expanded ? (
        <span className="whitespace-pre-wrap">{label}</span>
      ) : (
        <span className="truncate">{isLong ? label.slice(0, 120) + "..." : label}</span>
      )}
    </div>
  );
}

export function ActivityFeed({ events }: ActivityFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [events.length]);

  const handleCopy = useCallback(() => {
    // Format events as plain text for copying
    const text = events
      .map((event) => {
        const { label } = formatEvent(event);
        return `${event.type}${label}`;
      })
      .join("\n");

    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Events will appear here when analysis starts...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with copy button */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-1.5 border-b bg-gray-50">
        <span className="text-xs text-gray-500">{events.length} events</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          title="Copy activity feed to clipboard"
        >
          {copied ? (
            <>
              <CheckIcon className="h-3.5 w-3.5 text-green-600" />
              <span className="text-green-600">Copied</span>
            </>
          ) : (
            <>
              <ClipboardDocumentIcon className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      {/* Events list */}
      <div ref={containerRef} className="flex-1 overflow-y-auto space-y-1 p-3 font-mono text-xs">
        {events.map((event, i) => (
          <EventRow key={i} index={i} event={event} />
        ))}
      </div>
    </div>
  );
}
