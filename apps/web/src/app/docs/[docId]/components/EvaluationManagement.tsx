"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  BeakerIcon,
  ArrowPathIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { AgentBadges } from "@/components/AgentBadges";
import { rerunEvaluation, createOrRerunEvaluation } from "@/app/docs/[docId]/actions/evaluation-actions";
import { sortAgentsByBadgeStatus } from "@/shared/utils/agentSorting";
import { ManagementEvaluationCard } from "./ManagementEvaluationCard";
import type { Evaluation } from "@/shared/types/databaseTypes";

interface Agent {
  id: string;
  name: string;
  description?: string;
  isDeprecated?: boolean;
  isRecommended?: boolean;
  isSystemManaged?: boolean;
  providesGrades?: boolean;
}

interface EvaluationManagementProps {
  docId: string;
  evaluations: Array<Evaluation & { jobs?: Array<{ status: string }> }>;
  availableAgents: Agent[];
  isOwner: boolean;
}

export function EvaluationManagement({ docId, evaluations, availableAgents, isOwner }: EvaluationManagementProps) {
  const router = useRouter();
  const [runningEvals, setRunningEvals] = useState<Set<string>>(new Set());
  const [runningAgents, setRunningAgents] = useState<Set<string>>(new Set());
  const [sortedAgents, setSortedAgents] = useState<Agent[]>([]);

  // Sort available agents: recommended first, then regular, then deprecated
  useEffect(() => {
    const sorted = sortAgentsByBadgeStatus(availableAgents);
    setSortedAgents(sorted);
  }, [availableAgents]);

  const handleRerun = async (agentId: string) => {
    setRunningEvals(prev => new Set([...prev, agentId]));
    try {
      await rerunEvaluation(agentId, docId);
      router.refresh();
    } catch (error) {
      console.error('Failed to rerun evaluation:', error);
    } finally {
      setRunningEvals(prev => {
        const next = new Set(prev);
        next.delete(agentId);
        return next;
      });
    }
  };

  const handleAddAgent = async (agentId: string) => {
    setRunningAgents(prev => new Set([...prev, agentId]));
    try {
      await createOrRerunEvaluation(agentId, docId);
      router.refresh();
    } catch (error) {
      console.error('Failed to add agent evaluation:', error);
    } finally {
      setRunningAgents(prev => {
        const next = new Set(prev);
        next.delete(agentId);
        return next;
      });
    }
  };


  return (
    <>
      {/* Active Evaluations */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Active Evaluations ({evaluations.length})
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Manage and monitor your AI agent evaluations
        </p>

        <div className="space-y-6">
          {evaluations.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-500">No evaluations yet. Add agents below to get started.</p>
            </div>
          ) : (
            evaluations.map((evaluation) => (
              <ManagementEvaluationCard
                key={evaluation.agent.id}
                docId={docId}
                evaluation={evaluation}
                isOwner={isOwner}
                isRunning={runningEvals.has(evaluation.agent.id)}
                onRerun={handleRerun}
              />
            ))
          )}
        </div>
      </div>

      {/* Add More Agents */}
      {isOwner && sortedAgents.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Add More Agents
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Available agents to evaluate your document
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedAgents.slice(0, 10).map((agent) => {
              const isRunning = runningAgents.has(agent.id);

              return (
                <div
                  key={agent.id}
                  className="bg-white rounded-lg border border-gray-200 p-5 flex items-center justify-between"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-1.5">
                      <BeakerIcon className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link 
                          href={`/agents/${agent.id}`}
                          className="font-medium text-gray-900 hover:text-gray-700 truncate"
                        >
                          {agent.name}
                        </Link>
                        <AgentBadges
                          isDeprecated={agent.isDeprecated}
                          isRecommended={agent.isRecommended}
                          isSystemManaged={agent.isSystemManaged}
                          providesGrades={agent.providesGrades}
                          size="sm"
                        />
                      </div>
                      {agent.description && (
                        <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                          {agent.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddAgent(agent.id)}
                    disabled={isRunning}
                    className="ml-4 flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRunning ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <PlusIcon className="h-4 w-4" />
                        Add
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {sortedAgents.length > 10 && (
            <p className="text-sm text-gray-500 text-center mt-4">
              Showing 10 of {sortedAgents.length} available agents
            </p>
          )}
        </div>
      )}
    </>
  );
}