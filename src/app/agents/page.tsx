"use client";

import AgentsList from '@/components/AgentsList';
import { evaluationAgents } from '@/data/agents/index';

export default function AgentsPage() {
  return <AgentsList agents={evaluationAgents} />;
}
