"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { TestTab } from "@/components/AgentDetail/tabs";
import { ROUTES } from "@/constants/routes";
import type { Agent } from "@roast/ai";
import type { BatchSummary } from "@/components/AgentDetail/types";

export default function TestPage() {
  const router = useRouter();
  const params = useParams();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);
  const [batches, setBatches] = useState<BatchSummary[]>([]);

  // Get agent ID from URL
  const agentId = params.agentId as string;

  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const response = await fetch(ROUTES.API.AGENTS.DETAIL(agentId));
        if (response.ok) {
          const data = await response.json();
          setAgent(data);
        }
      } catch (error) {
        console.error("Failed to fetch agent:", error);
      }
    };

    if (agentId) {
      fetchAgent();
    }
  }, [agentId]);

  const setActiveTab = (tab: string) => {
    router.push(`/agents/${agentId}/${tab}`);
  };

  const fetchBatches = async () => {
    try {
      const response = await fetch(ROUTES.API.AGENTS.BATCHES(agentId));
      if (response.ok) {
        const data = await response.json();
        setBatches(data);
      }
    } catch (error) {
      console.error("Failed to fetch batches:", error);
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
    <TestTab
      agent={agent}
      testLoading={testLoading}
      testSuccess={testSuccess}
      setTestLoading={setTestLoading}
      setTestSuccess={setTestSuccess}
      setActiveTab={setActiveTab}
      setBatches={setBatches}
      fetchBatches={fetchBatches}
    />
  );
}