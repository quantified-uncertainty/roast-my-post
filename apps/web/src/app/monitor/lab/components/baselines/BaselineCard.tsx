"use client";

import { TrashIcon } from "@heroicons/react/24/outline";
import { formatDate } from "../../utils/formatters";
import type { Baseline } from "../../types";

interface BaselineCardProps {
  baseline: Baseline;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function BaselineCard({ baseline, isSelected, onSelect, onDelete }: BaselineCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`bg-white rounded-lg shadow p-4 cursor-pointer transition-colors ${
        isSelected ? "ring-2 ring-blue-500 bg-blue-50" : "hover:bg-gray-50"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{baseline.name}</h3>
          {baseline.description && (
            <p className="text-sm text-gray-500 truncate">{baseline.description}</p>
          )}
          <div className="mt-1 flex items-center space-x-4 text-xs text-gray-400">
            <span>{baseline.snapshotCount} documents</span>
            <span>{formatDate(baseline.createdAt)}</span>
            {baseline.commitHash && (
              <span className="font-mono">{baseline.commitHash.slice(0, 7)}</span>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
          title="Delete baseline"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
