"use client";

import type { EvaluationAgent } from "@/types/evaluationAgents";
import { AGENT_TYPE_INFO } from "@/utils/agentTypes";
import { getIcon } from "@/utils/iconMap";

interface AgentDetailProps {
  agent: EvaluationAgent;
}

export default function AgentDetail({ agent }: AgentDetailProps) {
  const IconComponent = getIcon(agent.iconName);

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-8 flex items-center gap-4">
        <div
          className={`rounded-lg bg-${AGENT_TYPE_INFO[agent.purpose].color}-100 p-3`}
        >
          <IconComponent
            className={`h-8 w-8 text-${AGENT_TYPE_INFO[agent.purpose].color}-600`}
          />
        </div>
        <div>
          <h2 className="text-xl font-semibold transition-colors group-hover:text-blue-600">
            {agent.name}
          </h2>
          <p className="text-sm text-gray-500">
            {AGENT_TYPE_INFO[agent.purpose].individualTitle} v{agent.version}
          </p>
        </div>
      </div>

      <div className="mb-8">
        <p className="text-lg text-gray-700">{agent.description}</p>
      </div>

      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Use Cases</h2>
        <ul className="space-y-2">
          {agent.use_cases.map((useCase, index) => (
            <li key={index} className="flex items-start">
              <span className="mr-2 text-blue-500">•</span>
              <span>{useCase}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Capabilities</h2>
          <ul className="space-y-2">
            {agent.capabilities.map((capability, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-2 text-green-500">✓</span>
                <span>{capability}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Limitations</h2>
          <ul className="space-y-2">
            {agent.limitations.map((limitation, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-2 text-amber-500">!</span>
                <span>{limitation}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Primary Instructions</h2>
        <div className="mb-8 whitespace-pre-wrap">
          {agent.genericInstructions}
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Summary Instructions</h2>
        <div className="mb-8 whitespace-pre-wrap">
          {agent.summaryInstructions}
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Comment Instructions</h2>
        <div className="mb-8 whitespace-pre-wrap">
          {agent.commentInstructions}
        </div>
      </div>

      <div className="mt-12 rounded-lg border border-gray-200 bg-gray-50 p-6">
        <h2 className="mb-4 text-xl font-semibold">How to Use</h2>
        <p className="mb-4">
          To use the {agent.name} for document evaluation, follow these steps:
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Upload or select the document you want to evaluate</li>
          <li>Select "{agent.name}" from the evaluation agents list</li>
          <li>
            Configure any specific parameters for the evaluation (if applicable)
          </li>
          <li>Review the agent's feedback and annotations on your document</li>
          <li>Apply suggested changes or export the evaluation report</li>
        </ol>
      </div>
    </div>
  );
}
