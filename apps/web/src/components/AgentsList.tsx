"use client";

import { Bot } from "lucide-react";
import Link from "next/link";

import type { Agent } from "@roast/ai";

interface AgentsListProps {
  agents: Agent[];
}


export default function AgentsList({ agents }: AgentsListProps) {

  return (
    <div className="mx-auto max-w-6xl p-8">
      <h1 className="mb-2 flex items-center gap-2 text-3xl font-bold">
        <Bot className="inline-block h-7 w-7 align-text-bottom text-gray-500" />
        Evaluation Agents
      </h1>
      <p className="mb-8 text-gray-600">
        Select an agent to explore its capabilities and usage details.
      </p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent: Agent) => {
          return (
            <Link
              key={agent.id}
              href={`/agents/${agent.id}`}
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
                  {agent.isDeprecated && (
                    <div className="inline-flex items-center rounded px-2 py-1 text-xs font-medium bg-red-50 text-red-700">
                      ⚠ Deprecated
                    </div>
                  )}
                  {agent.isRecommended && (
                    <div className="inline-flex items-center rounded px-2 py-1 text-xs font-medium bg-yellow-50 text-yellow-700">
                      ★ Recommended
                    </div>
                  )}
                  {agent.isSystemManaged && (
                    <div className="inline-flex items-center rounded px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700">
                      System
                    </div>
                  )}
                  {agent.providesGrades && (
                    <div className="inline-flex items-center rounded px-2 py-1 text-xs font-medium bg-green-50 text-green-700">
                      ✓ Grades
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
