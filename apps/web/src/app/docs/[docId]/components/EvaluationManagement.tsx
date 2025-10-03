"use client";

import { useEffect, useState } from "react";

import { Bot, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  createOrRerunEvaluation,
  deleteEvaluation,
} from "@/app/docs/[docId]/actions/evaluation-actions";
import { AgentBadges } from "@/components/AgentBadges";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { useEvaluationRerun } from "@/shared/hooks/useEvaluationRerun";
import type { Evaluation } from "@/shared/types/databaseTypes";
import { sortAgentsByBadgeStatus } from "@/shared/utils/agentSorting";

import { ManagementEvaluationCard } from "./ManagementEvaluationCard";

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

export function EvaluationManagement({
  docId,
  evaluations,
  availableAgents,
  isOwner,
}: EvaluationManagementProps) {
  const router = useRouter();
  const { handleRerun, runningEvals } = useEvaluationRerun({
    documentId: docId,
  });
  const [runningAgents, setRunningAgents] = useState<Set<string>>(new Set());
  const [deletingEvals, setDeletingEvals] = useState<Set<string>>(new Set());
  const [sortedAgents, setSortedAgents] = useState<Agent[]>([]);

  // Sort available agents: recommended first, then regular, then deprecated
  useEffect(() => {
    const sorted = sortAgentsByBadgeStatus(availableAgents);
    setSortedAgents(sorted);
  }, [availableAgents]);

  const handleAddAgent = async (agentId: string) => {
    setRunningAgents((prev) => new Set([...prev, agentId]));
    try {
      await createOrRerunEvaluation(agentId, docId);
      router.refresh();
    } catch (error) {
      console.error("Failed to add agent evaluation:", error);
    } finally {
      setRunningAgents((prev) => {
        const next = new Set(prev);
        next.delete(agentId);
        return next;
      });
    }
  };

  const handleDeleteEvaluation = async (agentId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this evaluation? This will remove all related data including analysis, comments, and history."
      )
    ) {
      return;
    }

    setDeletingEvals((prev) => new Set([...prev, agentId]));
    try {
      const result = await deleteEvaluation(agentId, docId);
      if (result.success) {
        router.refresh();
      } else {
        console.error("Failed to delete evaluation:", result.error);
        alert(`Failed to delete evaluation: ${result.error}`);
      }
    } catch (error) {
      console.error("Failed to delete evaluation:", error);
      alert("Failed to delete evaluation. Please try again.");
    } finally {
      setDeletingEvals((prev) => {
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
        <h2 className="mb-1 text-lg font-semibold text-gray-900">
          Document Evaluations ({evaluations.length})
        </h2>
        <p className="mb-6 text-sm text-gray-600">
          Manage and monitor your AI evaluator evaluations
        </p>

        <div className="space-y-6">
          {evaluations.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
              <p className="text-gray-500">
                No evaluations yet. Add evaluators below to get started.
              </p>
            </div>
          ) : (
            evaluations.map((evaluation) => (
              <ManagementEvaluationCard
                key={evaluation.agent.id}
                docId={docId}
                evaluation={evaluation}
                isOwner={isOwner}
                isRunning={runningEvals.has(evaluation.agent.id)}
                isDeleting={deletingEvals.has(evaluation.agent.id)}
                onRerun={handleRerun}
                onDelete={handleDeleteEvaluation}
              />
            ))
          )}
        </div>
      </div>

      {/* Add More Agents */}
      {isOwner && sortedAgents.length > 0 && (
        <div className="rounded-lg bg-gray-50 py-6">
          <h2 className="mb-1 text-lg font-semibold text-gray-900">
            Add More Evaluators
          </h2>
          <p className="mb-6 text-sm text-gray-600">
            Available evaluators to evaluate your document
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {sortedAgents.map((agent) => {
              const isRunning = runningAgents.has(agent.id);

              return (
                <div
                  key={agent.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-5"
                >
                  <div className="flex flex-1 items-start gap-3">
                    <div className="p-1.5">
                      <Bot className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={ROUTES.AGENTS.DETAIL(agent.id)}
                          className="truncate font-medium text-gray-900 hover:text-gray-700"
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
                        <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                          {agent.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleAddAgent(agent.id)}
                    disabled={isRunning}
                    variant="outline"
                    size="sm"
                    className="ml-4 flex-shrink-0"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>

          {sortedAgents.length > 0 && (
            <p className="mt-4 text-center text-sm text-gray-500">
              Showing all {sortedAgents.length} available evaluators
            </p>
          )}
        </div>
      )}
    </>
  );
}
