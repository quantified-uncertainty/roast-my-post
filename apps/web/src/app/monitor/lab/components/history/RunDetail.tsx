"use client";

import { useState, useEffect } from "react";
import { ChevronRightIcon, ChevronLeftIcon } from "@heroicons/react/24/outline";
import { formatDate } from "../../utils/formatters";
import type { ValidationRunDetail, RunSnapshot } from "../../types";
import { SnapshotComparison } from "../snapshots/SnapshotComparison";

interface RunDetailProps {
  runId: string;
}

interface SnapshotRowProps {
  snapshot: RunSnapshot;
  onClick: () => void;
}

export function RunDetail({ runId }: RunDetailProps) {
  const [run, setRun] = useState<ValidationRunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSnapshot, setSelectedSnapshot] = useState<RunSnapshot | null>(null);

  useEffect(() => {
    const fetchRun = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/monitor/lab/runs/${runId}`);
        if (res.ok) {
          const data = await res.json();
          setRun(data.run);
        }
      } finally {
        setLoading(false);
      }
    };
    void fetchRun();
  }, [runId]);

  if (loading) {
    return <div className="p-4 text-gray-500">Loading run details...</div>;
  }

  if (!run) {
    return <div className="p-4 text-gray-500">Run not found</div>;
  }

  if (selectedSnapshot) {
    return (
      <div className="p-4">
        <button
          onClick={() => setSelectedSnapshot(null)}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mb-4"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Back to snapshots
        </button>
        <SnapshotComparison snapshot={selectedSnapshot} onBack={() => setSelectedSnapshot(null)} />
      </div>
    );
  }

  const changedSnapshots = run.snapshots.filter((s) => s.status === "changed");
  const unchangedSnapshots = run.snapshots.filter((s) => s.status === "unchanged");

  return (
    <div className="p-4 space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-500">{formatDate(run.createdAt)}</span>
        {run.summary && <span className="text-gray-700">{run.summary}</span>}
      </div>

      {/* Changed First */}
      {changedSnapshots.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-orange-600 mb-2">
            Changed ({changedSnapshots.length})
          </h4>
          <div className="space-y-2">
            {changedSnapshots.map((snapshot) => (
              <SnapshotRow
                key={snapshot.id}
                snapshot={snapshot}
                onClick={() => setSelectedSnapshot(snapshot)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Unchanged */}
      {unchangedSnapshots.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-green-600 mb-2">
            Unchanged ({unchangedSnapshots.length})
          </h4>
          <div className="space-y-2">
            {unchangedSnapshots.map((snapshot) => (
              <SnapshotRow
                key={snapshot.id}
                snapshot={snapshot}
                onClick={() => setSelectedSnapshot(snapshot)}
              />
            ))}
          </div>
        </div>
      )}

      {run.snapshots.length === 0 && (
        <div className="text-gray-500 text-sm">No snapshots in this run</div>
      )}
    </div>
  );
}

function SnapshotRow({ snapshot, onClick }: SnapshotRowProps) {
  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 cursor-pointer"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{snapshot.documentTitle}</p>
        <p className="text-xs text-gray-500">
          {snapshot.keptCount} kept · {snapshot.newCount} new · {snapshot.lostCount} lost
        </p>
      </div>
      <ChevronRightIcon className="h-4 w-4 text-gray-400" />
    </div>
  );
}
