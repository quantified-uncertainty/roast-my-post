import { useState } from "react";
import { logger } from "@/lib/logger";

import {
  CheckCircle,
  FileDown,
} from "lucide-react";

import { Button } from "@/components/Button";
import type { Agent } from "@/types/agentSchema";

import type { BatchSummary } from "../types";

interface ExportTabProps {
  agent: Agent;
  exportBatchFilter: string | null;
  setExportBatchFilter: (filter: string | null) => void;
}

export function ExportTab({
  agent,
  exportBatchFilter,
  setExportBatchFilter,
}: ExportTabProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsExporting(true);
    setError(null);
    setCopySuccess(false);

    try {
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

      // Fetch the data
      const response = await fetch(
        `/api/agents/${agent.id}/export-data?${params}`
      );

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const yamlContent = await response.text();

      // Copy to clipboard
      await navigator.clipboard.writeText(yamlContent);
      setCopySuccess(true);

      // Reset success message after 3 seconds
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (err) {
      logger.error('Export error:', err);
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

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
          Configure your export parameters to copy evaluation data to clipboard
          in YAML format. This includes full document content, evaluation
          results, comments, and job details.
          {exportBatchFilter &&
            " Only evaluations from the selected batch will be included."}
        </p>

        <form onSubmit={handleExport} className="space-y-4">
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

          <div className="mt-6">
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            {copySuccess && (
              <div className="mb-4 rounded-md bg-green-50 p-4">
                <p className="flex items-center gap-2 text-sm text-green-800">
                  <CheckCircle className="h-4 w-4" />
                  Export data copied to clipboard successfully!
                </p>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button
                type="submit"
                disabled={isExporting}
                className="flex items-center gap-2"
              >
                {isExporting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4" />
                    Copy to Clipboard
                  </>
                )}
              </Button>
            </div>
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
