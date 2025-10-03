"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { BatchesTab } from "@/components/AgentDetail/tabs";
import { ROUTES } from "@/constants/routes";
import type { Agent } from "@roast/ai";
import type { BatchSummary } from "@/components/AgentDetail/types";

export default function BatchesPage() {
  const router = useRouter();
  const params = useParams();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(true);

  // Get agent ID from URL
  const agentId = params.agentId as string;

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch agent data
        const agentResponse = await fetch(ROUTES.API.AGENTS.DETAIL(agentId));
        if (agentResponse.ok) {
          const agentData = await agentResponse.json();
          setAgent(agentData);
        }

        // Fetch batches
        const batchesResponse = await fetch(ROUTES.API.AGENTS.BATCHES(agentId));
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
    router.push(`${ROUTES.AGENTS.DETAIL(agentId)}/${tab}`);
  };

  const setSelectedBatchFilter = (batchId: string | null) => {
    // Navigate to jobs tab with batch filter
    if (batchId) {
      router.push(`${ROUTES.AGENTS.JOBS(agentId)}?batchId=${batchId}`);
    }
  };

  const setEvalsBatchFilter = (batchId: string | null) => {
    // Navigate to evals tab with batch filter
    if (batchId) {
      router.push(`${ROUTES.AGENTS.EVALS(agentId)}?batchId=${batchId}`);
    }
  };

  const setExportBatchFilter = (batchId: string | null) => {
    // Navigate to export tab with batch filter
    if (batchId) {
      router.push(`${ROUTES.AGENTS.EXPORT(agentId)}?batchId=${batchId}`);
    }
  };

  if (!agent) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-lg text-gray-600">Loading evaluator data...</div>
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