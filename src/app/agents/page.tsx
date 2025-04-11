"use client";

import AgentsList from "@/components/AgentsList";
import { evaluationAgents } from "@/data/agents";

export default function AgentsPage() {
  return <AgentsList agents={evaluationAgents} />;
}