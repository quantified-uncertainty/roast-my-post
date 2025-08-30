"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BatchesTab } from "@/components/AgentDetail/tabs";
import type { Agent } from "@roast/ai";
import type { BatchSummary } from "@/components/AgentDetail/types";

export default function BatchesPage() {
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(true);

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
      } finally {
        setBatchesLoading(false);
      }
    };

    if (agentId) {
      fetchData();
    }
  }, [agentId]);

  const setActiveTab = (tab: string) => {
    router.push(`/agents/${agentId}/${tab}`);
  };

  const setSelectedBatchFilter = (batchId: string | null) => {
    // Navigate to the appropriate tab with batch filter
    if (batchId) {
      router.push(`/agents/${agentId}/evals?batchId=${batchId}`);
    }
  };

  const setEvalsBatchFilter = (batchId: string | null) => {
    // Navigate to evals tab with batch filter
    if (batchId) {
      router.push(`/agents/${agentId}/evals?batchId=${batchId}`);
    }
  };

  const setExportBatchFilter = (batchId: string | null) => {
    // Navigate to export tab with batch filter
    if (batchId) {
      router.push(`/agents/${agentId}/export?batchId=${batchId}`);
    }
  };

  if (!agent) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-lg text-gray-600">Loading agent data...</div>
      </div>
    );
  }

  return (
    <BatchesTab
      batches={batches}
      batchesLoading={batchesLoading}
      setActiveTab={setActiveTab}
      setSelectedBatchFilter={setSelectedBatchFilter}
      setEvalsBatchFilter={setEvalsBatchFilter}
      setExportBatchFilter={setExportBatchFilter}
    />
  );
}