import type {
  ActiveTab,
  BatchSummary,
} from "../types";
import {
  formatCost,
  formatDateWithTime,
  formatRelativeDate,
} from "../utils";

interface BatchesTabProps {
  batches: BatchSummary[];
  batchesLoading: boolean;
  setActiveTab: (tab: ActiveTab) => void;
  setSelectedBatchFilter: (filter: string | null) => void;
  setEvalsBatchFilter: (filter: string | null) => void;
  setExportBatchFilter: (filter: string | null) => void;
}

export function BatchesTab({
  batches,
  batchesLoading,
  setActiveTab,
  setSelectedBatchFilter,
  setEvalsBatchFilter,
  setExportBatchFilter,
}: BatchesTabProps) {
  // Ensure batches is always an array
  const safeBatches = Array.isArray(batches) ? batches : [];
  
  return (
    <div className="space-y-6">
      {batchesLoading ? (
        <div className="py-8 text-center">
          <div className="text-gray-500">Loading batch tests...</div>
        </div>
      ) : safeBatches.length === 0 ? (
        <div className="py-8 text-center">
          <div className="text-gray-500">No test batches created yet.</div>
          <p className="mt-2 text-sm text-gray-400">
            Use the Test tab to create your first batch test.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Recent Test Batches ({safeBatches.length})
          </h3>
          <div className="grid gap-4">
            {safeBatches.map((batch) => (
              <div
                key={batch.id}
                className="rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md"
              >
                {/* Header */}
                <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-semibold text-gray-900">
                        {batch.name || `test${batch.id.slice(0, 3)}`}
                      </h4>
                      <p className="mt-1 text-sm text-gray-600">
                        Created{" "}
                        <span title={formatDateWithTime(batch.createdAt)}>
                          {formatRelativeDate(batch.createdAt)}
                        </span>{" "}
                        • Target: {batch.targetCount} evaluations
                      </p>
                    </div>
                    <div>
                      {batch.isComplete ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                          Complete
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                          In Progress
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="px-6 py-4">
                  <div className="mb-4 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {batch.completedCount}
                      </div>
                      <div className="text-sm text-gray-500">Completed</div>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="space-y-2 text-sm">
                    {batch.avgDuration > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Avg Duration:</span>
                        <span className="font-medium text-gray-900">
                          {Math.floor(batch.avgDuration / 60)}m {batch.avgDuration % 60}s
                        </span>
                      </div>
                    )}
                    {batch.avgGrade !== null && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Avg Grade:</span>
                        <span className="font-medium text-gray-900">
                          {batch.avgGrade.toFixed(1)}
                        </span>
                      </div>
                    )}
                    {batch.totalCost > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Cost:</span>
                        <span className="font-medium text-gray-900">
                          {formatCost(batch.totalCost)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex border-t border-gray-100">
                  <button
                    onClick={() => {
                      setActiveTab("jobs");
                      setSelectedBatchFilter(batch.id);
                    }}
                    className="flex-1 px-4 py-3 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
                  >
                    View Jobs →
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab("evals");
                      setEvalsBatchFilter(batch.id);
                    }}
                    className="flex-1 border-l border-gray-100 px-4 py-3 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
                  >
                    View Evals →
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab("export");
                      setExportBatchFilter(batch.id);
                    }}
                    className="flex-1 border-l border-gray-100 px-4 py-3 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
                  >
                    Export →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
