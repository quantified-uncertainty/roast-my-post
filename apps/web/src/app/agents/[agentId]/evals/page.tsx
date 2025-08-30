"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { EvaluationsTab } from "@/components/AgentDetail/tabs";
import type { Agent } from "@roast/ai";
import type {
  AgentEvaluation,
  BatchSummary,
} from "@/components/AgentDetail/types";

export default function EvalsPage() {
  const params = useParams();
  const agentId = params.agentId as string;
  
  const [agent, setAgent] = useState<Agent | null>(null);
  const [evaluations, setEvaluations] = useState<AgentEvaluation[]>([]);
  const [evalsLoading, setEvalsLoading] = useState(true);
  const [selectedEvaluation, setSelectedEvaluation] = useState<AgentEvaluation | null>(null);
  const [evalDetailsTab, setEvalDetailsTab] = useState<string>("analysis");
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [evalsBatchFilter, setEvalsBatchFilter] = useState<string | null>(null);
  const [batches, setBatches] = useState<BatchSummary[]>([]);

  useEffect(() => {
    const fetchAgentAndEvaluations = async () => {
      try {
        // Fetch agent data
        const agentResponse = await fetch(`/api/agents/${agentId}`);
        if (agentResponse.ok) {
          const agentData = await agentResponse.json();
          setAgent(agentData);
        }

        // For now, set empty evaluations array to prevent the filter error
        setEvaluations([]);
        
        // In the future, you can fetch real evaluations like this:
        // const evalsResponse = await fetch(`/api/agents/${agentId}/evaluations`);
        // if (evalsResponse.ok) {
        //   const evalsData = await evalsResponse.json();
        //   setEvaluations(evalsData);
        // }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setEvalsLoading(false);
      }
    };

    if (agentId) {
      fetchAgentAndEvaluations();
    }
  }, [agentId]);

  const fetchEvaluations = async (batchId?: string) => {
    setEvalsLoading(true);
    try {
      // For now, just set empty array
      setEvaluations([]);
      
      // In the future:
      // const params = batchId ? `?batchId=${batchId}` : '';
      // const response = await fetch(`/api/agents/${agentId}/evaluations${params}`);
      // if (response.ok) {
      //   const data = await response.json();
      //   setEvaluations(data);
      // }
    } catch (error) {
      console.error("Failed to fetch evaluations:", error);
    } finally {
      setEvalsLoading(false);
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