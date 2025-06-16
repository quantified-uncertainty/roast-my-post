import { Button } from "@/components/Button";
import {
  ArrowPathIcon,
  ClockIcon,
  PlayIcon,
} from "@heroicons/react/24/outline";

import type { AgentWithEvaluation } from "../types";

interface AgentListProps {
  agents: AgentWithEvaluation[];
  selectedReviewId: string | null;
  isOwner?: boolean;
  onAgentSelect: (agentId: string) => void;
  onRerun: (agentId: string) => void;
}

// Helper function to get the latest job status
function getLatestJobStatus(agentWithEval: AgentWithEvaluation) {
  if (!agentWithEval.evaluation?.jobs?.length) return null;
  return agentWithEval.evaluation.jobs[agentWithEval.evaluation.jobs.length - 1]
    .status;
}

export function AgentList({
  agents,
  selectedReviewId,
  isOwner,
  onAgentSelect,
  onRerun,
}: AgentListProps) {
  return (
    <div className="col-span-2 shrink-0">
      <div className="w-[250px]">
        <div className="border-b border-gray-200 px-4 py-2">
          <h2 className="text-lg font-medium">Agents ({agents.length})</h2>
        </div>
        <div>
          {agents.map((agentWithEval, idx) => (
            <div
              key={agentWithEval.id}
              className={`cursor-pointer px-3 py-2 text-sm ${
                selectedReviewId === agentWithEval.id
                  ? "bg-blue-50"
                  : "bg-transparent"
              } ${idx !== agents.length - 1 ? "border-b border-gray-200" : ""}`}
              onClick={() => onAgentSelect(agentWithEval.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">
                    {agentWithEval.name}
                    {agentWithEval.isIntended && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                        Intended
                      </span>
                    )}
                  </div>
                  {!agentWithEval.evaluation && (
                    <div className="text-xs text-gray-500">
                      No evaluation yet
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {agentWithEval.evaluation?.versions &&
                    agentWithEval.evaluation.versions.length > 0 && (
                      <div className="text-xs text-gray-500">
                        {agentWithEval.evaluation.versions.length} versions
                      </div>
                    )}
                  {getLatestJobStatus(agentWithEval) === "RUNNING" && (
                    <PlayIcon className="h-4 w-4 animate-pulse text-blue-500" />
                  )}
                  {getLatestJobStatus(agentWithEval) === "PENDING" && (
                    <ClockIcon className="h-4 w-4 text-yellow-500" />
                  )}
                  {isOwner && (
                    <Button
                      variant="secondary"
                      className="flex items-center gap-1 px-2 py-1 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRerun(agentWithEval.id);
                      }}
                    >
                      <ArrowPathIcon className="h-3 w-3" />
                      {agentWithEval.evaluation ? "Rerun" : "Run"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
