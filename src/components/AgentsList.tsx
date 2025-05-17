"use client";

import { BookOpen } from "lucide-react";
import Link from "next/link";

import type { AgentPurpose, EvaluationAgent } from "@/types/evaluationAgents";
import { AGENT_TYPE_INFO } from "@/utils/agentTypes";

interface AgentsListProps {
  agents: EvaluationAgent[];
}

// Default type info for unknown agent types
const DEFAULT_TYPE_INFO = {
  title: "Other Agents",
  description: "Specialized agents with unique capabilities.",
  icon: BookOpen,
};

export default function AgentsList({ agents }: AgentsListProps) {
  // Group agents by type
  const groupedAgents = agents.reduce(
    (acc, agent) => {
      const type = agent.purpose;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(agent);
      return acc;
    },
    {} as Record<AgentPurpose, EvaluationAgent[]>
  );

  return (
    <div className="mx-auto max-w-6xl p-8">
      <h1 className="mb-2 text-3xl font-bold">Evaluation Agents</h1>
      <p className="mb-8 text-gray-600">
        Select an agent to explore its capabilities and usage details.
      </p>

      {(
        Object.entries(groupedAgents) as [AgentPurpose, EvaluationAgent[]][]
      ).map(([type, typeAgents]) => {
        // Safely get type info with fallback to default
        const typeInfo = AGENT_TYPE_INFO[type] || DEFAULT_TYPE_INFO;
        const IconComponent = typeInfo.icon;

        return (
          <div key={type} className="mb-12">
            <div className="mb-6 flex items-center gap-3">
              <div className={`rounded-lg bg-${typeInfo.color}-100 p-2`}>
                <IconComponent
                  className={`h-6 w-6 text-${typeInfo.color}-600`}
                />
              </div>
              <div>
                <h2 className="text-2xl font-semibold">{typeInfo.title}</h2>
                <p className="text-gray-600">{typeInfo.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {typeAgents.map((agent: EvaluationAgent) => {
                return (
                  <Link
                    key={agent.id}
                    href={`/agents/${agent.id}}`}
                    className="group block"
                  >
                    <div className="h-full rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md">
                      <div className="mb-2 flex items-center gap-3">
                        <div>
                          <h3 className="text-xl font-semibold transition-colors group-hover:text-blue-600">
                            {agent.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {AGENT_TYPE_INFO[agent.purpose].individualTitle} • v
                            {agent.version}
                          </p>
                        </div>
                      </div>

                      <p className="line-clamp-2 text-gray-700">
                        {agent.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
