"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { logger } from "@/infrastructure/logging/logger";
import { CheckIcon } from "@heroicons/react/24/solid";

import { importDocument } from "./actions";

interface Agent {
  id: string;
  name: string;
  description: string;
}

export default function ImportPage() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);

  // Fetch available agents
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch("/api/agents");
        if (!response.ok) throw new Error("Failed to fetch agents");
        const data = await response.json();
        setAgents(data.agents || []);
        // Select all agents by default
        setSelectedAgentIds(
          (data.agents || []).map((agent: Agent) => agent.id)
        );
      } catch (error) {
        logger.error("Error fetching agents:", error);
      } finally {
        setLoadingAgents(false);
      }
    };
    fetchAgents();
  }, []);

  const toggleAgent = (agentId: string) => {
    setSelectedAgentIds((prev) =>
      prev.includes(agentId)
        ? prev.filter((id) => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await importDocument(url.trim(), selectedAgentIds);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to import document"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Import Document</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="url"
            className="block text-sm font-medium text-gray-700"
          >
            URL <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            id="url"
            name="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/article"
            required
            disabled={isLoading}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        {/* Agent Selection */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Run evaluations after import
            </label>
          </div>

          {loadingAgents ? (
            <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 rounded-lg bg-gray-100"></div>
              ))}
            </div>
          ) : (
            <div className="grid max-h-96 grid-cols-1 gap-3 overflow-y-auto rounded-lg border border-gray-200 p-4 md:grid-cols-2">
              {agents.map((agent) => (
                <label
                  key={agent.id}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-100 p-3 transition-colors hover:border-gray-200 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedAgentIds.includes(agent.id)}
                    onChange={() => toggleAgent(agent.id)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900">
                      {agent.name}
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {agent.description}
                    </div>
                  </div>
                  {selectedAgentIds.includes(agent.id) && (
                    <CheckIcon className="mt-1 h-5 w-5 flex-shrink-0 text-blue-600" />
                  )}
                </label>
              ))}
            </div>
          )}

          {selectedAgentIds.length > 0 && (
            <p className="text-sm text-gray-600">
              {selectedAgentIds.length} evaluation
              {selectedAgentIds.length !== 1 ? "s" : ""} will be queued after
              import
            </p>
          )}
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <Button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="w-full"
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
              Importing...
            </div>
          ) : selectedAgentIds.length > 0 ? (
            `Import & Run ${selectedAgentIds.length} Evaluation${selectedAgentIds.length !== 1 ? "s" : ""}`
          ) : (
            "Import Document"
          )}
        </Button>
      </form>

      {isLoading && (
        <div className="mt-4 text-center text-sm text-gray-600">
          Importing may take 10-20 seconds. Please be patient while we process
          your document.
        </div>
      )}

      <div className="mt-6 text-sm text-gray-600">
        Supports LessWrong and the EA Forum. Attempts to fetch article content
        from other platforms.
      </div>
    </div>
  );
}
