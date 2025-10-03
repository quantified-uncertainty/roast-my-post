"use client";

import { useEffect, useState } from "react";
import { OverviewTab } from "@/components/AgentDetail/tabs";
import type { Agent } from "@roast/ai";
import type { OverviewStats } from "@/components/AgentDetail/types";

interface OverviewClientProps {
  agent: Agent;
  agentId: string;
}

export default function OverviewClient({ agent, agentId }: OverviewClientProps) {
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  useEffect(() => {
    const fetchOverviewStats = async () => {
      try {
        const response = await fetch(`/api/evaluators/${agentId}/overview`);
        if (response.ok) {
          const data = await response.json();
          setOverviewStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch overview stats:", error);
      } finally {
        setOverviewLoading(false);
      }
    };

    fetchOverviewStats();
  }, [agentId]);

  return (
    <OverviewTab
      agent={agent}
      overviewStats={overviewStats}
      overviewLoading={overviewLoading}
    />
  );
}