"use client";

import Link from "next/link";

import type { EvaluationAgent } from "@/types/evaluationAgents";
import { getIcon } from "@/utils/iconMap";

interface AgentsListProps {
  agents: EvaluationAgent[];
}

export default function AgentsList({ agents }: AgentsListProps) {
  return (
    <div className="mx-auto max-w-6xl p-8">
      <h1 className="mb-2 text-3xl font-bold">Evaluation Agents</h1>
      <p className="mb-8 text-gray-600">
        Select an agent to explore its capabilities and usage details.
      </p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => {
          const IconComponent = getIcon(agent.iconName);
          return (
            <Link
              key={agent.id}
              href={`/agents/${agent.id}-${agent.version.replace(".", "-")}`}
              className="group block"
            >
              <div className="h-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
                <div className="mb-4 flex items-center gap-3">
                  <div className={`rounded-lg bg-blue-100 p-2`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold transition-colors group-hover:text-blue-600">
                      {agent.name}
                    </h2>
                    <p className="text-sm text-gray-500">
                      Version {agent.version}
                    </p>
                  </div>
                </div>

                <p className="mb-4 line-clamp-2 text-gray-700">
                  {agent.description}
                </p>

                <div className="mt-4">
                  <p className="mb-1 text-sm font-medium text-gray-700">
                    Capabilities:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {agent.capabilities.slice(0, 2).map((capability, index) => (
                      <span
                        key={index}
                        className="inline-block rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-800"
                      >
                        {capability}
                      </span>
                    ))}
                    {agent.capabilities.length > 2 && (
                      <span className="inline-block px-2 py-1 text-xs text-gray-500">
                        +{agent.capabilities.length - 2} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 text-sm font-medium text-blue-600 group-hover:text-blue-800">
                  View agent details →
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
