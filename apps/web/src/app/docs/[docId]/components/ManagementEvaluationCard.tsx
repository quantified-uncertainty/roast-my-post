"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { 
  BeakerIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { ChatBubbleLeftIcon as ChatBubbleLeftIconSolid } from "@heroicons/react/20/solid";
import { GradeBadge } from "@/components/GradeBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { EvaluationHeader } from "@/components/EvaluationCard/shared/EvaluationHeader";
import { EvaluationStats } from "@/components/EvaluationCard/shared/EvaluationStats";
import { EvaluationActions } from "@/components/EvaluationCard/shared/EvaluationActions";
import { getEvaluationStatus } from "@/shared/utils/evaluationStatus";
import type { Evaluation } from "@/shared/types/databaseTypes";

interface ManagementEvaluationCardProps {
  docId: string;
  evaluation: Evaluation & {
    jobs?: Array<{ status: string }>;
  };
  isOwner: boolean;
  isRunning: boolean;
  onRerun: (agentId: string) => Promise<void>;
}

export function ManagementEvaluationCard({
  docId,
  evaluation,
  isOwner,
  isRunning,
  onRerun,
}: ManagementEvaluationCardProps) {
  const agentId = evaluation.agent.id;
  const latestVersion = evaluation.versions?.[0];
  const latestGrade = latestVersion?.grade;
  const versionCount = evaluation.versions?.length || 0;
  const isStale = evaluation.isStale || false;
  
  // Calculate stats
  const totalCost = evaluation.versions?.reduce((sum: number, v) => {
    const price = v.job?.priceInDollars;
    if (!price) return sum;
    const priceNum = typeof price === 'string' ? parseFloat(price) : Number(price);
    return sum + priceNum;
  }, 0) || 0;
  
  const avgDuration = versionCount > 0 && evaluation.versions
    ? evaluation.versions.reduce((sum: number, v) => 
        sum + (v.job?.durationInSeconds || 0), 0) / versionCount
    : 0;
  
  // Calculate success rate
  const completedJobs = evaluation.jobs?.filter((job) => job.status === "COMPLETED").length || 0;
  const totalJobs = evaluation.jobs?.length || 0;
  const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

  // Get evaluation status using shared utility
  const { status: evaluationStatus, isRerunning } = getEvaluationStatus(evaluation);
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header section */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Agent info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-1.5">
              <BeakerIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
            </div>
            <div className="flex-1 min-w-0">
              <EvaluationHeader
                agentName={evaluation.agent.name}
                grade={latestGrade}
                isStale={isStale}
                isRerunning={isRerunning}
                evaluationStatus={evaluationStatus}
                showGrade={false}
              >
                <Link 
                  href={`/agents/${agentId}`}
                  className="ml-1 text-gray-400 hover:text-gray-600"
                >
                  →
                </Link>
              </EvaluationHeader>
              <div className="mt-0.5">
                <EvaluationStats
                  versionCount={versionCount}
                  successRate={successRate}
                  avgDuration={avgDuration}
                  totalCost={totalCost}
                  docId={docId}
                  agentId={agentId}
                  versionNumber={latestVersion?.version}
                />
              </div>
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="ml-4">
            <EvaluationActions
              documentId={docId}
              agentId={agentId}
              onRerun={isOwner ? () => onRerun(agentId) : undefined}
              isRunning={isRunning || latestJobStatus === "PENDING" || latestJobStatus === "RUNNING"}
              showRerun={isOwner}
              showDetails={true}
              detailsStyle="button"
              className="flex items-center gap-2"
            />
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
                {(evaluationStatus !== "completed" || isRerunning) && (
                  <>
                    <span>•</span>
                    <StatusBadge
                      status={evaluationStatus}
                      showText={true}
                    />
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}