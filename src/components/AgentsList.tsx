"use client";

import Link from 'next/link';

import type { EvaluationAgent } from '@/types/evaluationAgents';
import { getIcon } from '@/utils/iconMap';

interface AgentsListProps {
  agents: EvaluationAgent[];
}

export default function AgentsList({ agents }: AgentsListProps) {
  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Evaluation Agents</h1>
      <p className="text-gray-600 mb-8">
        Select an agent to explore its capabilities and usage details.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => {
          const IconComponent = getIcon(agent.iconName);
          return (
            <Link
              key={agent.id}
              href={`/agents/${agent.id}-${agent.version.replace(".", "-")}`}
              className="block group"
            >
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 h-full transition-all duration-200 hover:shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg bg-blue-100`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold group-hover:text-blue-600 transition-colors">
                      {agent.name}
                    </h2>
                    <p className="text-gray-500 text-sm">
                      Version {agent.version}
                    </p>
                  </div>
                </div>

                <p className="text-gray-700 mb-4 line-clamp-2">
                  {agent.description}
                </p>

                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Capabilities:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {agent.capabilities.slice(0, 2).map((capability, index) => (
                      <span
                        key={index}
                        className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full"
                      >
                        {capability}
                      </span>
                    ))}
                    {agent.capabilities.length > 2 && (
                      <span className="inline-block text-gray-500 text-xs px-2 py-1">
                        +{agent.capabilities.length - 2} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 text-sm text-blue-600 font-medium group-hover:text-blue-800">
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
