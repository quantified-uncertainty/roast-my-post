import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import { GradeBadge } from "@/components/GradeBadge";
import { ExportEvaluationButton } from "@/components/ExportEvaluationButton";
import type { Evaluation } from "@/types/documentSchema";
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
        title: comment.title,
        description: comment.description,
        importance: comment.importance || null,
        grade: comment.grade || null,
      })),
      job: selectedVersion.job ? {
        llmThinking: selectedVersion.job.llmThinking,
        costInCents: selectedVersion.job.costInCents,
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
        {activeTab === "analysis" && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {selectedVersion.grade !== undefined && (
                <GradeBadge grade={selectedVersion.grade} />
              )}
              <div>
                <h4 className="font-medium text-gray-900">Summary</h4>
                <p className="text-sm text-gray-600">
                  {selectedVersion.summary}
                </p>
              </div>
            </div>
            {selectedVersion.analysis && (
              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white p-4">
                <div className="prose max-w-none break-words">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                  >
                    {selectedVersion.analysis}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "comments" && (
          <div className="space-y-4">
            {selectedVersion.comments.map((comment, index) => (
              <div
                key={index}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">{comment.title}</h4>
                </div>
                <div className="prose max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                  >
                    {comment.description}
                  </ReactMarkdown>
                </div>
                {comment.highlight && (
                  <>
                    <div className="mt-2 rounded bg-yellow-50 p-2 text-sm">
                      <div className="font-medium text-yellow-800">
                        Highlighted Text:
                      </div>
                      <div className="mt-1 text-yellow-700">
                        {comment.highlight.quotedText}
                      </div>
                    </div>
                    <div className="mt-1 flex gap-4 text-xs text-gray-500">
                      <span>Start: {comment.highlight.startOffset}</span>
                      <span>End: {comment.highlight.endOffset}</span>
                      {comment.highlight.prefix && (
                        <span>Prefix: {comment.highlight.prefix}</span>
                      )}
                      {comment.importance !== undefined && (
                        <span>Importance: {comment.importance}</span>
                      )}
                      {comment.grade !== undefined && (
                        <span>Grade: {comment.grade}</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "thinking" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                LLM Thinking Process
              </h2>
              <div className="prose max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                >
                  {selectedVersion.job?.llmThinking?.trim() ||
                    "_No thinking process available for this version._"}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {activeTab === "selfCritique" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                Self-Critique
              </h2>
              <div className="prose max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                >
                  {selectedVersion.selfCritique?.trim() ||
                    "_No self-critique available for this version._"}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {activeTab === "logs" && <TaskLogs selectedVersion={selectedVersion} />}
      </div>
    </div>
  );
}
