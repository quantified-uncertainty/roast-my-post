"use client";

import { Bot } from "lucide-react";
import Link from "next/link";

import type { Agent } from "@roast/ai";
import { AgentBadges } from "./AgentBadges";

interface AgentsListProps {
  agents: Agent[];
  showNewAgentButton?: boolean;
}


export default function AgentsList({ agents, showNewAgentButton = false }: AgentsListProps) {

  return (
    <div className="mx-auto max-w-6xl p-8">
      <h1 className="mb-2 flex items-center gap-2 text-3xl font-bold">
        <Bot className="inline-block h-7 w-7 align-text-bottom text-gray-500" />
        Evaluators
      </h1>
      <p className="mb-8 text-gray-600">
        Select an evaluator to explore its capabilities and usage details.
        {showNewAgentButton && (
          <>
            {" "}
            <Link
              href="/evaluators/new"
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              Make a new evaluator
            </Link>
          </>
        )}
      </p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent: Agent) => {
          return (
            <Link
              key={agent.id}
              href={`/evaluators/${agent.id}`}
              className="group block"
            >
              <div className="h-full rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md">
                <div className="mb-2 flex items-center gap-3">
                  <div>
                    <h3 className="text-xl font-semibold transition-colors group-hover:text-blue-600">
                      {agent.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      v{agent.version}
                    </p>
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
