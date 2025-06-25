import React, { useState } from "react";
import { logger } from "@/lib/logger";

import type { Evaluation } from "@/types/documentSchema";
import type { LLMInteraction } from "@/types/llm";

interface TaskLogsProps {
  selectedVersion: NonNullable<Evaluation["versions"]>[number];
}

interface Task {
  id: string;
  name: string;
  modelName: string;
  priceInCents: number;
  timeInSeconds: number | null;
  log: string | null;
  llmInteractions?: any; // JSON field from database (optional in schema)
  createdAt: Date;
}

// Legacy format from log field
interface LegacyLLMInteraction {
  attempt: number;
  validCommentsCount: number;
  failedCommentsCount: number;
  prompt: string;
  response: string;
}

interface LogData {
  [key: string]: any; // Allow all fields
}

function JsonBlock({ value }: { value: any }) {
  return (
    <pre className="overflow-x-auto rounded bg-gray-100 p-2 text-xs text-gray-800">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function TaskItem({ task, index }: { task: Task; index: number }) {
  let logData: LogData;
  try {
    logData = task.log ? JSON.parse(task.log) : { summary: "No log data" };
  } catch (e) {
    logData = { summary: task.log || "No log data" };
  }

  const [showRaw, setShowRaw] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [showOutput, setShowOutput] = useState(false);

  // Extract known fields, but allow for any extra
  const {
    summary,
    input,
    output,
    llmInteractions: logLlmInteractions,
    ...meta
  } = logData;

  // Parse LLM interactions from the new database field
  let parsedLlmInteractions: LLMInteraction[] = [];
  if (task.llmInteractions) {
    try {
      const dbInteractions =
        typeof task.llmInteractions === "string"
          ? JSON.parse(task.llmInteractions)
          : task.llmInteractions;
      parsedLlmInteractions = Array.isArray(dbInteractions)
        ? dbInteractions
        : [];
    } catch (e) {
      logger.error('Failed to parse LLM interactions:', e);
    }
  }

  // Use new LLM interactions if available, otherwise fall back to legacy format
  const llmInteractions =
    parsedLlmInteractions.length > 0
      ? parsedLlmInteractions
      : logLlmInteractions;

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs font-medium text-white">
            {index + 1}
          </span>
          <h4 className="font-medium text-gray-900">{task.name}</h4>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="rounded bg-gray-200 px-2 py-1">
            {task.modelName}
          </span>
          <span>${(task.priceInCents / 100).toFixed(4)}</span>
          {task.timeInSeconds && <span>{task.timeInSeconds}s</span>}
        </div>
      </div>

      {/* All metadata fields */}
      <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-2">
        {Object.entries(meta).map(([key, value]) => (
          <div key={key} className="text-xs text-gray-700">
            <span className="font-medium text-gray-900">{key}:</span>{" "}
            {typeof value === "object" && value !== null ? (
              <JsonBlock value={value} />
            ) : (
              <span>{String(value)}</span>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      {summary && (
        <div className="mt-2 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-gray-700">
          <strong>Summary:</strong> {summary}
        </div>
      )}

      {/* Input/Output Details (expandable) */}
      {input && (
        <div className="mt-3">
          <button
            className="mb-1 text-xs text-blue-700 underline"
            onClick={() => setShowInput((v) => !v)}
          >
            {showInput ? "Hide Input" : "Show Input"}
          </button>
          {showInput && <JsonBlock value={input} />}
        </div>
      )}
      {output && (
        <div className="mt-3">
          <button
            className="mb-1 text-xs text-blue-700 underline"
            onClick={() => setShowOutput((v) => !v)}
          >
            {showOutput ? "Hide Output" : "Show Output"}
          </button>
          {showOutput && <JsonBlock value={output} />}
        </div>
      )}

      {/* LLM Interactions */}
      {llmInteractions && llmInteractions.length > 0 && (
        <div className="mt-3">
          <h5 className="mb-2 font-medium text-gray-900">LLM Interactions</h5>
          <div className="space-y-2">
            {llmInteractions.map(
              (
                interaction: LLMInteraction | LegacyLLMInteraction,
                idx: number
              ) => {
                // Only show interactions in the new format
                if (!("messages" in interaction)) {
                  return null;
                }

                return (
                  <details key={idx} className="rounded border bg-white">
                    <summary className="cursor-pointer px-3 py-2 hover:bg-gray-50">
                      <span className="font-medium">Interaction {idx + 1}</span>
                      {(interaction as LLMInteraction).usage && (
                        <span className="ml-2 text-sm text-gray-500">
                          ({(interaction as LLMInteraction).usage.input_tokens}{" "}
                          input,{" "}
                          {(interaction as LLMInteraction).usage.output_tokens}{" "}
                          output tokens)
                        </span>
                      )}
                    </summary>
                    <div className="border-t px-3 pb-3">
                      <div className="mt-2 space-y-3">
                        {(interaction as LLMInteraction).messages.map(
                          (message, msgIdx) => (
                            <div
                              key={msgIdx}
                              className="rounded border-l-4 border-l-blue-200 bg-gray-50 p-2"
                            >
                              <h6 className="text-sm font-medium capitalize text-gray-900">
                                {message.role}:
                              </h6>
                              <div className="mt-1 whitespace-pre-wrap text-xs text-gray-700">
                                {message.content}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </details>
                );
              }
            )}
          </div>
        </div>
      )}

      {/* Full Log (fallback) */}
      {!summary && !input && !output && task.log && (
        <div className="mt-2 rounded border bg-white p-3 text-sm text-gray-700">
          {task.log}
        </div>
      )}

      {/* Raw log toggle */}
      <div className="mt-3">
        <button
          className="text-xs text-blue-700 underline"
          onClick={() => setShowRaw((v) => !v)}
        >
          {showRaw ? "Hide Raw Log" : "Show Raw Log"}
        </button>
        {showRaw && <JsonBlock value={logData} />}
      </div>

      <div className="mt-2 text-xs text-gray-500">
        Completed: {new Date(task.createdAt).toLocaleString()}
      </div>
    </div>
  );
}

export function TaskLogs({ selectedVersion }: TaskLogsProps) {
  if (!selectedVersion.job?.tasks || selectedVersion.job.tasks.length === 0) {
    return (
      <div className="text-center text-gray-500">
        No tasks available for this version
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {selectedVersion.job.tasks.map((task, index) => (
          <TaskItem key={task.id} task={task} index={index} />
        ))}
      </div>
      <div className="mt-4 rounded-lg bg-blue-50 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-blue-900">Total Cost:</span>
          <span className="text-blue-700">
            $
            {(
              selectedVersion.job.tasks.reduce(
                (sum, task) => sum + task.priceInCents,
                0
              ) / 100
            ).toFixed(4)}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-sm">
          <span className="font-medium text-blue-900">Total Time:</span>
          <span className="text-blue-700">
            {selectedVersion.job.tasks.reduce(
              (sum, task) => sum + (task.timeInSeconds || 0),
              0
            )}
            s
          </span>
        </div>
      </div>
    </div>
  );
}
