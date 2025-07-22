import { useState } from "react";
import { Play } from "lucide-react";
import { logger } from "@/lib/logger";

import { Button } from "@/components/Button";
import type { Agent } from "@/types/agentSchema";
import { DocumentSelector } from "./DocumentSelector";

import type { ActiveTab } from "../types";

interface TestTabProps {
  agent: Agent;
  testLoading: boolean;
  testSuccess: string | null;
  setTestLoading: (loading: boolean) => void;
  setTestSuccess: (success: string | null) => void;
  setActiveTab: (tab: ActiveTab) => void;
  setBatches: (batches: any[]) => void;
  fetchBatches: () => void;
}

export function TestTab({
  agent,
  testLoading,
  testSuccess,
  setTestLoading,
  setTestSuccess,
  setActiveTab,
  setBatches,
  fetchBatches,
}: TestTabProps) {
  const [selectionMode, setSelectionMode] = useState<"specific" | "random">("random");
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Test Agent Performance
        </h3>
        <p className="mb-6 text-sm text-gray-600">
          Run evaluation tests to benchmark your agent's performance. This will
          create new evaluations on documents that have been previously
          evaluated by this agent.
        </p>

        {testSuccess && (
          <div className="mb-6 rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-green-800">{testSuccess}</p>
              </div>
            </div>
          </div>
        )}

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setTestLoading(true);
            setTestSuccess(null);

            try {
              const formData = new FormData(e.currentTarget);
              const name = formData.get("name") as string;

              let requestBody: any = {
                name: name || undefined,
              };

              if (selectionMode === "specific") {
                if (selectedDocumentIds.length === 0) {
                  setTestSuccess("Error: Please select at least one document");
                  setTestLoading(false);
                  return;
                }
                requestBody.documentIds = selectedDocumentIds;
              } else {
                const targetCount = parseInt(
                  formData.get("targetCount") as string,
                  10
                );
                requestBody.targetCount = targetCount;
              }

              const response = await fetch(
                `/api/agents/${agent.id}/eval-batch`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(requestBody),
                }
              );

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to create test batch");
              }

              const result = await response.json();
              const jobCount = result.batch?.jobCount || 0;
              
              // Reset form
              (e.target as HTMLFormElement).reset();
              setSelectedDocumentIds([]);

              // Refresh batches list
              setBatches([]);
              fetchBatches();
              
              // Switch to Batch Tests tab
              setActiveTab("batches");
            } catch (error) {
              logger.error('Test creation failed:', error);
              setTestSuccess(
                `Error: ${error instanceof Error ? error.message : "Unknown error"}`
              );
            } finally {
              setTestLoading(false);
            }
          }}
          className="space-y-6"
        >
          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Test Name (Optional)
            </label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="e.g., Agent v2.1 benchmark"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Optional name to identify this test run
            </p>
          </div>

          <div>
            <label className="mb-3 block text-sm font-medium text-gray-700">
              Selection Mode
            </label>
            <div className="flex gap-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="mode"
                  value="random"
                  checked={selectionMode === "random"}
                  onChange={() => {
                    setSelectionMode("random");
                    setSelectedDocumentIds([]);
                  }}
                  className="mr-2 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Random Selection</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="mode"
                  value="specific"
                  checked={selectionMode === "specific"}
                  onChange={() => setSelectionMode("specific")}
                  className="mr-2 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Select Specific Documents</span>
              </label>
            </div>
          </div>

          {selectionMode === "random" ? (
            <div>
              <label
                htmlFor="targetCount"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Number of Evaluations
              </label>
              <select
                id="targetCount"
                name="targetCount"
                required
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select number of tests...</option>
                <option value="1">1 evaluation (Sanity check)</option>
                <option value="3">3 evaluations (Quick test)</option>
                <option value="5">5 evaluations (Standard test)</option>
                <option value="10">10 evaluations (Comprehensive test)</option>
                <option value="20">20 evaluations (Extensive benchmark)</option>
                <option value="50">50 evaluations (Extreme benchmark)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Documents will be randomly selected from those previously
                evaluated by this agent
              </p>
            </div>
          ) : (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Select Documents to Test
              </label>
              <DocumentSelector
                agentId={agent.id}
                selectedIds={selectedDocumentIds}
                onChange={setSelectedDocumentIds}
              />
            </div>
          )}

          <div className="rounded-md bg-blue-50 p-4">
            <h4 className="mb-2 text-sm font-medium text-blue-900">
              What happens next:
            </h4>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• Jobs will be queued for parallel processing</li>
              <li>• You can monitor progress in the system monitor</li>
              <li>• Results will appear in the evaluations list</li>
              <li>• Costs will be tracked and reported</li>
            </ul>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="submit"
              disabled={testLoading}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {testLoading ? "Creating Tests..." : "Start Test Run"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
