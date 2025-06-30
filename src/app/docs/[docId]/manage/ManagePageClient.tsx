"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  BeakerIcon,
  ArrowPathIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { GradeBadge } from "@/components/GradeBadge";
import { JobStatusIndicator } from "@/components/JobStatusIndicator";
import { Button } from "@/components/Button";
import { formatDistanceToNow } from "date-fns";
import { rerunEvaluation, createOrRerunEvaluation } from "@/app/docs/[docId]/evaluations/actions";

interface ManagePageClientProps {
  docId: string;
  evaluations: any[];
  availableAgents: any[];
}

export function ManagePageClient({ docId, evaluations, availableAgents }: ManagePageClientProps) {
  const router = useRouter();
  const [runningEvals, setRunningEvals] = useState<Set<string>>(new Set());
  const [runningAgents, setRunningAgents] = useState<Set<string>>(new Set());

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

        <div className="space-y-4">
          {evaluations.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-500">No evaluations yet. Add agents below to get started.</p>
            </div>
          ) : (
            evaluations.map((evaluation) => {
              const agentId = evaluation.agent.id;
              const isRunning = runningEvals.has(agentId);
              const latestVersion = evaluation.versions?.[0];
              const latestGrade = latestVersion?.grade;
              const versionCount = evaluation.versions?.length || 0;
              
              // Calculate stats
              const totalCost = evaluation.versions?.reduce((sum: number, v: any) => 
                sum + (v.job?.costInCents || 0), 0) / 100 || 0;
              const avgDuration = versionCount > 0 
                ? evaluation.versions.reduce((sum: number, v: any) => 
                    sum + (v.job?.durationInSeconds || 0), 0) / versionCount
                : 0;

              // Get latest job status
              const latestJobStatus = evaluation.jobs?.[0]?.status || 
                latestVersion?.job?.status || "COMPLETED";

              return (
                <div key={agentId} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    {/* Left side - Agent info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <BeakerIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link 
                            href={`/agents/${agentId}`}
                            className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                          >
                            {evaluation.agent.name}
                          </Link>
                          {latestGrade !== null && latestGrade !== undefined && (
                            <GradeBadge grade={latestGrade} variant="light" size="xs" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span>{versionCount} version{versionCount !== 1 ? 's' : ''}</span>
                          <span>•</span>
                          <span>Latest: v{latestVersion?.version || versionCount}</span>
                          <span>•</span>
                          <span>{formatDistanceToNow(new Date(latestVersion?.createdAt || Date.now()), { addSuffix: true })}</span>
                          <span>•</span>
                          <span>${totalCost.toFixed(2)} total</span>
                          <span>•</span>
                          <span>{avgDuration.toFixed(1)}s avg</span>
                        </div>
                        {evaluation.agent.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                            {evaluation.agent.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right side - Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <Link
                        href={`/docs/${docId}/evals/${agentId}`}
                        className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        View Latest
                      </Link>
                      <Link
                        href={`/docs/${docId}/evals/${agentId}/versions`}
                        className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        History
                      </Link>
                      <Button
                        variant="primary"
                        onClick={() => handleRerun(agentId)}
                        disabled={isRunning || latestJobStatus === "PENDING" || latestJobStatus === "RUNNING"}
                        className="flex items-center gap-1 text-sm"
                      >
                        <ArrowPathIcon className={`h-3.5 w-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                        {isRunning ? 'Running' : 'Rerun'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add More Agents */}
      {availableAgents.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Add More Agents
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Available agents to evaluate your document
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableAgents.slice(0, 10).map((agent) => {
              const isRunning = runningAgents.has(agent.id);

              return (
                <div
                  key={agent.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <BeakerIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{agent.name}</h4>
                      {agent.description && (
                        <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                          {agent.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => handleAddAgent(agent.id)}
                    disabled={isRunning}
                    className="ml-4 flex-shrink-0 flex items-center gap-1"
                  >
                    {isRunning ? (
                      <>
                        <ArrowPathIcon className="h-3 w-3 animate-spin" />
                        Adding
                      </>
                    ) : (
                      <>
                        <PlusIcon className="h-3 w-3" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>

          {availableAgents.length > 10 && (
            <p className="text-sm text-gray-500 text-center mt-4">
              Showing 10 of {availableAgents.length} available agents
            </p>
          )}
        </div>
      )}
    </>
  );
}