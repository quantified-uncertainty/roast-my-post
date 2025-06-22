import { FileDown } from "lucide-react";

import { Button } from "@/components/Button";
import type { Agent } from "@/types/agentSchema";

import type { BatchSummary } from "../types";

interface ExportTabProps {
  agent: Agent;
  exportBatchFilter: string | null;
  setExportBatchFilter: (filter: string | null) => void;
  batches: BatchSummary[];
}

export function ExportTab({
  agent,
  exportBatchFilter,
  setExportBatchFilter,
  batches,
}: ExportTabProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Export Evaluation Data
            {exportBatchFilter && (
              <span className="ml-2 rounded-md bg-blue-100 px-2 py-1 text-sm font-medium text-blue-800">
                Batch: {exportBatchFilter.slice(0, 8)}
              </span>
            )}
          </h3>
          {exportBatchFilter && (
            <button
              onClick={() => setExportBatchFilter(null)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear batch filter
            </button>
          )}
        </div>
        <p className="mb-6 text-sm text-gray-600">
          Configure your export parameters to download evaluation data in YAML
          format. This includes full document content, evaluation results,
          comments, and job details.
          {exportBatchFilter &&
            " Only evaluations from the selected batch will be included."}
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const params = new URLSearchParams();

            const version = formData.get("version");
            if (version && version !== "all") {
              params.append("version", version.toString());
            }

            const startDate = formData.get("startDate");
            if (startDate) {
              params.append(
                "startDateTime",
                new Date(startDate.toString()).toISOString()
              );
            }

            const limit = formData.get("limit");
            if (limit) {
              params.append("limit", limit.toString());
            }

            const showLlmInteractions = formData.get("showLlmInteractions");
            if (showLlmInteractions) {
              params.append("showLlmInteractions", "true");
            }

            // Add batch filter if present
            if (exportBatchFilter) {
              params.append("batchId", exportBatchFilter);
            }

            // Open in new tab
            window.open(
              `/api/agents/${agent.id}/export-data?${params}`,
              "_blank"
            );
          }}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="export-version"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Agent Version
            </label>
            <select
              id="export-version"
              name="version"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">All versions</option>
              {Array.from({ length: Number(agent.version) }, (_, i) => i + 1)
                .reverse()
                .map((version) => (
                  <option key={version} value={version}>
                    v{version}
                    {version === Number(agent.version) && " (current)"}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="export-start-date"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Start Date (optional)
            </label>
            <input
              type="date"
              id="export-start-date"
              name="startDate"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Only include evaluations after this date
            </p>
          </div>

          <div>
            <label
              htmlFor="export-limit"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Maximum Results
            </label>
            <input
              type="number"
              id="export-limit"
              name="limit"
              defaultValue="100"
              min="1"
              max="1000"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Maximum number of evaluations to export (1-1000)
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                id="export-llm-interactions"
                name="showLlmInteractions"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Include LLM interactions
              </span>
            </label>
            <p className="ml-6 mt-1 text-xs text-gray-500">
              Include full prompt/response data for first 10% of evaluations
              (minimum 1)
            </p>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button type="submit" className="flex items-center gap-2">
              <FileDown className="h-4 w-4" />
              Export as YAML
            </Button>
          </div>
        </form>

        <div className="mt-6 border-t border-gray-200 pt-6">
          <h4 className="mb-2 text-sm font-medium text-gray-900">
            Export Format
          </h4>
          <p className="text-sm text-gray-600">The export will include:</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-600">
            <li>Full document content and metadata</li>
            <li>Complete evaluation analysis and summaries</li>
            <li>All comments with highlight positions</li>
            <li>Job execution details and costs</li>
            <li>Complete LLM interactions (prompts and responses)</li>
            <li>Agent configuration and instructions</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
