"use client";

import { useEffect, useState } from "react";
import { ExportTab } from "@/components/AgentDetail/tabs";
import type { Agent } from "@roast/ai";
import type { BatchSummary } from "@/components/AgentDetail/types";

export default function ExportPage() {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [exportBatchFilter, setExportBatchFilter] = useState<string | null>(null);
  const [batches, setBatches] = useState<BatchSummary[]>([]);

  // Get agent ID from URL
  const agentId = window.location.pathname.split('/')[2];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch agent data
        const agentResponse = await fetch(`/api/agents/${agentId}`);
        if (agentResponse.ok) {
          const agentData = await agentResponse.json();
          setAgent(agentData);
        }

        // Fetch batches
        const batchesResponse = await fetch(`/api/agents/${agentId}/batches`);
        if (batchesResponse.ok) {
          const batchesData = await batchesResponse.json();
          setBatches(batchesData);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };

    if (agentId) {
      fetchData();
    }
  }, [agentId]);

  if (!agent) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-lg text-gray-600">Loading agent data...</div>
      </div>
    );
  }

  return (
    <ExportTab
      agent={agent}
      exportBatchFilter={exportBatchFilter}
      setExportBatchFilter={setExportBatchFilter}
      batches={batches}
    />
  );
}