"use client";

import { useEffect, useState, useCallback } from "react";
import { useBaselines } from "../../hooks/useBaselines";
import { formatDate } from "../../utils/formatters";
import type { Baseline } from "../../types";
import { PlayIcon, ArrowPathIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";

interface RunTabProps {
  agentId: string;
  selectedBaseline: Baseline | null;
  onSelectBaseline: (baseline: Baseline | null) => void;
}

interface RunProgress {
  phase: "idle" | "starting" | "running" | "comparing" | "done" | "error";
  message: string;
  completed: number;
  total: number;
  runId?: string;
  error?: string;
}

export function RunTab({ agentId, selectedBaseline, onSelectBaseline }: RunTabProps) {
  const { baselines, loading: baselinesLoading, refresh: refreshBaselines } = useBaselines(agentId);
  const [runName, setRunName] = useState("");
  const [progress, setProgress] = useState<RunProgress>({
    phase: "idle",
    message: "",
    completed: 0,
    total: 0,
  });

  useEffect(() => {
    refreshBaselines();
  }, [refreshBaselines]);

  const pollJobStatus = useCallback(async (jobIds: string[]): Promise<boolean> => {
    const res = await fetch(`/api/monitor/lab/jobs/status?jobIds=${jobIds.join(",")}`);
    if (!res.ok) throw new Error("Failed to check job status");

    const data = await res.json();
    setProgress((p) => ({
      ...p,
      completed: data.summary.completed + data.summary.failed,
      total: data.summary.total,
      message: `${data.summary.completed} completed, ${data.summary.running} running, ${data.summary.pending} pending`,
    }));

    return data.summary.allDone;
  }, []);

  const startRun = async () => {
    if (!selectedBaseline) return;

    setProgress({
      phase: "starting",
      message: "Creating validation run...",
      completed: 0,
      total: 0,
    });

    try {
      // Start the run
      const startRes = await fetch("/api/monitor/lab/runs/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baselineId: selectedBaseline.id,
          name: runName || undefined,
        }),
      });

      if (!startRes.ok) {
        const err = await startRes.json();
        throw new Error(err.error || "Failed to start run");
      }

      const startData = await startRes.json();
      const runId = startData.run.id;
      const { jobIds } = startData;

      setProgress({
        phase: "running",
        message: `Evaluating ${jobIds.length} documents...`,
        completed: 0,
        total: jobIds.length,
        runId,
      });

      // Poll for job completion
      const maxWaitMs = 10 * 60 * 1000; // 10 minutes
      const pollIntervalMs = 3000; // 3 seconds
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitMs) {
        const allDone = await pollJobStatus(jobIds);
        if (allDone) break;
        await new Promise((r) => setTimeout(r, pollIntervalMs));
      }

      // Finalize the run (compare results)
      setProgress((p) => ({
        ...p,
        phase: "comparing",
        message: "Comparing results with baseline...",
      }));

      const finalizeRes = await fetch(`/api/monitor/lab/runs/${runId}/finalize`, {
        method: "POST",
      });

      if (!finalizeRes.ok) {
        const err = await finalizeRes.json();
        throw new Error(err.error || "Failed to finalize run");
      }

      const finalizeData = await finalizeRes.json();

      setProgress({
        phase: "done",
        message: finalizeData.summary,
        completed: finalizeData.unchangedCount + finalizeData.changedCount,
        total: finalizeData.unchangedCount + finalizeData.changedCount,
        runId,
      });

      setRunName("");
    } catch (error) {
      setProgress((p) => ({
        ...p,
        phase: "error",
        message: error instanceof Error ? error.message : "Unknown error",
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  };

  if (baselinesLoading) {
    return <LoadingState message="Loading baselines..." />;
  }

  if (baselines.length === 0) {
    return (
      <EmptyState
        message="No baselines available"
        action="Create a baseline in the Baselines tab first"
      />
    );
  }

  const isRunning = progress.phase === "starting" || progress.phase === "running" || progress.phase === "comparing";

  return (
    <div className="space-y-6">
      {/* Baseline Selector */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Select Baseline</h3>
        <select
          value={selectedBaseline?.id ?? ""}
          onChange={(e) => {
            const baseline = baselines.find((b) => b.id === e.target.value) ?? null;
            onSelectBaseline(baseline);
          }}
          disabled={isRunning}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        >
          <option value="">Choose a baseline...</option>
          {baselines.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.snapshotCount} docs) - {formatDate(b.createdAt)}
            </option>
          ))}
        </select>
      </div>

      {/* Run Configuration */}
      {selectedBaseline && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Run Validation</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Run Name (optional)
              </label>
              <input
                type="text"
                value={runName}
                onChange={(e) => setRunName(e.target.value)}
                placeholder="e.g., After filter changes"
                disabled={isRunning}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={startRun}
                disabled={isRunning}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRunning ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <PlayIcon className="h-4 w-4" />
                )}
                <span>{isRunning ? "Running..." : "Start Run"}</span>
              </button>
              <span className="text-sm text-gray-500">
                Will re-evaluate {selectedBaseline.snapshotCount} documents
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Progress */}
      {progress.phase !== "idle" && (
        <ProgressPanel progress={progress} />
      )}
    </div>
  );
}

function ProgressPanel({ progress }: { progress: RunProgress }) {
  const getStatusColor = () => {
    switch (progress.phase) {
      case "done":
        return "bg-green-50 border-green-200";
      case "error":
        return "bg-red-50 border-red-200";
      default:
        return "bg-blue-50 border-blue-200";
    }
  };

  const getIcon = () => {
    switch (progress.phase) {
      case "done":
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case "error":
        return <XCircleIcon className="h-5 w-5 text-red-600" />;
      default:
        return <ArrowPathIcon className="h-5 w-5 text-blue-600 animate-spin" />;
    }
  };

  const progressPercent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

  return (
    <div className={`rounded-lg border p-4 ${getStatusColor()}`}>
      <div className="flex items-start space-x-3">
        {getIcon()}
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">
            {progress.phase === "starting" && "Starting..."}
            {progress.phase === "running" && "Running Evaluations"}
            {progress.phase === "comparing" && "Comparing Results"}
            {progress.phase === "done" && "Completed"}
            {progress.phase === "error" && "Error"}
          </h4>
          <p className="text-sm text-gray-600 mt-1">{progress.message}</p>

          {/* Progress bar */}
          {(progress.phase === "running" || progress.phase === "comparing") && progress.total > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{progress.completed} / {progress.total}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Link to history */}
          {progress.phase === "done" && progress.runId && (
            <p className="text-sm text-blue-600 mt-2">
              View results in the History tab
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-600">{message}</div>
    </div>
  );
}

function EmptyState({ message, action }: { message: string; action: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-8 text-center">
      <p className="text-gray-600 mb-2">{message}</p>
      <p className="text-gray-400 text-sm">{action}</p>
    </div>
  );
}
