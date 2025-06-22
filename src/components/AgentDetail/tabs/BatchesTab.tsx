import type {
  ActiveTab,
  BatchSummary,
} from "../types";
import {
  formatCost,
  formatDate,
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
  return (
    <div className="space-y-6">
      {batchesLoading ? (
        <div className="py-8 text-center">
          <div className="text-gray-500">Loading batch tests...</div>
        </div>
      ) : batches.length === 0 ? (
        <div className="py-8 text-center">
          <div className="text-gray-500">No test batches created yet.</div>
          <p className="mt-2 text-sm text-gray-400">
            Use the Test tab to create your first batch test.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Recent Test Batches ({batches.length})
          </h3>
          <div className="grid gap-4">
            {batches.map((batch) => (
              <div
                key={batch.id}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">
                          {batch.name || `Test Batch #${batch.id.slice(0, 8)}`}
                        </h4>
                        <p className="text-sm text-gray-500">
                          Created {formatDate(batch.createdAt)} • Target:{" "}
                          {batch.targetCount} evaluations
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {batch.isComplete ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                            Complete
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                            {batch.progress}% Complete
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mb-3 grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-green-600">
                          {batch.completedCount}
                        </div>
                        <div className="text-xs text-gray-500">Completed</div>
                      </div>
                      {batch.runningCount > 0 && (
                        <div className="text-center">
                          <div className="text-lg font-semibold text-blue-600">
                            {batch.runningCount}
                          </div>
                          <div className="text-xs text-gray-500">Running</div>
                        </div>
                      )}
                      {batch.failedCount > 0 && (
                        <div className="text-center">
                          <div className="text-lg font-semibold text-red-600">
                            {batch.failedCount}
                          </div>
                          <div className="text-xs text-gray-500">Failed</div>
                        </div>
                      )}
                      {batch.pendingCount > 0 && (
                        <div className="text-center">
                          <div className="text-lg font-semibold text-yellow-600">
                            {batch.pendingCount}
                          </div>
                          <div className="text-xs text-gray-500">Pending</div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {batch.totalCost > 0 && (
                          <span>Cost: {formatCost(batch.totalCost)}</span>
                        )}
                        {batch.avgDuration > 0 && (
                          <span>
                            Avg Duration: {Math.floor(batch.avgDuration / 60)}m{" "}
                            {batch.avgDuration % 60}s
                          </span>
                        )}
                        {batch.avgGrade !== null && (
                          <span>Avg Grade: {batch.avgGrade.toFixed(1)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setActiveTab("jobs");
                            setSelectedBatchFilter(batch.id);
                          }}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                          View Jobs →
                        </button>
                        <button
                          onClick={() => {
                            setActiveTab("evals");
                            setEvalsBatchFilter(batch.id);
                          }}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                          View Evals →
                        </button>
                        <button
                          onClick={() => {
                            setActiveTab("export");
                            setExportBatchFilter(batch.id);
                          }}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                          Export →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
