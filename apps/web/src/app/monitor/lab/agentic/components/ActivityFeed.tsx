"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import {
  ClipboardDocumentIcon,
  CheckIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import type { AgenticStreamEvent } from "../hooks/useAgenticStream";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActivityFeedProps {
  events: AgenticStreamEvent[];
}

interface EventNode {
  kind: "event";
  event: AgenticStreamEvent;
}

interface AgentGroupNode {
  kind: "agent_group";
  agentName: string;
  events: AgenticStreamEvent[];
  complete: boolean;
  toolCount: number;
  durationMs?: number;
}

type TreeNode = EventNode | AgentGroupNode;

interface FormattedEvent {
  label: string;
  color: string;
  dim?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncateStr(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "..." : s;
}

/** Format elapsed time as mm:ss from a start timestamp */
function formatElapsed(receivedAt: number | undefined, startTime: number): string {
  if (!receivedAt) return "";
  const elapsed = Math.max(0, Math.round((receivedAt - startTime) / 1000));
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function shortenPath(path: string): string {
  const parts = path.split("/");
  if (parts.length <= 3) return path;
  return ".../" + parts.slice(-2).join("/");
}

/** Shorten MCP tool names: mcp__roast-evaluators__fallacy_extract → fallacy_extract */
function shortenToolName(name: string): string {
  if (name.startsWith("mcp__")) {
    const parts = name.split("__");
    return parts[parts.length - 1] ?? name;
  }
  return name;
}

/** Extract a human-readable summary from tool input JSON */
function getToolSummary(toolName: string, rawInput?: unknown): string {
  if (!rawInput) return "";
  try {
    const input =
      typeof rawInput === "string" ? JSON.parse(rawInput) : rawInput;
    switch (toolName) {
      case "Bash":
        return input.command ? truncateStr(String(input.command), 80) : "";
      case "Read":
        return input.file_path ? shortenPath(String(input.file_path)) : "";
      case "Write":
        return input.file_path ? shortenPath(String(input.file_path)) : "";
      case "Grep":
        return input.pattern
          ? `/${truncateStr(String(input.pattern), 40)}/`
          : "";
      case "Glob":
        return input.pattern ? String(input.pattern) : "";
      case "WebSearch":
        return input.query
          ? `"${truncateStr(String(input.query), 60)}"`
          : "";
      case "WebFetch":
        return input.url ? truncateStr(String(input.url), 60) : "";
      case "Task":
        return input.description ? String(input.description) : "";
      case "TodoWrite": {
        if (!Array.isArray(input.todos)) return "";
        const todos = input.todos as { content?: string; status?: string }[];
        const inProgress = todos.filter((t) => t.status === "in_progress");
        const pending = todos.filter((t) => t.status === "pending");
        const completed = todos.filter((t) => t.status === "completed");
        const parts: string[] = [];
        if (inProgress.length > 0) parts.push(`${inProgress.length} active`);
        if (pending.length > 0) parts.push(`${pending.length} pending`);
        if (completed.length > 0) parts.push(`${completed.length} done`);
        return parts.join(", ");
      }
      default:
        return "";
    }
  } catch {
    return "";
  }
}

/** Build tool label: "toolName -> summary" or just "toolName" */
function formatToolLabel(rawName: string, rawInput?: unknown): string {
  const name = shortenToolName(rawName);
  const summary = getToolSummary(rawName, rawInput);
  return summary ? `${name} -> ${summary}` : name;
}

/** Map event type to a short badge string */
function getEventBadge(event: AgenticStreamEvent): string {
  switch (event.type) {
    case "tool_use":
    case "subagent_tool_use":
      return "tool";
    case "tool_result":
    case "subagent_tool_result":
      return "output";
    case "assistant_text":
    case "subagent_text":
      return "text";
    case "subagent_complete":
      return "done";
    case "cost_update":
      return "cost";
    case "tool_progress":
      return "wait";
    case "task_notification":
      return "task";
    case "compacting":
      return "system";
    default:
      return event.type
        .replace("subagent_", "")
        .replace("_", " ");
  }
}

/** Format a single event into label + color */
function formatEventLabel(event: AgenticStreamEvent): FormattedEvent {
  switch (event.type) {
    case "init":
      return {
        label: `Initialized: ${event.model}`,
        color: "text-gray-500",
      };
    case "assistant_text":
      return {
        label: String(event.text ?? ""),
        color: "text-blue-700",
      };
    case "tool_use":
      return {
        label: formatToolLabel(
          String(event.toolName),
          event.input
        ),
        color: "text-orange-600",
      };
    case "tool_result":
      return {
        label: String(event.output ?? ""),
        color: "text-teal-600",
      };
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
    // Sub-agent events (rendered inside agent groups)
    case "subagent_tool_use": {
      const name = String(event.toolName);
      if (name === "TodoWrite") {
        const summary = getToolSummary("TodoWrite", event.input);
        return {
          label: summary ? `TodoWrite -> ${summary}` : "TodoWrite",
          color: "text-gray-400",
          dim: !summary,
        };
      }
      return {
        label: formatToolLabel(name, event.input),
        color: "text-orange-500",
      };
    }
    case "subagent_tool_result":
      return {
        label: String(event.output ?? ""),
        color: "text-teal-500",
      };
    case "subagent_text":
      return {
        label: String(event.text ?? ""),
        color: "text-purple-700",
      };
    case "subagent_complete":
      return {
        label: "Complete",
        color: "text-green-500 font-medium",
      };
    case "tool_progress":
      return {
        label: `${shortenToolName(String(event.toolName))} running... (${Math.round(Number(event.elapsedSeconds))}s)`,
        color: "text-amber-500",
        dim: true,
      };
    case "task_notification":
      return {
        label: `Task ${event.taskStatus}: ${truncateStr(String(event.summary ?? ""), 100)}`,
        color: event.taskStatus === "completed" ? "text-green-500" : "text-red-500",
      };
    case "compacting":
      return {
        label: "Compacting conversation context...",
        color: "text-gray-400",
      };
    default:
      return {
        label: JSON.stringify(event),
        color: "text-gray-400",
      };
  }
}

// ---------------------------------------------------------------------------
// Tree Builder
// ---------------------------------------------------------------------------

function buildActivityTree(events: AgenticStreamEvent[]): TreeNode[] {
  const tree: TreeNode[] = [];
  const groups = new Map<string, AgentGroupNode>();
  let pendingTaskResults = 0;

  for (const event of events) {
    // Sub-agent start -> create collapsible group
    if (event.type === "subagent_start") {
      const name = String(event.agentName);
      const group: AgentGroupNode = {
        kind: "agent_group",
        agentName: name,
        events: [],
        complete: false,
        toolCount: 0,
      };
      groups.set(name, group);
      tree.push(group);
      continue;
    }

    // Sub-agent events -> route to their group
    if (event.type.startsWith("subagent_")) {
      const name = String(event.agentName);
      const group = groups.get(name);
      if (group) {
        group.events.push(event);
        if (event.type === "subagent_tool_use") group.toolCount++;
        if (event.type === "subagent_complete") {
          group.complete = true;
          if (typeof event.durationMs === "number") group.durationMs = event.durationMs;
        }
      }
      continue;
    }

    // Skip orchestrator Task tool_use (represented by agent group node)
    if (event.type === "tool_use" && event.toolName === "Task") {
      pendingTaskResults++;
      continue;
    }

    // Skip matching Task tool_result
    if (event.type === "tool_result" && pendingTaskResults > 0) {
      pendingTaskResults--;
      continue;
    }

    // Regular orchestrator event
    tree.push({ kind: "event", event });
  }

  return tree;
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function EventRow({ event, startTime }: { event: AgenticStreamEvent; startTime: number }) {
  const [expanded, setExpanded] = useState(false);
  const { label, color, dim } = formatEventLabel(event);
  const isLong = label.length > 120;
  const isClickable = isLong;
  const elapsed = formatElapsed(event._receivedAt as number | undefined, startTime);

  return (
    <div
      className={`${color} ${dim ? "opacity-40" : ""} leading-relaxed ${
        isClickable
          ? "cursor-pointer hover:bg-gray-50 rounded px-1 -mx-1"
          : ""
      }`}
      onClick={isClickable ? () => setExpanded((v) => !v) : undefined}
    >
      {elapsed && (
        <span className="inline-block min-w-[2.75rem] text-[10px] tabular-nums text-gray-300 mr-1">
          {elapsed}
        </span>
      )}
      <span className="inline-block min-w-[3.5rem] text-[10px] uppercase text-gray-400 mr-1">
        {getEventBadge(event)}
      </span>
      {expanded ? (
        <span className="whitespace-pre-wrap break-words">{label}</span>
      ) : (
        <span>{isLong ? truncateStr(label, 120) : label}</span>
      )}
    </div>
  );
}

function AgentGroup({ node, startTime }: { node: AgentGroupNode; startTime: number }) {
  const [expanded, setExpanded] = useState(true);

  const statsLabel = useMemo(() => {
    const parts: string[] = [];
    parts.push(
      `${node.toolCount} tool${node.toolCount !== 1 ? "s" : ""}`
    );
    if (node.durationMs != null) {
      const secs = Math.round(node.durationMs / 1000);
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      parts.push(m > 0 ? `${m}m ${s}s` : `${s}s`);
    }
    if (!node.complete) parts.push("running...");
    return parts.join(", ");
  }, [node.toolCount, node.complete, node.durationMs]);

  return (
    <div className="my-1.5">
      {/* Group header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 w-full text-left hover:bg-purple-50/50 rounded px-1 py-0.5 -mx-1"
      >
        <ChevronRightIcon
          className={`h-3 w-3 text-purple-400 transition-transform flex-shrink-0 ${
            expanded ? "rotate-90" : ""
          }`}
        />
        <span className="font-medium text-purple-600">
          {node.agentName}
        </span>
        <span className="text-gray-400 text-[10px]">({statsLabel})</span>
      </button>

      {/* Group body */}
      {expanded && (
        <div className="ml-1.5 pl-3 border-l-2 border-purple-200 space-y-0.5 mt-0.5">
          {node.events.map((event, i) => (
            <EventRow key={i} event={event} startTime={startTime} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ActivityFeed({ events }: ActivityFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const tree = useMemo(() => buildActivityTree(events), [events]);
  const startTime = useMemo(() => {
    const first = events[0]?._receivedAt as number | undefined;
    return first ?? Date.now();
  }, [events]);

  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events.length]);

  const handleCopy = useCallback(() => {
    const text = events
      .map((event) => {
        const { label } = formatEventLabel(event);
        const elapsed = formatElapsed(event._receivedAt as number | undefined, startTime);
        return `${elapsed}\t${event.type}\t${label}`;
      })
      .join("\n");

    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [events, startTime]);

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Events will appear here when analysis starts...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
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

      {/* Tree view */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-0.5"
      >
        {tree.map((node, i) =>
          node.kind === "agent_group" ? (
            <AgentGroup key={`group-${node.agentName}`} node={node} startTime={startTime} />
          ) : (
            <EventRow key={i} event={node.event} startTime={startTime} />
          )
        )}
      </div>
    </div>
  );
}
