"use client";

import { useEffect, useState } from "react";
import { useBaselines } from "../../hooks/useBaselines";
import { useRuns } from "../../hooks/useRuns";
import { formatDate } from "../../utils/formatters";
import type { Baseline, ValidationRun, ValidationRunDetail, RunSnapshot } from "../../types";
import { SnapshotComparison } from "../snapshots/SnapshotComparison";
import { ChevronRightIcon, TrashIcon } from "@heroicons/react/24/outline";

interface HistoryTabProps {
  agentId: string;
  selectedBaseline: Baseline | null;
  onSelectBaseline: (baseline: Baseline | null) => void;
}

export function HistoryTab({ agentId, selectedBaseline, onSelectBaseline }: HistoryTabProps) {
  const { baselines, loading: baselinesLoading, refresh: refreshBaselines } = useBaselines(agentId);
  const { runs, loading: runsLoading, refresh: refreshRuns, getRunDetail, deleteRun } = useRuns(selectedBaseline?.id ?? null);
  const [selectedRun, setSelectedRun] = useState<ValidationRunDetail | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<RunSnapshot | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    void refreshBaselines();
  }, [refreshBaselines]);

  useEffect(() => {
    if (selectedBaseline) {
      void refreshRuns();
      setSelectedRun(null);
      setSelectedSnapshot(null);
    }
  }, [selectedBaseline, refreshRuns]);

  const handleSelectRun = async (run: ValidationRun) => {
    setLoadingDetail(true);
    setSelectedSnapshot(null);
    try {
      const detail = await getRunDetail(run.id);
      setSelectedRun(detail);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDeleteRun = async (runId: string) => {
    if (confirm("Delete this run? This cannot be undone.")) {
      await deleteRun(runId);
      if (selectedRun?.id === runId) {
        setSelectedRun(null);
        setSelectedSnapshot(null);
      }
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

  return (
    <div className="space-y-6">
      {/* Baseline Selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <select
          value={selectedBaseline?.id ?? ""}
          onChange={(e) => {
            const baseline = baselines.find((b) => b.id === e.target.value) ?? null;
            onSelectBaseline(baseline);
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Choose a baseline to view history...</option>
          {baselines.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.snapshotCount} docs)
            </option>
          ))}
        </select>
      </div>

      {selectedBaseline && (
        <div className="grid grid-cols-12 gap-6">
          {/* Run List */}
          <div className="col-span-4 bg-white shadow rounded-lg">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-900">Validation Runs</h3>
            </div>
            <div className="divide-y divide-gray-200 max-h-[calc(100vh-400px)] overflow-y-auto">
              {runsLoading ? (
                <div className="p-4 text-center text-gray-500">Loading...</div>
              ) : runs.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No runs yet</div>
              ) : (
                runs.map((run) => (
                  <RunListItem
                    key={run.id}
                    run={run}
                    isSelected={selectedRun?.id === run.id}
                    onSelect={() => void handleSelectRun(run)}
                    onDelete={() => void handleDeleteRun(run.id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Run Detail / Snapshot List */}
          <div className="col-span-8">
            {loadingDetail ? (
              <LoadingState message="Loading run details..." />
            ) : selectedSnapshot ? (
              <SnapshotComparison
                snapshot={selectedSnapshot}
                onBack={() => setSelectedSnapshot(null)}
              />
            ) : selectedRun ? (
              <RunDetail
                run={selectedRun}
                onSelectSnapshot={setSelectedSnapshot}
              />
            ) : (
              <div className="bg-white shadow rounded-lg p-6 text-center text-gray-500">
                Select a run to view details
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface RunListItemProps {
  run: ValidationRun;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function RunListItem({ run, isSelected, onSelect, onDelete }: RunListItemProps) {
  return (
    <div
      onClick={onSelect}
      className={`p-3 cursor-pointer transition-colors ${
        isSelected ? "bg-blue-50 border-l-4 border-blue-500" : "hover:bg-gray-50"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-sm truncate">
              {run.name || `Run ${run.id.slice(0, 8)}`}
            </span>
            <StatusBadge status={run.status} />
          </div>
          <div className="text-xs text-gray-500 mt-1">{formatDate(run.createdAt)}</div>
          {run.status === "completed" && (
            <div className="text-xs mt-1">
              <span className="text-green-600">{run.unchangedCount} unchanged</span>
              {run.changedCount > 0 && (
                <span className="text-orange-600 ml-2">{run.changedCount} changed</span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 text-gray-400 hover:text-red-600"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

interface RunDetailProps {
  run: ValidationRunDetail;
  onSelectSnapshot: (snapshot: RunSnapshot) => void;
}

function RunDetail({ run, onSelectSnapshot }: RunDetailProps) {
  const unchangedSnapshots = run.snapshots.filter((s) => s.status === "unchanged");
  const changedSnapshots = run.snapshots.filter((s) => s.status === "changed");

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          {run.name || `Run ${run.id.slice(0, 8)}`}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {formatDate(run.createdAt)} | Baseline: {run.baseline.name}
        </p>
        {run.summary && <p className="text-sm text-gray-600 mt-2">{run.summary}</p>}
      </div>

      <div className="divide-y divide-gray-200 max-h-[calc(100vh-450px)] overflow-y-auto">
        {/* Changed Snapshots First */}
        {changedSnapshots.length > 0 && (
          <div className="p-4">
            <h4 className="text-sm font-medium text-orange-600 mb-2">
              Changed ({changedSnapshots.length})
            </h4>
            <div className="space-y-2">
              {changedSnapshots.map((snapshot) => (
                <SnapshotListItem
                  key={snapshot.id}
                  snapshot={snapshot}
                  onSelect={() => onSelectSnapshot(snapshot)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Unchanged Snapshots */}
        {unchangedSnapshots.length > 0 && (
          <div className="p-4">
            <h4 className="text-sm font-medium text-green-600 mb-2">
              Unchanged ({unchangedSnapshots.length})
            </h4>
            <div className="space-y-2">
              {unchangedSnapshots.map((snapshot) => (
                <SnapshotListItem
                  key={snapshot.id}
                  snapshot={snapshot}
                  onSelect={() => onSelectSnapshot(snapshot)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SnapshotListItem({
  snapshot,
  onSelect,
}: {
  snapshot: RunSnapshot;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 cursor-pointer"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{snapshot.documentTitle}</p>
        <p className="text-xs text-gray-500">
          {snapshot.keptCount} matched | {snapshot.newCount} new | {snapshot.lostCount} gone
        </p>
      </div>
      <ChevronRightIcon className="h-4 w-4 text-gray-400" />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    running: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
  };
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full ${colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"}`}>
      {status}
    </span>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="bg-white shadow rounded-lg p-6 text-center">
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
