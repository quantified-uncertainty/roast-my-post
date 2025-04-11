"use client";

import AgentsList from "@/components/AgentsList";
import { evaluationAgents } from "@/types/evaluationAgents";

export default function AgentsPage() {
  return <AgentsList agents={evaluationAgents} />;
}