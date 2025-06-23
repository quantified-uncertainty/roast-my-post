import MarkdownRenderer from "@/components/MarkdownRenderer";
import type { Agent } from "@/types/agentSchema";

interface DetailsTabProps {
  agent: Agent;
}

export function DetailsTab({ agent }: DetailsTabProps) {
  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Description</h2>
        <div className="whitespace-pre-wrap">{agent.description}</div>
      </div>

      {agent.extendedCapabilityId && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Extended Capability</h2>
          <div className="text-gray-700">{agent.extendedCapabilityId}</div>
        </div>
      )}

      {agent.genericInstructions && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Instructions</h2>
          <div className="whitespace-pre-wrap">{agent.genericInstructions}</div>
        </div>
      )}

      {agent.selfCritiqueInstructions && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">
            Self-Critique Instructions
          </h2>
          <div className="whitespace-pre-wrap">
            {agent.selfCritiqueInstructions}
          </div>
        </div>
      )}

      {agent.readme && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">README</h2>
          <MarkdownRenderer className="prose prose-sm max-w-none">
            {agent.readme}
          </MarkdownRenderer>
        </div>
      )}
    </div>
  );
}
