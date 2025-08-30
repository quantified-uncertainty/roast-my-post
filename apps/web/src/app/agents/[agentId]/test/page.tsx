"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TestTab } from "@/components/AgentDetail/tabs";
import type { Agent } from "@roast/ai";

export default function TestPage() {
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);

  // Get agent ID from URL
  const agentId = window.location.pathname.split('/')[2];

  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const response = await fetch(`/api/agents/${agentId}`);
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

  const setBatches = () => {
    // This would normally update batches state
    console.log("setBatches called");
  };

  const fetchBatches = () => {
    // This would fetch batches
    console.log("fetchBatches called");
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