"use client";

import { useRef, useEffect, useState } from "react";
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

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [events.length]);

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Events will appear here when analysis starts...
      </div>
    );
  }

  return (
    <div ref={containerRef} className="overflow-y-auto h-full space-y-1 p-3 font-mono text-xs">
      {events.map((event, i) => (
        <EventRow key={i} index={i} event={event} />
      ))}
    </div>
  );
}
