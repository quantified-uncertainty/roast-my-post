"use client";

import { useEffect, useState } from "react";
import { useBaselines } from "../../hooks/useBaselines";
import { BaselineList } from "../baselines/BaselineList";
import { CreateBaselineModal } from "../baselines/CreateBaselineModal";
import type { Baseline } from "../../types";

interface BaselinesTabProps {
  agentId: string;
  selectedBaseline: Baseline | null;
  onSelectBaseline: (baseline: Baseline | null) => void;
}

export function BaselinesTab({ agentId, selectedBaseline, onSelectBaseline }: BaselinesTabProps) {
  const { baselines, loading, error, refresh, deleteBaseline } = useBaselines(agentId);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleBaselineCreated = () => {
    setShowCreateModal(false);
    refresh();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this baseline? This cannot be undone.")) {
      await deleteBaseline(id);
      if (selectedBaseline?.id === id) {
        onSelectBaseline(null);
      }
    }
  };

  if (loading) {
    return <LoadingState message="Loading baselines..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Validation Baselines</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          Create Baseline
        </button>
      </div>

      {baselines.length === 0 ? (
        <EmptyState
          message="No baselines yet"
          action="Create a baseline to start validation testing"
        />
      ) : (
        <BaselineList
          baselines={baselines}
          selectedId={selectedBaseline?.id ?? null}
          onSelect={onSelectBaseline}
          onDelete={handleDelete}
        />
      )}

      {showCreateModal && (
        <CreateBaselineModal
          agentId={agentId}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleBaselineCreated}
        />
      )}
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

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-red-600">Error: {message}</div>
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
