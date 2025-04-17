"use client";

import AgentsList from "@/components/AgentsList";
import { evaluationAgents } from "@/data/agents/index";

export default function AgentsPage() {
  return (
    <div className="space-y-8">
      <AgentsList agents={evaluationAgents} />
    </div>
  );
}
