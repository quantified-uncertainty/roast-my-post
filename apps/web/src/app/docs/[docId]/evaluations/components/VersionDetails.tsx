import { ExportEvaluationButton } from "@/components/ExportEvaluationButton";
import { EvaluationContent } from "@/components/evaluation";
import type { Evaluation } from "@/types/documentSchema";
import Link from "next/link";
import {
  ChatBubbleLeftIcon,
  DocumentTextIcon,
  LightBulbIcon,
  ListBulletIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

import { TaskLogs } from "./TaskLogs";

interface VersionDetailsProps {
  selectedVersion: NonNullable<Evaluation["versions"]>[number] | null;
  selectedReview: Evaluation | null;
  activeTab: "analysis" | "comments" | "thinking" | "selfCritique" | "logs";
  onTabChange: (tab: "analysis" | "comments" | "thinking" | "selfCritique" | "logs") => void;
  formatDate: (date: Date) => string;
  documentId: string;
  documentTitle: string;
}

export function VersionDetails({
  selectedVersion,
  selectedReview,
  activeTab,
  onTabChange,
  formatDate,
  documentId,
  documentTitle,
}: VersionDetailsProps) {
  if (!selectedVersion) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        Select a version to view details
      </div>
    );
  }
  
  // Prepare evaluation data for export button
  const evaluationData = selectedReview && selectedVersion ? {
    evaluation: {
      id: `eval-${selectedReview.agentId}`,
      evaluationId: `eval-${selectedReview.agentId}`,
      documentId: documentId,
      documentTitle: documentTitle,
      agentId: selectedReview.agentId,
      agentName: selectedReview.agent?.name || "",
      agentVersion: selectedReview.agent?.version || undefined,
      evaluationVersion: selectedVersion.version,
      grade: selectedVersion.grade,
      jobStatus: undefined, // Job status is not available in the version
      createdAt: selectedVersion.createdAt,
      summary: selectedVersion.summary,
      analysis: selectedVersion.analysis,
      selfCritique: selectedVersion.selfCritique,
      comments: selectedVersion.comments.map((comment, index) => ({
        id: `comment-${index}`,
        description: comment.description,
        importance: comment.importance || null,
        grade: comment.grade || null,
      })),
      job: selectedVersion.job ? {
        llmThinking: selectedVersion.job.llmThinking,
        priceInDollars: selectedVersion.job.priceInDollars,
        tasks: selectedVersion.job.tasks
      } : null,
      testBatchId: null,
      testBatchName: null
    }
  } : null;

  return (
    <div className="col-span-7 flex h-full w-full min-w-0 flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900">
              Evaluation Details
            </h3>
            <p className="text-sm text-gray-500">
              Document Version: {selectedVersion.documentVersion.version}
              {selectedVersion.version && (
                <> • Evaluation Version: {selectedVersion.version}</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {evaluationData && (
              <ExportEvaluationButton evaluationData={evaluationData} />
            )}
            <div className="text-right text-sm text-gray-500">
              <div>Created: {formatDate(selectedVersion.createdAt)}</div>
              {selectedVersion.job?.durationInSeconds && (
                <div>
                  Completed:{" "}
                  {formatDate(
                    new Date(
                      selectedVersion.createdAt.getTime() +
                        selectedVersion.job.durationInSeconds * 1000
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white px-4">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => onTabChange("analysis")}
            className={`inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === "analysis"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            <DocumentTextIcon className="mr-2 h-5 w-5" />
            Analysis
          </button>
          <button
            onClick={() => onTabChange("comments")}
            className={`inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === "comments"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            <ChatBubbleLeftIcon className="mr-2 h-5 w-5" />
            Comments
          </button>
          <button
            onClick={() => onTabChange("thinking")}
            className={`inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === "thinking"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            <LightBulbIcon className="mr-2 h-5 w-5" />
            Thinking
          </button>
          {selectedVersion.selfCritique && (
            <button
              onClick={() => onTabChange("selfCritique")}
              className={`inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === "selfCritique"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              <CheckCircleIcon className="mr-2 h-5 w-5" />
              Self-Critique
            </button>
          )}
          <button
            onClick={() => onTabChange("logs")}
            className={`inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === "logs"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            <ListBulletIcon className="mr-2 h-5 w-5" />
            Logs
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "logs" ? (
          <TaskLogs selectedVersion={selectedVersion} />
        ) : (
          <div className="bg-white rounded-lg p-4">
            <div className="mb-4">
              <Link
                href={`/docs/${documentId}/evals/${selectedReview?.agentId}`}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                View Full Evaluation Details →
              </Link>
            </div>
            <EvaluationContent
              summary={selectedVersion.summary}
              analysis={selectedVersion.analysis || ""}
              thinking={selectedVersion.job?.llmThinking}
              selfCritique={selectedVersion.selfCritique}
              comments={selectedVersion.comments.map((comment, index) => ({
                id: `comment-${index}`,
                description: comment.description,
                importance: comment.importance || null,
                grade: comment.grade || null,
                evaluationVersionId: `version-${index}`,
                highlightId: `highlight-${index}`,
                header: comment.header ?? null,
                level: comment.level ?? null,
                source: comment.source ?? null,
                metadata: comment.metadata ?? null,
                highlight: {
                  id: `highlight-${index}`,
                  startOffset: comment.highlight?.startOffset || 0,
                  endOffset: comment.highlight?.endOffset || 0,
                  quotedText: comment.highlight?.quotedText || "",
                  prefix: comment.highlight?.prefix || null,
                  error: null,
                  isValid: comment.highlight?.isValid || true
                }
              }))}
              agentName={selectedReview?.agent?.name || "Unknown Agent"}
              agentDescription={selectedReview?.agent?.description}
              grade={selectedVersion.grade}
              ephemeralBatch={null}
              priceInDollars={selectedVersion.job?.priceInDollars}
              durationInSeconds={selectedVersion.job?.durationInSeconds}
              createdAt={selectedVersion.createdAt}
              isStale={selectedVersion.isStale || false}
              showNavigation={false}
              compact={true}
              maxWidth="full"
            />
          </div>
        )}
      </div>
    </div>
  );
}
