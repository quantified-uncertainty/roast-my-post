"use client";

import { useState, useEffect } from "react";
import { EvaluationsTab } from "@/components/AgentDetail/tabs";
import { ROUTES } from "@/constants/routes";
import type { Agent } from "@roast/ai";
import type {
  AgentEvaluation,
  BatchSummary,
} from "@/components/AgentDetail/types";

interface EvalsClientProps {
  agent: Agent;
  initialEvaluations?: AgentEvaluation[];
  agentId: string;
}

export default function EvalsClient({ 
  agent, 
  initialEvaluations = [],
  agentId: _agentId
}: EvalsClientProps) {
  const [evaluations, setEvaluations] = useState<AgentEvaluation[]>(initialEvaluations);
  const [evalsLoading, setEvalsLoading] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<AgentEvaluation | null>(null);
  const [evalDetailsTab, setEvalDetailsTab] = useState<string>("analysis");
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [evalsBatchFilter, setEvalsBatchFilter] = useState<string | null>(null);
  const [batches, _setBatches] = useState<BatchSummary[]>([]);

  const fetchEvaluations = async (batchId?: string) => {
    setEvalsLoading(true);
    try {
      const params = batchId ? `?batchId=${batchId}` : '';
      const response = await fetch(ROUTES.API.AGENTS.EVALUATIONS(_agentId) + params);
      if (response.ok) {
        const data = await response.json();
        // API returns { evaluations: [...] }
        setEvaluations(data.evaluations || []);
      }
    } catch (error) {
      console.error("Failed to fetch evaluations:", error);
    } finally {
      setEvalsLoading(false);
    }
  };

  // Fetch evaluations on mount if no initial evaluations provided
  useEffect(() => {
    if (initialEvaluations.length === 0) {
      fetchEvaluations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <EvaluationsTab
      agent={agent}
      evaluations={evaluations}
      evalsLoading={evalsLoading}
      selectedEvaluation={selectedEvaluation}
      setSelectedEvaluation={setSelectedEvaluation}
      evalDetailsTab={evalDetailsTab}
      setEvalDetailsTab={setEvalDetailsTab}
      selectedVersion={selectedVersion}
      setSelectedVersion={setSelectedVersion}
      evalsBatchFilter={evalsBatchFilter}
      setEvalsBatchFilter={setEvalsBatchFilter}
      batches={batches}
      fetchEvaluations={fetchEvaluations}
    />
  );
}