"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  BeakerIcon,
  ArrowPathIcon,
  PlusIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { ChatBubbleLeftIcon as ChatBubbleLeftIconSolid } from "@heroicons/react/20/solid";
import { GradeBadge } from "@/components/GradeBadge";
import { StaleBadge } from "@/components/StaleBadge";
import { formatDistanceToNow } from "date-fns";
import { rerunEvaluation, createOrRerunEvaluation } from "@/app/docs/[docId]/actions/evaluation-actions";

interface EvaluationManagementProps {
  docId: string;
  evaluations: any[];
  availableAgents: any[];
  isOwner: boolean;
}

export function EvaluationManagement({ docId, evaluations, availableAgents, isOwner }: EvaluationManagementProps) {
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

        <div className="space-y-6">
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
              const isStale = evaluation.isStale || false;
              
              // Calculate stats
              const totalCost = evaluation.versions?.reduce((sum: number, v: any) => {
                const price = v.job?.priceInDollars;
                if (!price) return sum;
                const priceNum = typeof price === 'string' ? parseFloat(price) : Number(price);
                return sum + priceNum;
              }, 0) || 0;
              const avgDuration = versionCount > 0 
                ? evaluation.versions.reduce((sum: number, v: any) => 
                    sum + (v.job?.durationInSeconds || 0), 0) / versionCount
                : 0;
              
              // Calculate success rate
              const completedJobs = evaluation.jobs?.filter((job: any) => job.status === "COMPLETED").length || 0;
              const totalJobs = evaluation.jobs?.length || 0;
              const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

              // Get latest job status
              const latestJobStatus = evaluation.jobs?.[0]?.status || 
                latestVersion?.job?.status || "COMPLETED";

              // Get summary and comment count
              const latestSummary = latestVersion?.summary || "";
              const commentCount = latestVersion?.comments?.length || 0;
              
              // Calculate word count from analysis
              const analysisWordCount = latestVersion?.analysis 
                ? latestVersion.analysis.trim().split(/\s+/).length 
                : 0;

              return (
                <div key={agentId} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {/* Header section */}
                  <div className="px-5 py-4">
                    <div className="flex items-center justify-between">
                      {/* Left side - Agent info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-1.5">
                          <BeakerIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Link 
                              href={`/agents/${agentId}`}
                              className="font-medium text-gray-900 hover:text-gray-700"
                            >
                              {evaluation.agent.name}
                            </Link>
                            {isStale && (
                              <StaleBadge size="sm" />
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-sm text-gray-500">
                            <Link 
                              href={`/docs/${docId}/evals/${agentId}/versions/${latestVersion?.version || versionCount}`}
                              className="text-purple-700 hover:text-purple-900"
                            >
                              {versionCount} version{versionCount !== 1 ? 's' : ''}
                            </Link>
                            {totalJobs > 0 && (
                              <>
                                <span>•</span>
                                <span className={successRate < 100 ? 'text-amber-600' : ''}>
                                  {successRate.toFixed(0)}% success
                                </span>
                              </>
                            )}
                            <span>•</span>
                            <span>{avgDuration.toFixed(1)}s avg</span>
                            <span>•</span>
                            <span>${totalCost.toFixed(2)} total</span>
                          </div>
                        </div>
                      </div>

                      {/* Right side - Actions */}
                      <div className="flex items-center gap-2 ml-4">
                        {isOwner && (
                          <button
                            onClick={() => handleRerun(agentId)}
                            disabled={isRunning || latestJobStatus === "PENDING" || latestJobStatus === "RUNNING"}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ArrowPathIcon className={`h-3.5 w-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                            {isRunning ? 'Running...' : 'Rerun'}
                          </button>
                        )}
                        <Link
                          href={`/docs/${docId}/evals/${agentId}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                          Details
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Recent Eval section */}
                  {latestVersion && (
                    <div className="bg-gray-50 px-5 py-4 border-t border-gray-100">
                      <div className="flex gap-4 items-start">
                        {/* Grade badge */}
                        <div className="flex-shrink-0">
                          {latestGrade !== null && latestGrade !== undefined ? (
                            <GradeBadge grade={latestGrade} variant="grayscale" size="md" />
                          ) : (
                            <div className="bg-gray-100 rounded px-3 py-1">
                              <span className="text-gray-400 text-sm font-semibold">N/A</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Summary and metadata */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {latestSummary || "No summary available for this evaluation."}
                          </p>
                          <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                            {commentCount > 0 && (
                              <>
                                <span className="flex items-center gap-1">
                                  <ChatBubbleLeftIconSolid className="h-3.5 w-3.5 text-gray-400" />
                                  {commentCount}
                                </span>
                                <span>•</span>
                              </>
                            )}
                            {analysisWordCount > 0 && (
                              <>
                                <span className="flex items-center gap-1">
                                  <DocumentTextIcon className="h-3.5 w-3.5 text-gray-400" />
                                  {analysisWordCount} words
                                </span>
                                <span>•</span>
                              </>
                            )}
                            <span>{formatDistanceToNow(new Date(latestVersion?.createdAt || Date.now()), { addSuffix: true })}</span>
                            {latestVersion?.job && (
                              <>
                                <span>•</span>
                                <Link
                                  href={`/docs/${docId}/evals/${agentId}/logs`}
                                  className="text-purple-700 hover:text-purple-900"
                                >
                                  Logs
                                </Link>
                              </>
                            )}
                            {latestJobStatus && (
                              <>
                                <span>•</span>
                                <span className={`font-medium ${
                                  latestJobStatus === "COMPLETED" ? "text-green-600" : 
                                  latestJobStatus === "FAILED" ? "text-red-600" : 
                                  latestJobStatus === "RUNNING" ? "text-orange-600" : "text-amber-600"
                                }`}>
                                  {latestJobStatus === "COMPLETED" ? "Completed" : 
                                   latestJobStatus === "FAILED" ? "Failed" : 
                                   latestJobStatus === "RUNNING" ? "Processing" : "Pending"}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add More Agents */}
      {isOwner && availableAgents.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Add More Agents
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Available agents to evaluate your document
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableAgents.slice(0, 10).map((agent) => {
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
                      <Link 
                        href={`/agents/${agent.id}`}
                        className="font-medium text-gray-900 hover:text-gray-700 truncate block"
                      >
                        {agent.name}
                      </Link>
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