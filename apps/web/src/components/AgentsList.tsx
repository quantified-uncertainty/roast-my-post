"use client";

import Link from "next/link";

import type { Agent } from "@roast/ai";

import { AgentBadges } from "./AgentBadges";
import { AgentIcon } from "./AgentIcon";
import { AppIcon } from "./AppIcon";
import { ROUTES } from "@/constants/routes";

interface AgentsListProps {
  agents: Agent[];
}

export default function AgentsList({ agents }: AgentsListProps) {
  return (
    <div className="mx-auto max-w-6xl p-8">
      <h1 className="mb-2 flex items-center gap-2 text-3xl font-bold">
        <AppIcon name="evaluation" size={28} className="text-gray-500" />
        Evaluators
      </h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent: Agent) => {
          return (
            <Link
              key={agent.id}
              href={ROUTES.AGENTS.DETAIL(agent.id)}
              className="group block"
            >
              <div className="h-full rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md">
                <div className="mb-2 flex items-center gap-3">
                  <AgentIcon agentId={agent.id} size={32} />
                  <div>
                    <h3 className="text-xl font-semibold transition-colors group-hover:text-blue-600">
                      {agent.name}
                    </h3>
                    <p className="text-sm text-gray-500">v{agent.version}</p>
                  </div>
                </div>

                <p className="line-clamp-2 text-gray-700">
                  {agent.description}
                </p>

                <div className="mt-2 flex gap-2">
                  <AgentBadges
                    isDeprecated={agent.isDeprecated}
                    isRecommended={agent.isRecommended}
                    isSystemManaged={agent.isSystemManaged}
                    providesGrades={agent.providesGrades}
                    size="sm"
                  />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
